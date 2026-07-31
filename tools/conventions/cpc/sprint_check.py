#!/usr/bin/env python3
"""Checkpoint gate for a sprint contract (see CONVENTIONS.md section 10).

Reads the active docs/sprints/SPRINT-*.md, computes the change set over the branch, and runs:
  1. scope gate (hybrid)  : changed files must be in affects ∪ docs ∪ (the contract + its
                            snap/map targets); out-of-scope code -> ERROR, test/doc -> WARN
  2. contract gate        : snap/map entry with `when:` -> if a when-file changed,
                            the contract target must have changed too
  3. docs gate            : every `docs:` entry must appear in the change set
  4. uses read-set gate   : (ADR-003 tiers 1-3, pure path/set logic)
                            1. existence  : every `uses` path/glob resolves to >=1 file -> ERROR
                            2. budget     : resolved `uses` files/lines <= conventions.toml caps -> ERROR
                            3. uses⊇affects: a base-existing `affects` file absent from `uses`
                                            -> WARN (ERROR if [uses] superset_affects = "error")

stdlib only (py3.11+). Exit 1 on errors; warnings also fail under --strict.
"""
from __future__ import annotations
import argparse, fnmatch, re, subprocess, sys
from pathlib import Path

from cpc._config import load_config
from cpc.findings import Finding, RuleRegistry, from_tagged, to_json
from cpc.tokens import estimate_tokens

# Every finding this gate can emit, by its `[tag]` id (ADR-029) — see docs_check.RULES for why the
# registry is explicit rather than scraped. `tests/test_rule_inventory.py` keeps it honest.
RULES: RuleRegistry = {
    "scope":    "gate 1 — a changed file is not covered by `affects` ∪ `docs` ∪ contract targets",
    "contract": "gate 2 — a `when:` file changed but its snap/map target did not",
    "docs":     "gate 3 — a required `docs:` entry is absent from the change set",
    "uses":     "gate 4 — read-set staleness, budget overrun, or uses ⊉ affects (ADR-003 tiers 1-3)",
    "generate": "§13 net (ADR-013) — derived artifacts are stale; run `cpc-generate --write`",
    "base":     "gate 0 — the contract's `base:` names no real revision, so the scope gate and "
                "tier-3 both silently degrade (KI-4 / SPEC-base-resolution)",
}

# Defaults for the uses read-set gate; overridden by root/scripts/conventions.toml (or --config).
DEFAULTS = {
    "budgets": {"uses_max_files": 15, "uses_max_lines": 4000, "uses_max_tokens": 0},
    "uses": {"superset_affects": "warn"},
}
GLOB_CHARS = set("*?[]")

HEADER_STATUS = re.compile(r"status:\s*(active|superseded|archived)", re.I)
BASE_RE = re.compile(r"base:\**\s*`?([\w./-]+)`?", re.I)
# The metadata bullet ONLY, anchored at line start, first match wins. The old spelling searched every
# line containing "base:" and let the LAST one win, so a contract whose DoD or `## gaps` prose merely
# *mentioned* "base: main" silently redefined the base — which happened on this very sprint's
# contract, three lines after it correctly declared `base: master`. Prose must not be metadata.
BASE_LINE_RE = re.compile(r"^\s*(?:[-*]\s*)?\**base:\**\s*`?([\w./-]+)`?", re.I)
BULLET_RE = re.compile(r"^\s*[-*·]\s*(.+?)\s*$")
CODE_EXT = {".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".java", ".rb", ".c",
            ".cc", ".cpp", ".h", ".hpp", ".cs", ".kt", ".swift", ".sql"}

def sh(args: list[str], root: Path) -> str:
    return subprocess.run(args, cwd=root, capture_output=True, text=True).stdout.strip()

def _has_glob(s: str) -> bool:
    return any(c in GLOB_CHARS for c in s)

def _read(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""

def _line_count(p: Path) -> int:
    return len(_read(p).splitlines())

def resolve_uses(root: Path, entries: list[str]) -> tuple[set[Path], list[str]]:
    """Resolve `uses` entries to a deduped set of existing files + a list of entries that
    resolve to nothing (stale). Globs expand to files; a plain dir expands to the files under it."""
    files: set[Path] = set()
    missing: list[str] = []
    for raw in entries:
        e = strip_note(raw)
        if not e:
            continue
        if _has_glob(e):
            matched = [p for p in root.glob(e) if p.is_file()]
            if not matched:
                missing.append(e)
            files.update(matched)
        else:
            p = root / e
            if p.is_file():
                files.add(p)
            elif p.is_dir():
                files.update(f for f in p.rglob("*") if f.is_file())
            else:
                missing.append(e)
    return files, missing

def _git_out(args: list[str], root: Path) -> str:
    """`sh` that also survives git being absent from PATH. `sh` lets FileNotFoundError escape, which
    is fine for the existing callers (they run after the `.git` check) but not for the detection
    below, which is called from `sprint_start` in trees that may not be repos at all. Mirrors
    docs_check.git_last_commit_date: git is shelled, never imported, and every failure is silent."""
    try:
        r = subprocess.run(args, cwd=root, capture_output=True, text=True, check=False)
    except (OSError, ValueError):
        return ""
    return r.stdout.strip() if r.returncode == 0 else ""


def rev_exists(root: Path, rev: str) -> bool:
    """True when `rev` names a real commit. `^{commit}` narrows the question: bare `--verify` also
    accepts a raw object id that is not a committish, which would let a typo pass as a base."""
    return bool(_git_out(["git", "rev-parse", "--verify", "--quiet", f"{rev}^{{commit}}"], root))


def default_branch(root: Path) -> str:
    """This repo's default branch, best-effort (KI-4 / SPEC-base-resolution ledger row 2).

    `refs/remotes/origin/HEAD` is the authoritative answer when a remote exists — it is what made
    cpc's own `master` discoverable after every contract had been declaring `main` for six sprints.
    Then whichever of main/master actually resolves, then the checked-out branch, then the historical
    literal so the return value is never empty. Detected rather than hardcoded: pinning `master` here
    would ship a default wrong for every `main` repo, which is how KI-4 arose in the first place.
    """
    head = _git_out(["git", "symbolic-ref", "--short", "refs/remotes/origin/HEAD"], root)
    if head:
        return head.split("/", 1)[1] if "/" in head else head
    for cand in ("main", "master"):
        if rev_exists(root, cand):
            return cand
    cur = _git_out(["git", "rev-parse", "--abbrev-ref", "HEAD"], root)
    if cur and cur != "HEAD":
        return cur
    return "main"


def base_has(root: Path, base: str, rel: str) -> bool:
    """True if `rel` existed in the contract's base revision (so a tier-3 affects file is a
    pre-existing edit, not a file created this sprint). Fails closed when git can't answer."""
    r = subprocess.run(["git", "cat-file", "-e", f"{base}:{rel}"],
                       cwd=root, capture_output=True, text=True)
    return r.returncode == 0

def is_test(p: str) -> bool:
    n = Path(p).name
    return (n.startswith("test_") or n.endswith(("_test.py", ".test.ts", ".test.tsx", ".spec.ts"))
            or "/tests/" in f"/{p}" or "/test/" in f"/{p}")

def is_doc(p: str) -> bool:
    return p.endswith((".md", ".rst", ".txt")) or p.startswith("docs/") or "/.claude/" in f"/{p}"

def strip_note(s: str) -> str:
    return re.sub(r"\s*\(.*?\)\s*$", "", s).strip()

def find_active_contract(root: Path, explicit: Path | None) -> Path | None:
    if explicit:
        return explicit
    d = root / "docs" / "sprints"
    if not d.exists():
        return None
    active = []
    for f in sorted(d.glob("SPRINT-*.md")):
        low = f.name.lower()
        if "template" in low or "example" in low:
            continue
        head = "\n".join(f.read_text(encoding="utf-8", errors="ignore").splitlines()[:5])
        m = HEADER_STATUS.search(head)
        if m and m.group(1).lower() == "active":
            active.append(f)
    if len(active) > 1:
        raise SystemExit(f"ERROR multiple active sprint contracts: {[a.name for a in active]}")
    return active[0] if active else None

def parse_contract(path: Path):
    base = "main"
    base_found = False
    sec: dict[str, list[str]] = {"uses": [], "affects": [], "contracts": [], "docs": []}
    cur = None
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        if line.startswith("##"):
            name = line.lstrip("# ").strip().lower()
            cur = name if name in sec else None
            continue
        if line.strip().startswith("<!--"):
            continue
        if not base_found:
            bm = BASE_LINE_RE.match(line)
            if bm:
                base = bm.group(1)
                base_found = True
        m = BULLET_RE.match(line)
        if cur and m:
            sec[cur].append(m.group(1).strip())
    return base, sec

def parse_contracts(entries: list[str]) -> list[dict]:
    out = []
    for raw in entries:
        body = strip_note(raw)
        m = re.match(r"(test|snap|map)\s*:\s*(.+)", body)
        if not m:
            continue
        kind, rest = m.group(1), m.group(2)
        target, _, when = rest.partition("| when:")
        out.append({"kind": kind,
                    "target": target.strip().split("::")[0].split()[0],
                    "when": when.strip()})
    return out

def changed_files(root: Path, base: str) -> set[str]:
    mb = sh(["git", "merge-base", base, "HEAD"], root) or base
    files: set[str] = set()
    for cmd in (["git", "diff", "--name-only", mb, "HEAD"],
                ["git", "diff", "--name-only"],
                ["git", "diff", "--name-only", "--cached"]):
        files |= {x for x in sh(cmd, root).splitlines() if x.strip()}
    return files

def matches_any(path: str, patterns: list[str]) -> bool:
    for raw in patterns:
        pat = strip_note(raw)
        if pat and (path == pat or fnmatch.fnmatch(path, pat)
                    or path.startswith(pat.rstrip("/") + "/")):
            return True
    return False

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", type=Path)
    ap.add_argument("--contract", default=None, type=Path)
    ap.add_argument("--base", default=None)
    ap.add_argument("--config", default=None, type=Path)
    ap.add_argument("--strict", action="store_true")
    ap.add_argument("--format", choices=["text", "json"], default="text",
                    help="text (default, the stable human/CI form) or json. JSON is UNSTABLE and "
                         "cpc-internal (ADR-029): it feeds cpc's own corpus-snapshot harness and "
                         "carries no SemVer promise — do not build on it")
    args = ap.parse_args()
    root = args.root.resolve()
    cfg = load_config(root, args.config, DEFAULTS)
    errors: list[str] = []
    warns: list[str] = []

    # JSON mode must emit findings and nothing else, so the progress/INFO chatter is suppressed and
    # the early-exit diagnostics below degrade to an empty finding list. They are run-state notes
    # ("no contract", "not a repo"), not verdicts — inventing a rule id for them would put a
    # finding in the corpus goldens that no rule actually owns.
    json_mode = args.format == "json"

    def info(msg: str) -> None:
        if not json_mode:
            print(msg)

    def early(msg: str, code: int) -> int:
        print("[]" if json_mode else msg)
        return code

    contract = find_active_contract(root, args.contract)
    if contract is None:
        return early("sprint_check: no active sprint contract -> OK (nothing to gate)", 0)
    base, sec = parse_contract(contract)
    base = args.base or base
    contracts = parse_contracts(sec["contracts"])
    info(f"sprint_check: contract={contract.relative_to(root)}  base={base}")

    if not (root / ".git").exists():
        return early("WARN  not a git repo — cannot diff; skipping gates", 1 if args.strict else 0)

    # gate 0 — base resolution (KI-4). Must run BEFORE anything consumes `base`: an unresolvable base
    # does not fail loudly, it fails *invisibly*. `changed_files` falls back to the literal string, so
    # `git diff <that> HEAD` errors and contributes nothing, and `base_has` fails closed so every
    # affects file looks newly created and is exempted from tier 3. Both then report a clean pass.
    # WARN-not-ERROR mirrors the not-a-git-repo path directly above — same "the gate cannot do its
    # job" class — and keeps the six vendored consumers from hard-failing on re-vendor (ledger row 1).
    # Note ci/sprint-check.yml overrides --base with the PR target, which is why this stayed hidden:
    # it degrades local runs only, and local is exactly how cpc uses its gates (ADR-022).
    if not rev_exists(root, base):
        # Wording stays inside cp1252: a printed `⊇` (U+2287) raises UnicodeEncodeError on a stock
        # Windows console, and the test harnesses pin PYTHONIOENCODING=utf-8 so they would not catch
        # it. `—`/`·` are cp1252 and safe; set-theory glyphs are not. See test_findings_are_console_safe.
        warns.append(
            f"[base] contract base `{base}` resolves to no revision — the scope gate loses the "
            f"branch-history leg of its change set and the tier-3 `uses`-includes-`affects` check "
            f"cannot run, and BOTH then pass silently; this repo's default branch looks like "
            f"`{default_branch(root)}` (KI-4)")

    changed = changed_files(root, base)
    if not changed:
        info("WARN  empty change set over base — nothing to check")

    # the contract file and any snap/map target are implicitly in scope
    target_files = [c["target"] for c in contracts if c["kind"] in ("snap", "map")]
    in_scope = sec["affects"] + sec["docs"] + [contract.relative_to(root).as_posix()] + target_files

    # 1. scope gate (hybrid)
    for f in sorted(changed):
        if matches_any(f, in_scope):
            continue
        if is_doc(f) or is_test(f):
            warns.append(f"[scope] out-of-scope (test/doc): {f}")
        elif Path(f).suffix in CODE_EXT:
            errors.append(f"[scope] out-of-scope CODE not in `affects`: {f}")
        else:
            warns.append(f"[scope] out-of-scope (other): {f}")

    # 2. contract gate
    for c in contracts:
        if c["kind"] == "test":
            info(f"INFO  contract test (run in verify loop): {c['target']}")
            continue
        if not c["when"]:
            continue
        if any(fnmatch.fnmatch(f, c["when"]) for f in changed) and c["target"] not in changed:
            errors.append(f"[contract] `{c['when']}` changed but {c['kind']} target "
                          f"not updated: {c['target']}")

    # 3. docs gate
    for raw in sec["docs"]:
        d = strip_note(raw)
        if d and not matches_any(d, list(changed)):
            errors.append(f"[docs] required doc not updated in this change: {d}")

    # 4. uses read-set gate (ADR-003 tiers 1-3, pure path/set logic)
    resolved, missing = resolve_uses(root, sec["uses"])
    #   tier 1 — existence: a `uses` entry resolving to nothing is a stale read-set
    for m in sorted(missing):
        errors.append(f"[uses] read-set entry resolves to no file (stale?): {m}")
    #   tier 2 — budget: bound per-task context (files + lines), globs already expanded/deduped
    n_files = len(resolved)
    n_lines = sum(_line_count(p) for p in resolved)
    max_files = cfg["budgets"].get("uses_max_files", DEFAULTS["budgets"]["uses_max_files"])
    max_lines = cfg["budgets"].get("uses_max_lines", DEFAULTS["budgets"]["uses_max_lines"])
    if sec["uses"]:
        info(f"INFO  read-set: {n_files} file(s), {n_lines} line(s) "
             f"(budget {max_files}/{max_lines})")
    if n_files > max_files:
        errors.append(f"[uses] read-set {n_files} files > budget {max_files} (uses_max_files)")
    if n_lines > max_lines:
        errors.append(f"[uses] read-set {n_lines} lines > budget {max_lines} (uses_max_lines)")
    #   tier 2 (tokens): opt-in ceiling alongside the line budget (cpc.tokens, chars/4). 0 =
    #   disabled, so output is unchanged for any consumer that has not set uses_max_tokens.
    max_tokens = int(cfg["budgets"].get("uses_max_tokens", 0) or 0)
    if max_tokens > 0:
        n_tokens = sum(estimate_tokens(_read(p)) for p in resolved)
        if sec["uses"]:
            info(f"INFO  read-set ~{n_tokens} token(s) (budget {max_tokens})")
        if n_tokens > max_tokens:
            errors.append(f"[uses] read-set ~{n_tokens} tokens > budget {max_tokens} (uses_max_tokens)")
    #   tier 3 — uses ⊇ affects: you must read what you change. Files created this sprint
    #   (absent from `base`) are exempt — you can't read what doesn't exist yet (and tier 1
    #   forbids listing a nonexistent path in `uses`).
    mode = str(cfg["uses"].get("superset_affects", "warn")).lower()
    uses_patterns = [strip_note(u) for u in sec["uses"] if strip_note(u)]
    for raw in sec["affects"]:
        a = strip_note(raw)
        if not a:
            continue
        targets = ([p for p in root.glob(a) if p.is_file()] if _has_glob(a)
                   else ([root / a] if (root / a).exists() else []))
        for f in targets:
            rel = f.relative_to(root).as_posix()
            if not base_has(root, base, rel):       # created this sprint -> exempt
                continue
            if matches_any(rel, uses_patterns):
                continue
            msg = f"[uses] affects file modified but not in read-set `uses`: {rel}"
            (errors if mode == "error" else warns).append(msg)

    # §13 net (ADR-013): derived artifacts must be regenerated before push. Cheap because
    # this gate is pre-push only, and each generator's `check` is a fingerprint-compare. The
    # runner no-ops when the project has no [generate] section, so this is free for projects
    # that register nothing. Discipline (cpc-generate --write at session end) is the primary
    # path; this only catches the time you forget.
    if (root / "scripts" / "conventions.toml").exists():
        # capture_output in JSON mode only: the child prints its own status line to stdout, which
        # would otherwise land in the middle of the JSON document.
        rc = subprocess.run([sys.executable, "-m", "cpc.generate", "--check",
                             "--root", str(root)], capture_output=json_mode).returncode
        if rc != 0:
            errors.append("[generate] derived artifacts stale — run `cpc-generate --write` "
                          "and review the diff")

    # Text stays byte-identical; JSON prints findings only (see docs_check for the rationale).
    fail = bool(errors) or (args.strict and bool(warns))
    if json_mode:
        fds = ([from_tagged("error", e) for e in errors]
               + [from_tagged("warn", w) for w in warns])
        fds.sort(key=Finding.total_key)
        print(to_json(fds))
    else:
        for w in warns:
            print(f"WARN  {w}")
        for e in errors:
            print(f"ERROR {e}")
        print(f"\nsprint_check: {len(errors)} error(s), {len(warns)} warning(s) -> "
              f"{'FAIL' if fail else 'OK'}")
    return 1 if fail else 0

if __name__ == "__main__":
    raise SystemExit(main())
