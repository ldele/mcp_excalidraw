#!/usr/bin/env python3
"""Deterministic documentation-convention gate.

Checks (see claude-project-conventions/CONVENTIONS.md):
  1. status header present on docs/**.md and .claude/**.md — embedded trees are skipped
     (`.venv`/`node_modules`/`.git` dirs, and any nested git checkout: a dir carrying its own
     `.git`, e.g. Claude Code's background-task worktrees under `.claude/worktrees/`)
  2. entry-context budget: root CLAUDE.md + .claude/CONTEXT.md <= entry_max_lines
  3. module CLAUDE.md budget: each <module>/CLAUDE.md <= module_claude_max_lines
  4. broken routes: a path in `backticks` inside any CLAUDE.md / .claude/*.md must exist
     (a `docs/X` reference resolves to `docs/archive/X` too, so archiving never breaks history)
  5. stale disposable: PLAN_*/REVIEW_* still 'active' older than disposable_days
  6. archive hygiene: docs/archive/** must be status superseded|archived
  7. unarchived disposable: a 'disposable' doc marked superseded/archived must live under docs/archive/
  9. stub-stays-stub (opt-in, ADR-014): with [entry] enforce_stub on, root CLAUDE.md must be a
     bare `@AGENTS.md` import — fails if it holds anything else; silent off or when CLAUDE.md absent
  10. prior-art (opt-in, ADR-016): [plan] require_prior_art on -> docs/PLAN.md must carry a
     non-empty `## Prior art` section; silent when off or when PLAN.md is absent
  11. baton (ADR-018): .claude/SESSION.md — 11a dated `## ` entries must be non-increasing
     top-to-bottom (ERROR, always on — the file's own "newest on top" invariant); 11b entry count
     over [budgets] session_max_entries -> rotate (WARN; cap 0 = off)
  12. living-doc bump (ADR-018): a class:living doc under docs/ or .claude/ whose LAST GIT COMMIT
     is newer than its `updated:` header was edited without bumping the date (WARN); default on
     ([staleness] living_bump), skips exempt paths + degrades to a silent skip outside git
  13. devlog (ADR-023): docs/DEVLOG.md — 13a dated `## ` entries must be non-increasing
     top-to-bottom (ERROR, always on — the file's own "newest first" invariant); 13b entry count
     over [budgets] devlog_max_entries -> rotate to docs/archive/DEVLOG-archive-NNN.md
     (WARN; cap 0 = off). Same mechanism as the rule-11 baton.
  14. resolved known issue still live (ADR-023): a `## ` heading in .claude/KNOWN_ISSUES.md
     marked RESOLVED with a date older than [staleness] resolved_ki_days -> summarize it into
     the file's Resolved index and move the full entry to docs/archive/KNOWN_ISSUES-archive-NNN.md
     (WARN; 0 = off). An undated RESOLVED heading warns too — it can never age out.
  15. spec ledger (opt-in, ADR-027): [sprint] require_spec_ledger on -> an active sprint contract
     carrying the `- **started:**` stamp (ADR-019) must name >=1 docs/specs/SPEC-*.md, and every
     named SPEC must hold a `## Open questions` ledger with >=1 row and no row still `open`
     (ERROR). The scoped grill (grill-me, keypoint sprint-start) fills the ledger; this gate
     only checks the interrogation happened — resolution quality is sprint-review's judgment.
     15c (same toggle, SPEC-keypoint-stamp): the started contract must also carry the
     `- **keypoint:** sprint-start <ts>` stamp a green `cpc-keypoint sprint-start` floor writes
     (ERROR) — so a skipped activation ritual is visible. --pre-stamp skips 15c only: the
     keypoint's own floor runs before the stamp it is about to write can exist.

The canonical entry file is AGENTS.md (ADR-014) with CLAUDE.md a one-line `@AGENTS.md` stub; the
entry-budget, route, and glossary checks read whichever the project carries (AGENTS.md if present).

stdlib only (Python 3.11+). Exit 1 on errors; warnings fail too under --strict.
"""
from __future__ import annotations
import argparse, datetime as dt, re, subprocess, sys
from pathlib import Path

from cpc._config import load_config
from cpc.findings import Finding, RuleRegistry, from_tagged, to_json
from cpc.tokens import estimate_tokens

HEADER_RE = re.compile(r"status:\s*(active|superseded|archived)", re.I)
CLASS_RE = re.compile(r"class:\s*(append-only|living|disposable)", re.I)
UPDATED_RE = re.compile(r"updated:\s*(\d{4}-\d{2}-\d{2})", re.I)
BACKTICK_RE = re.compile(r"`([^`]+)`")
DATE_IN_NAME_RE = re.compile(r"(\d{4}-\d{2}-\d{2})")
SESSION_ENTRY_RE = re.compile(r"^##\s+(\d{4}-\d{2}-\d{2})\b")  # rules 11/13: a dated `## ` log entry
RESOLVED_DATE_RE = re.compile(r"RESOLVED\D{0,3}(\d{4}-\d{2}-\d{2})")  # rule 14: (RESOLVED date) / [RESOLVED date]
PATHISH_RE = re.compile(r"^[\w.\-/]+$")
LINK_RE = re.compile(r"\]\(([^)]+)\)")               # rule 4b: markdown [text](target)
ADR_CITE_RE = re.compile(r"\bADR-(\d{3,})\b(?!-)")   # rule 4c: bare ADR-NNN, not the ADR-NNN-slug form
SPEC_REF_RE = re.compile(r"docs/specs/SPEC-[\w.\-]+\.md")  # rule 15: SPEC paths a contract names
STARTED_LINE_RE = re.compile(r"^- \*\*started:\*\*", re.M)  # rule 15: the activation stamp (ADR-019)
KEYPOINT_STAMP_RE = re.compile(r"^- \*\*keypoint:\*\* sprint-start\b", re.M)  # rule 15c: ritual ran green

DEFAULTS = {
    # module_claude_max_lines: 80 as of ADR-024 (was 40) — the fleet's module CLAUDE.md files kept
    # hitting the cap for legitimate content (BlackBox); raising per-project was the norm, so the
    # default moved to where projects actually landed. Tune per project, never silently.
    "budgets": {"entry_max_lines": 600, "module_claude_max_lines": 80, "entry_max_tokens": 0,
                # session_max_entries (rule 11b, ADR-018) / devlog_max_entries (rule 13b, ADR-023):
                # entry-count caps. 0 = off, the token-cap precedent — no silent behaviour change
                # for existing consumers; cpc and the laid template set 10 / 20.
                "session_max_entries": 0, "devlog_max_entries": 0},
    # living_bump (rule 12, ADR-018): "warn" (default on, fails under --strict) or "off". It enforces
    # §2's declared "edit in place, bump the date" rule for class:living docs, so it ships on like the
    # universal-invariant checks (rule 1/4b); a repo that manages living dates by hand opts out.
    # resolved_ki_days (rule 14, ADR-023): age a RESOLVED known issue may sit in the live file before
    # the gate asks for index+archive. 0 = off (the cap precedent); cpc and the laid template set 30.
    "staleness": {"disposable_days": 90, "living_bump": "warn", "resolved_ki_days": 0},
    "headers": {"exempt": ["docs/specs/**", "**/*.json"]},
    # check_md_links: markdown [text](target) link existence (rule 4b) — default on, same existence
    # check as the backtick route gate. check_adr_refs: bare `ADR-NNN` citation existence (rule 4c)
    # — default OFF: a repo that cites another repo's ADRs (cpc cites claude-skills') would false-
    # positive, so it is opt-in. See docs/specs/SPEC-reference-validator.md.
    "routes": {"extensions": [".md"], "check_md_links": True, "check_adr_refs": False},
    # enforce_stub: opt-in stub-stays-stub rule (ADR-014, rule 9) — default OFF, like every
    # not-universal gate (glossary, dod-lint). A project that stays CLAUDE.md-canonical leaves it off.
    "entry": {"enforce_stub": False},
    "plan": {"require_prior_art": False},
    # require_spec_ledger (rule 15, ADR-027): opt-in in code like every not-universal gate, but
    # vacuous until a contract carries the started: stamp — so the laid template ships it ON.
    "sprint": {"require_spec_ledger": False},
}

# Every finding this gate can emit, by its `[tag]` id (ADR-029). Explicit, not scraped: a grep for
# bracketed lowercase tokens over this file also returns `[0]`, `[1]`, `[str]`, `[text]`. Adding a
# finding means adding its id here — `tests/test_rule_inventory.py` fails when a registered id is
# fired by no corpus tree (or by every tree), so the registry cannot rot into a stale catalogue.
RULES: RuleRegistry = {
    "header":      "rule 1 — a docs/**.md or .claude/**.md file carries no `status:` header",
    "budget":      "rules 2/3 — entry-context or module CLAUDE.md over its line/token budget",
    "entry":       "rule 9 — root CLAUDE.md holds more than the bare `@AGENTS.md` import",
    "route":       "rule 4 — a `backtick/path.md` route in an entry/.claude doc does not resolve",
    "link":        "rule 4b — a markdown [text](target) link resolves neither way",
    "citation":    "rule 4c — a bare `ADR-NNN` citation has no local docs/decisions file",
    "stale":       "rule 5 — an active PLAN_/REVIEW_ disposable is past disposable_days",
    "archive":     "rule 6 — a file under docs/archive/ is still status=active",
    "lifecycle":   "rule 7 — a superseded/archived disposable still sits outside docs/archive/",
    "glossary":    "rule 8 — a filled GLOSSARY.md is not referenced from the entry file",
    "plan":        "rule 10 — docs/PLAN.md lacks a non-empty `## Prior art` section",
    "spec":        "rules 15/15c — spec-ledger or keypoint-stamp floor unmet on a started contract",
    "baton":       "rule 11 — .claude/SESSION.md entry order or rotation cap",
    "devlog":      "rule 13 — docs/DEVLOG.md entry order or rotation cap",
    "known-issue": "rule 14 — a RESOLVED known issue is past its grace window",
    "living":      "rule 12 — a class:living doc was committed without bumping `updated:`",
}


def header_of(p: Path) -> tuple[str | None, str | None]:
    """Return (status, updated_date) from the file's first lines."""
    try:
        head = "\n".join(p.read_text(encoding="utf-8", errors="ignore").splitlines()[:5])
    except OSError:
        return None, None
    s = HEADER_RE.search(head)
    u = UPDATED_RE.search(head)
    return (s.group(1).lower() if s else None), (u.group(1) if u else None)

def lines(p: Path) -> int:
    return len(p.read_text(encoding="utf-8", errors="ignore").splitlines()) if p.exists() else 0

def text_of(p: Path) -> str:
    return p.read_text(encoding="utf-8", errors="ignore") if p.exists() else ""

def is_exempt(rel: str, patterns: list[str]) -> bool:
    return any(Path(rel).match(pat) for pat in patterns)

_EMBEDDED_PARTS = {".venv", "node_modules", ".git"}

def in_embedded_tree(root: Path, p: Path) -> bool:
    """True when `p` (under `root`) sits inside a tree this repo does not govern: a
    `.venv`/`node_modules`/`.git` directory, or an **embedded git checkout** — any directory below
    root carrying its own `.git` (a `.git` FILE marks a linked worktree or submodule, e.g. Claude
    Code's background-task worktrees under `.claude/worktrees/<name>/`; a `.git` dir marks a nested
    clone). Such trees carry their own doc copies — and whole virtualenvs — so scanning them yields
    phantom findings on files the project does not own (doc_assistant KI-16: ~70 bogus rule-1
    errors while a background task's worktree was alive). This skip must be structural, not a
    `[headers] exempt` glob: `is_exempt` matches via `Path.match()`, which is right-anchored and
    cannot left-anchor a recursive `dir/**` pattern."""
    if any(part in _EMBEDDED_PARTS for part in p.relative_to(root).parts):
        return True
    d = p.parent
    while d != root:
        if (d / ".git").exists():
            return True
        d = d.parent
    return False

def section_nonempty(text: str, title: str) -> bool:
    """True if a `## <title>` heading exists and has at least one non-blank, non-comment content
    line before the next `##`/`#` heading. Presence + non-empty only — whether a `<placeholder>`
    was actually filled is design-conformance's / deep-review's judgment call, not this gate's."""
    hdr = re.compile(rf"^##\s+{re.escape(title)}\s*$", re.I)
    started = False
    for ln in text.splitlines():
        srt = ln.strip()
        if not started:
            if hdr.match(srt):
                started = True
            continue
        if re.match(r"^#{1,2}\s", srt):   # next h1/h2 ends the section
            break
        if not srt or srt.startswith("<!--"):
            continue
        return True
    return False

def ledger_rows(text: str) -> list[tuple[str, str]] | None:
    """Rule 15: parse a SPEC's `## Open questions` table. None = no such section; else one
    (question, status) tuple per data row. The header row ('Question') and `---` separator are
    skipped; non-table lines (the familiarity bullet, comments) are ignored. Row *quality* — did
    a low-familiarity resolution cite a source — is judgment (sprint-review's), never parsed."""
    hdr = re.compile(r"^##\s+Open questions\s*$", re.I)
    rows: list[tuple[str, str]] = []
    started = False
    for ln in text.splitlines():
        srt = ln.strip()
        if not started:
            if hdr.match(srt):
                started = True
            continue
        if re.match(r"^#{1,2}\s", srt):   # next h1/h2 ends the section
            break
        if not srt.startswith("|"):
            continue
        cells = [c.strip() for c in srt.strip("|").split("|")]
        if len(cells) < 3 or cells[1].lower() == "question":
            continue
        if all(set(c) <= set("-: ") for c in cells):
            continue                       # the |---|---| separator row
        rows.append((cells[1], cells[2].lower()))
    return rows if started else None

def entry_file(root: Path) -> Path:
    """The canonical entry file: AGENTS.md (ADR-014) if present, else CLAUDE.md. In an
    AGENTS-canonical project CLAUDE.md is just the `@AGENTS.md` stub, so the content (and its routes,
    budget, glossary link) lives in AGENTS.md; a project that stayed CLAUDE.md-canonical falls back."""
    agents = root / "AGENTS.md"
    return agents if agents.exists() else root / "CLAUDE.md"

def route_exists(root: Path, tok: str) -> bool:
    """A route/link target resolves if it exists, or if a `docs/X` ref resolves to `docs/archive/X`
    (so archiving a doc never breaks an append-only citation). Shared by rules 4 and 4b."""
    if (root / tok).exists():
        return True
    if tok.startswith("docs/"):
        return (root / tok.replace("docs/", "docs/archive/", 1)).exists()
    return False

def check_dated_log(path: Path, rel: str, tag: str, cap: int, archive_stem: str, rule: str,
                    errors: list[str], warns: list[str]) -> None:
    """Shared body of rules 11 (baton, ADR-018) and 13 (devlog, ADR-023): an append-only,
    newest-first log of dated `## YYYY-MM-DD` entries. Ordering is the file's own declared
    invariant (ERROR, always on); the entry-count cap is the rotation budget (WARN, 0 = off).
    Rotation stays on-call — the gate flags, a human moves entries verbatim to the archive."""
    prev: str | None = None
    count = 0
    for ln in text_of(path).splitlines():
        m = SESSION_ENTRY_RE.match(ln)
        if not m:
            continue
        d = m.group(1)
        count += 1
        if prev is not None and d > prev:   # a newer date below an older one = out of order
            errors.append(f"[{tag}] {rel} entry {d} is newer than the entry above "
                          f"it ({prev}) — newest entry must be on top (rule {rule}a)")
        prev = d
    if cap > 0 and count > cap:
        warns.append(f"[{tag}] {rel} has {count} entries > {cap} — rotate: move "
                     f"entries {cap + 1}+ to docs/archive/{archive_stem}-archive-NNN.md "
                     f"(rule {rule}b)")


def git_last_commit_date(root: Path, rel: str) -> str | None:
    """Author date (YYYY-MM-DD) of the file's last commit, or None if git can't answer — no git on
    PATH, not a repo, or the file has no commit yet. Rule 12 uses this; any failure => silent skip,
    so the stdlib-only / offline invariant holds (git is shelled, never imported). `sprint_check`
    set the git-subprocess precedent (ADR-018). ISO dates compare correctly as strings."""
    try:
        r = subprocess.run(["git", "-C", str(root), "log", "-1", "--format=%as", "--", rel],
                           capture_output=True, text=True, check=False)
    except (OSError, ValueError):
        return None
    if r.returncode != 0:
        return None
    return r.stdout.strip() or None

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", type=Path)
    ap.add_argument("--config", default=None, type=Path)
    ap.add_argument("--strict", action="store_true", help="warnings also fail the run")
    ap.add_argument("--pre-stamp", action="store_true",
                    help="skip rule 15c only (used by cpc-keypoint sprint-start, whose floor "
                         "runs before the stamp it writes on green can exist)")
    ap.add_argument("--format", choices=["text", "json"], default="text",
                    help="text (default, the stable human/CI form) or json. JSON is UNSTABLE and "
                         "cpc-internal (ADR-029): it feeds cpc's own corpus-snapshot harness and "
                         "carries no SemVer promise — do not build on it")
    args = ap.parse_args()
    root: Path = args.root.resolve()
    cfg = load_config(root, args.config, DEFAULTS)
    errors: list[str] = []
    warns: list[str] = []

    docs = root / "docs"
    claude = root / ".claude"

    # 1. status headers. The embedded-tree filter here also covers rules 7 and 12, which reuse
    #    md_files — one scan surface, one exclusion (doc_assistant KI-16).
    exempt = cfg["headers"]["exempt"]
    md_files = list(docs.rglob("*.md")) if docs.exists() else []
    md_files += list(claude.rglob("*.md")) if claude.exists() else []
    md_files = [f for f in md_files if not in_embedded_tree(root, f)]
    for f in md_files:
        rel = f.relative_to(root).as_posix()
        if is_exempt(rel, exempt):
            continue
        status, _ = header_of(f)
        if status is None:
            errors.append(f"[header] missing `status:` header: {rel}")

    # 2. entry budget (lines, plus an opt-in token ceiling — cpc.tokens, chars/4 heuristic).
    #    The entry file is AGENTS.md (ADR-014) when present, else CLAUDE.md (CLAUDE-canonical repos).
    ef = entry_file(root)
    ename = ef.name
    entry = lines(ef) + lines(claude / "CONTEXT.md")
    cap = cfg["budgets"]["entry_max_lines"]
    if entry > cap:
        errors.append(f"[budget] entry context {entry} lines > {cap} "
                      f"(root {ename} + .claude/CONTEXT.md)")
    tok_cap = int(cfg["budgets"].get("entry_max_tokens", 0) or 0)   # 0 = disabled (lines-only)
    if tok_cap > 0:
        entry_tokens = estimate_tokens(text_of(ef) + text_of(claude / "CONTEXT.md"))
        if entry_tokens > tok_cap:
            errors.append(f"[budget] entry context {entry} lines / ~{entry_tokens} tokens "
                          f"> token cap {tok_cap} (root {ename} + .claude/CONTEXT.md)")

    # 9. stub-stays-stub (ADR-014, opt-in [entry] enforce_stub). When AGENTS.md is canonical, root
    #    CLAUDE.md must be a bare `@AGENTS.md` import so the two files cannot drift. Fails if CLAUDE.md
    #    carries anything beyond the import; silent when the toggle is off or CLAUDE.md is absent (a
    #    project that stayed CLAUDE.md-canonical simply leaves the toggle off). Converts the discipline
    #    "don't re-add content to the stub" into a gate (ADR-007 honesty rule).
    if cfg["entry"].get("enforce_stub", False):
        claude_md = root / "CLAUDE.md"
        if claude_md.exists():
            body = [ln.strip() for ln in text_of(claude_md).splitlines() if ln.strip()]
            if body != ["@AGENTS.md"]:
                errors.append("[entry] CLAUDE.md must be a bare `@AGENTS.md` import stub "
                              "([entry] enforce_stub, ADR-014) — entry content belongs in AGENTS.md")

    # 3. module CLAUDE.md budget
    mcap = cfg["budgets"]["module_claude_max_lines"]
    for f in root.rglob("CLAUDE.md"):
        rel = f.relative_to(root).as_posix()
        if rel == "CLAUDE.md" or "/.claude/" in f"/{rel}":
            continue
        if in_embedded_tree(root, f):
            continue
        n = lines(f)
        if n > mcap:
            warns.append(f"[budget] module file {rel} is {n} lines > {mcap}")

    # 4. broken routes
    exts = tuple(cfg["routes"]["extensions"])
    route_sources = [p for p in root.rglob("CLAUDE.md") if not in_embedded_tree(root, p)]
    route_sources += list(claude.glob("*.md")) if claude.exists() else []
    agents_entry = root / "AGENTS.md"        # ADR-014: the entry file's routes/links move here from
    if agents_entry.exists():                # the (now-stub) CLAUDE.md — keep them under the route gate
        route_sources.append(agents_entry)
    check_links = cfg["routes"].get("check_md_links", True)
    seen: set[tuple[str, str]] = set()
    for src in route_sources:
        text = src.read_text(encoding="utf-8", errors="ignore")
        rel_src = src.relative_to(root).as_posix()
        # 4. backtick path routes: `docs/x.md` must resolve (archive-redirect aware). The redirect
        #    lets append-only history (SESSION/DEVLOG) cite a doc later archived without breaking.
        for tok in BACKTICK_RE.findall(text):
            tok = tok.strip()
            if "<" in tok or ">" in tok or " " in tok or tok.startswith("http"):
                continue
            if not PATHISH_RE.match(tok) or "/" not in tok:
                continue
            if not (tok.endswith(exts) or tok.endswith("/CLAUDE.md")):
                continue
            if tok.startswith("/"):  # API routes like /api/v1/, not files
                continue
            key = (rel_src, tok)
            if key in seen:
                continue
            seen.add(key)
            if not route_exists(root, tok):
                errors.append(f"[route] {rel_src} -> missing `{tok}`")
        # 4b. markdown [text](target) link existence (SPEC-reference-validator) — opt-out via
        #     [routes] check_md_links. Skips externals, #anchors, ?queries, absolute app routes
        #     (`/api/v1`, same as the backtick gate above), and <placeholders>. A link resolves if
        #     its target exists repo-root-relative (archive-redirect aware, like the backtick gate)
        #     OR relative to the source file's own directory (the natural form for a module CLAUDE.md
        #     linking a sibling) — so it only fires on a target that exists neither way.
        if check_links:
            for tgt in LINK_RE.findall(text):
                tgt = tgt.strip()
                if not tgt or tgt[0] in "#?/" or tgt.startswith(("http", "mailto:")) \
                        or "<" in tgt or ">" in tgt:
                    continue
                tgt = tgt.split()[0].split("#", 1)[0]   # drop a `"title"` and any in-page #anchor
                if not tgt or tgt.startswith("/"):
                    continue
                key = (rel_src, "link:" + tgt)
                if key in seen:
                    continue
                seen.add(key)
                if not (route_exists(root, tgt) or (src.parent / tgt).exists()):
                    errors.append(f"[link] {rel_src} -> missing ({tgt})")

    # 4c. ADR citation existence (SPEC-reference-validator) — a bare `ADR-NNN` prose ref must
    #     resolve to a local docs/decisions/ADR-NNN-*.md. OPT-IN ([routes] check_adr_refs): a repo
    #     that cites another repo's ADRs (cpc cites claude-skills') would false-positive, so off by
    #     default. WARN, promoted to failure under --strict (same as the other warn-level checks).
    #     Scope = route_sources + docs/**/*.md. The ADR-NNN-slug filename form is skipped (regex), so
    #     `ADR-000-template.md` and a `[..](docs/decisions/ADR-008-...md)` target never trip it.
    if cfg["routes"].get("check_adr_refs", False):
        local_adrs: set[str] = set()
        for d in (docs / "decisions", docs / "archive"):
            if d.exists():
                for f in d.rglob("ADR-*.md"):
                    m = re.match(r"ADR-(\d{3,})", f.name)
                    if m:
                        local_adrs.add(m.group(1))
        cite_sources = list(route_sources) + (list(docs.rglob("*.md")) if docs.exists() else [])
        seen_cite: set[tuple[str, str]] = set()
        for src in cite_sources:
            rel_src = src.relative_to(root).as_posix()
            for num in ADR_CITE_RE.findall(src.read_text(encoding="utf-8", errors="ignore")):
                if num in local_adrs or (rel_src, num) in seen_cite:
                    continue
                seen_cite.add((rel_src, num))
                warns.append(f"[citation] {rel_src} -> ADR-{num} not found")

    # 5. stale disposable
    days = cfg["staleness"]["disposable_days"]
    today = dt.date.today()
    if docs.exists():
        for f in docs.rglob("*.md"):
            name = f.name
            if not (name.startswith("PLAN_") or name.startswith("REVIEW_")):
                continue
            rel = f.relative_to(root).as_posix()
            if "/archive/" in f"/{rel}":
                continue
            status, updated = header_of(f)
            if status != "active":
                continue
            datestr = updated
            if not datestr:
                m = DATE_IN_NAME_RE.search(name)
                datestr = m.group(1) if m else None
            if not datestr:
                warns.append(f"[stale] {rel} is active but has no date to age it")
                continue
            try:
                age = (today - dt.date.fromisoformat(datestr)).days
            except ValueError:
                continue
            if age > days:
                warns.append(f"[stale] {rel} active and {age}d old (> {days}); archive it?")

    # 6. archive hygiene
    arch = docs / "archive"
    if arch.exists():
        for f in arch.rglob("*.md"):
            rel = f.relative_to(root).as_posix()
            status, _ = header_of(f)
            if status == "active":
                errors.append(f"[archive] {rel} is in archive/ but status=active")

    # 7. unarchived disposable: a superseded/archived disposable must be relocated to docs/archive/.
    #    Completes the lifecycle — check 5 flags the forgotten *supersede*; this flags the forgotten
    #    *move*. Scoped to class:disposable so append-only ADRs (superseded in place) are never flagged.
    for f in md_files:
        rel = f.relative_to(root).as_posix()
        if "/archive/" in f"/{rel}" or is_exempt(rel, exempt):
            continue
        head = "\n".join(f.read_text(encoding="utf-8", errors="ignore").splitlines()[:5])
        cm = CLASS_RE.search(head)
        sm = HEADER_RE.search(head)
        if cm and sm and cm.group(1).lower() == "disposable" and sm.group(1).lower() in {"superseded", "archived"}:
            warns.append(f"[lifecycle] disposable {rel} is {sm.group(1).lower()} but not under "
                         f"docs/archive/ — move it (git mv {rel} docs/archive/)")

    # 8. glossary advisory (ADR-010): if a GLOSSARY.md exists, it must be non-stub and referenced
    #    from CLAUDE.md. Advisory only (warns) — the forbidden-synonym *scan* is cpc-glossary's job,
    #    not this layout gate. (Coupling: imports the glossary parser for the non-stub check.)
    glossary = root / "GLOSSARY.md"
    if not glossary.exists():
        glossary = claude / "GLOSSARY.md"
    if glossary.exists():
        try:
            from cpc.glossary_check import parse_glossary
            filled = parse_glossary(glossary.read_text(encoding="utf-8"))
        except Exception:
            filled = []
        # An all-stub GLOSSARY.md is the freshly-laid template (cpc-init lays one in `standard`) —
        # the project has not started using it yet, so stay silent. The advisory only fires once at
        # least one real term exists but the file is not wired into CLAUDE.md.
        if filled:
            grel = glossary.relative_to(root).as_posix()
            ef = entry_file(root)            # AGENTS.md (ADR-014) or the CLAUDE-canonical fallback
            if ef.exists():
                if "GLOSSARY.md" not in text_of(ef):
                    warns.append(f"[glossary] {grel} has filled entries but is not referenced from "
                                 f"{ef.name} — link it so the agent reads it before naming things")

    # 10. prior-art section in PLAN.md (opt-in [plan] require_prior_art, ADR-016). When on and
    #     docs/PLAN.md exists, it must carry a non-empty `## Prior art` block — the atlas /
    #     internal-reuse / external record iterative-planning writes at scope-lock. Silent when the
    #     toggle is off or PLAN.md is absent (a project not using the iterative-planning PLAN leaves
    #     it off). Presence + non-empty only; filled-vs-placeholder is design-conformance's call.
    if cfg["plan"].get("require_prior_art", False):
        plan = docs / "PLAN.md"
        if plan.exists() and not section_nonempty(text_of(plan), "Prior art"):
            errors.append("[plan] docs/PLAN.md missing a non-empty `## Prior art` section "
                          "([plan] require_prior_art) — record the atlas / internal-reuse / "
                          "external checks (iterative-planning \u00a72.5)")

    # 15. spec ledger (opt-in [sprint] require_spec_ledger, ADR-027). Specificity decays late in
    #     a project — tasks arrive as one-liners against stale artifacts — so activation gains a
    #     floor: a STARTED active contract (ADR-019 stamp; roadmap_sync-materialized backlog rows
    #     are exempt) must name its executor brief(s), and each named SPEC's `## Open questions`
    #     ledger must be fully resolved-or-parked. The scoped grill (grill-me, keypoint
    #     sprint-start) fills the ledger; per ADR-007 this gate only checks the interrogation
    #     HAPPENED — resolution quality stays sprint-review's judgment.
    if cfg["sprint"].get("require_spec_ledger", False):
        sprints = docs / "sprints"
        for f in (sorted(sprints.glob("SPRINT-*.md")) if sprints.exists() else []):
            rel = f.relative_to(root).as_posix()
            if f.name.startswith("SPRINT-000"):        # the laid template is not a contract
                continue
            status, _ = header_of(f)
            ctext = text_of(f)
            if status != "active" or not STARTED_LINE_RE.search(ctext):
                continue
            # 15c (SPEC-keypoint-stamp): the activation ritual must have run green — the keypoint
            # writes this stamp on a green floor. A repo without the runner hand-writes the line
            # after running the floor itself. --pre-stamp = the keypoint's own floor run.
            if not args.pre_stamp and not KEYPOINT_STAMP_RE.search(ctext):
                errors.append(f"[spec] {rel} is started but carries no `- **keypoint:** "
                              f"sprint-start` stamp (rule 15c) — run `cpc-keypoint sprint-start` "
                              f"(no runner vendored? hand-write the stamp after a green "
                              f"`docs_check --strict --pre-stamp`)")
            specs = [s for s in sorted(set(SPEC_REF_RE.findall(ctext)))
                     if not s.endswith("SPEC-000-template.md")]
            if not specs:
                errors.append(f"[spec] {rel} is started but names no docs/specs/SPEC-*.md "
                              f"(rule 15) — the executor brief belongs in the contract (ADR-019)")
                continue
            for spec_rel in specs:
                spec = root / spec_rel
                if not spec.exists():
                    errors.append(f"[spec] {rel} -> missing `{spec_rel}` (rule 15)")
                    continue
                rows = ledger_rows(text_of(spec))
                if rows is None:
                    errors.append(f"[spec] {spec_rel} has no `## Open questions` ledger "
                                  f"(rule 15) — run the scoped grill before executing")
                elif not rows:
                    errors.append(f"[spec] {spec_rel} `## Open questions` has no rows (rule 15) "
                                  f"— record the honest empty: `none — trivial task | resolved`")
                else:
                    for q, s in rows:
                        if s == "open":
                            errors.append(f"[spec] {spec_rel} ledger row still open: \u201c{q}\u201d "
                                          f"(rule 15) — resolve or park before execution")

    # 11. baton (ADR-018 D1). Governs .claude/SESSION.md when present. 11a enforces the file's own
    #     declared "newest entry on top" invariant \u2014 dated `## ` entries must be non-increasing
    #     top-to-bottom (ERROR, always on, like rule 1). Non-dated `## ` headings (e.g. an intro or
    #     a "Session start" note) are not part of the sequence and are skipped. 11b is the rotation
    #     budget: entry count over [budgets] session_max_entries warns (0 = off, the token-cap
    #     precedent). Rotation is on-call \u2014 the gate flags; a human moves entries to the archive.
    session = claude / "SESSION.md"
    if session.exists():
        check_dated_log(session, ".claude/SESSION.md", "baton",
                        int(cfg["budgets"].get("session_max_entries", 0) or 0),
                        "SESSION", "11", errors, warns)

    # 13. devlog (ADR-023). The same two invariants as the baton, applied to docs/DEVLOG.md \u2014 the
    #     other append-only, newest-first log that grows without bound on a long project. 13a is the
    #     ordering ERROR (always on); 13b warns past [budgets] devlog_max_entries (0 = off) \u2014 rotate
    #     the oldest entries VERBATIM to docs/archive/DEVLOG-archive-NNN.md; the live file keeps a
    #     one-line pointer to the archive so the trail stays discoverable.
    devlog = docs / "DEVLOG.md"
    if devlog.exists():
        check_dated_log(devlog, "docs/DEVLOG.md", "devlog",
                        int(cfg["budgets"].get("devlog_max_entries", 0) or 0),
                        "DEVLOG", "13", errors, warns)

    # 14. resolved known issue still live (ADR-023). KNOWN_ISSUES.md is class:living, so its
    #     archival is summarize-then-move, not verbatim rotation: past the grace window a RESOLVED
    #     entry becomes one line in the file's `## Resolved index` (KI id, date, one-line summary,
    #     archive path) and the full entry moves to docs/archive/KNOWN_ISSUES-archive-NNN.md.
    #     The gate flags age only \u2014 the summary is judgment, so a human writes it (ADR-007 split).
    #     Accepts both heading forms: `(RESOLVED YYYY-MM-DD)` and `[RESOLVED YYYY-MM-DD]`.
    ki_days = int(cfg["staleness"].get("resolved_ki_days", 0) or 0)
    ki = claude / "KNOWN_ISSUES.md"
    if ki_days > 0 and ki.exists():
        for ln in text_of(ki).splitlines():
            if not ln.startswith("## ") or "RESOLVED" not in ln:
                continue
            title = ln[3:].strip()
            m = RESOLVED_DATE_RE.search(ln)
            if not m:
                warns.append(f"[known-issue] .claude/KNOWN_ISSUES.md `{title}` is RESOLVED "
                             f"but undated \u2014 date it so it can age out (rule 14)")
                continue
            try:
                age = (today - dt.date.fromisoformat(m.group(1))).days
            except ValueError:
                continue
            if age > ki_days:
                warns.append(f"[known-issue] .claude/KNOWN_ISSUES.md `{title}` resolved "
                             f"{age}d ago (> {ki_days}) \u2014 summarize it into the Resolved index and "
                             f"move the full entry to docs/archive/KNOWN_ISSUES-archive-NNN.md "
                             f"(rule 14)")

    # 12. living-doc bump (ADR-018 D3). A class:living doc under docs/ or .claude/ whose last git
    #     commit is NEWER than its `updated:` header was edited without bumping the date \u2014 the drift
    #     \u00a72's "edit in place, bump the date" rule declares but never machine-checked. WARN (fails
    #     under --strict, like every warn). Skips exempt paths (docs/specs/** opt out of header
    #     governance, so they opt out of this header-derived check too), non-git trees, and
    #     not-yet-committed files. Catches edited-without-bump deterministically; content staleness
    #     stays docs-audit's judgment call (ADR-007 honest split).
    if cfg["staleness"].get("living_bump", "warn") != "off":
        for f in md_files:
            rel = f.relative_to(root).as_posix()
            if is_exempt(rel, exempt):
                continue
            head = "\n".join(f.read_text(encoding="utf-8", errors="ignore").splitlines()[:5])
            cm = CLASS_RE.search(head)
            um = UPDATED_RE.search(head)
            if not (cm and um) or cm.group(1).lower() != "living":
                continue
            committed = git_last_commit_date(root, rel)
            if committed and committed > um.group(1):
                warns.append(f"[living] {rel} last committed {committed} but `updated:` says "
                             f"{um.group(1)} \u2014 edited without bumping the date (rule 12)")

    # report. Text is the stable form and stays byte-identical. JSON prints findings ONLY — no
    # summary line and no `root=` echo, so the output stays parseable and carries no machine-specific
    # absolute path (the corpus goldens depend on both). Exit code is identical in either mode.
    fail = bool(errors) or (args.strict and bool(warns))
    if args.format == "json":
        fds = ([from_tagged("error", e) for e in errors]
               + [from_tagged("warn", w) for w in warns])
        fds.sort(key=Finding.total_key)   # rglob order is not guaranteed stable across platforms
        print(to_json(fds))
    else:
        for w in warns:
            print(f"WARN  {w}")
        for e in errors:
            print(f"ERROR {e}")
        print(f"\ndocs_check: {len(errors)} error(s), {len(warns)} warning(s) "
              f"-> {'FAIL' if fail else 'OK'}  (root={root})")
    return 1 if fail else 0

if __name__ == "__main__":
    raise SystemExit(main())
