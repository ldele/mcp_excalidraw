#!/usr/bin/env python3
"""Derive a sprint closeout report skeleton from the active SPRINT contract + git.

Reuses sprint_check's parser + change-set. Fills the MECHANICAL fields from facts (DoD, scope
adherence, gate verdicts, commits, diffstat) and leaves PLACEHOLDERS for the three JUDGMENT fields
(plan-vs-actual calls, workarounds, review guide) authored by the sprint-closeout skill. The split
is the point: the numbers come from git + the gates and cannot be hallucinated; the judgment is
written by a human/agent. See the sprint-closeout skill + ADR-017. stdlib only (py3.11+).
"""
from __future__ import annotations
import argparse, datetime as dt, re, subprocess, sys
from pathlib import Path

from cpc.sprint_check import (find_active_contract, parse_contract, parse_contracts,
                               changed_files, sh, matches_any, BULLET_RE)

TITLE_RE = re.compile(r"^#\s+(.+)$", re.M)
DOD_RE = re.compile(r"\*\*DoD:\*\*\s*(.*)")
ESTIMATE_RE = re.compile(r"\*\*estimate:\*\*\s*(.*)")
STARTED_RE = re.compile(r"\*\*started:\*\*\s*(\S+)")
HTML_COMMENT_RE = re.compile(r"<!--.*?-->")
GAPS_HEADING_RE = re.compile(r"^gaps$", re.I)


def dod_block(text: str) -> str:
    """The `**DoD:**` value incl. indented continuation lines, up to a blank line, a heading,
    an HTML comment, or the next top-level `- **field**` bullet."""
    out: list[str] = []
    grabbing = False
    for ln in text.splitlines():
        if not grabbing:
            m = DOD_RE.search(ln)
            if m:
                grabbing = True
                if m.group(1).strip():
                    out.append(m.group(1).strip())
            continue
        s = ln.strip()
        if not s or s.startswith(("##", "<!--")):
            break
        if ln.lstrip().startswith(("- **", "* **")):   # next field bullet
            break
        out.append(s)
    return " ".join(out).strip() or "<no **DoD:** line found in the contract>"


def gaps_of(text: str) -> list[str]:
    """`## gaps` bullets, verbatim (ADR-019 gaps channel) — [] if the section is absent/empty."""
    out: list[str] = []
    grabbing = False
    for ln in text.splitlines():
        if not grabbing:
            if ln.startswith("##") and GAPS_HEADING_RE.match(ln.lstrip("# ").strip()):
                grabbing = True
            continue
        s = ln.strip()
        if s.startswith("##"):
            break
        if s.startswith("<!--"):
            continue
        m = BULLET_RE.match(ln)
        if m:
            out.append(m.group(1).strip())
    return out


def estimate_of(text: str) -> str:
    """The `**estimate:**` header value (ADR-019 effort record) — a labeled placeholder if absent."""
    m = ESTIMATE_RE.search(text)
    if not m:
        return "n/a — no `estimate:` line"
    val = HTML_COMMENT_RE.sub("", m.group(1)).strip()
    return val or "n/a — no `estimate:` line"


def elapsed_of(text: str, now: dt.datetime) -> str:
    """Wall-clock since the `started:` stamp (a fact, never a token/effort guess) — n/a if unstamped."""
    m = STARTED_RE.search(text)
    if not m:
        return "n/a — no `started:` stamp"
    ts = m.group(1)
    try:
        started = dt.datetime.fromisoformat(ts)
    except ValueError:
        return f"n/a — unparseable `started:` value ({ts})"
    hours = (now - started).total_seconds() / 3600
    return f"{hours:.1f}h since {ts}"


def slug_of(text: str, contract: Path) -> str:
    m = TITLE_RE.search(text)
    return m.group(1).strip() if m else contract.stem


def gate_verdict(mod: str, root: Path) -> str:
    """Best-effort deterministic gate verdict — OK / FAIL / unrun. Never raises: a reporting tool
    must not fail because a gate could not run in this environment."""
    try:
        rc = subprocess.run([sys.executable, "-m", mod, "--root", str(root), "--strict"],
                            capture_output=True, text=True).returncode
        return "OK" if rc == 0 else "FAIL"
    except Exception as e:  # noqa: BLE001 - report, don't crash
        return f"unrun ({e.__class__.__name__})"


def build_report(root: Path, contract: Path, base: str) -> str:
    text = contract.read_text(encoding="utf-8", errors="ignore")
    _, sec = parse_contract(contract)
    dod = dod_block(text)
    slug = slug_of(text, contract)

    if (root / ".git").exists():
        mb = sh(["git", "merge-base", base, "HEAD"], root) or base
        diffstat = sh(["git", "diff", "--stat", mb, "HEAD"], root) or "(no diff vs base)"
        commits = sh(["git", "log", "--oneline", f"{mb}..HEAD"], root) or "(no commits vs base)"
        changed = changed_files(root, base)
    else:
        diffstat = commits = "(not a git repo)"
        changed = set()

    in_scope = sec["affects"] + sec["docs"] + [contract.relative_to(root).as_posix()]
    oos_files = [f for f in sorted(changed) if not matches_any(f, in_scope)]
    oos = "\n".join(f"- `{f}`" for f in oos_files) if oos_files \
        else "- none — every change stayed inside `affects`/`docs`."

    sprint_v = gate_verdict("cpc.sprint_check", root)
    docs_v = gate_verdict("cpc.docs_check", root)

    # ADR-019 additions: gaps channel, effort record, commit-readiness — all derived with
    # graceful fallbacks so a legacy contract (no estimate:/started:/## gaps) still renders clean.
    gaps = gaps_of(text)
    gaps_block = "\n".join(f"- {g}" for g in gaps) if gaps else "- none surfaced."
    estimate = estimate_of(text)
    elapsed = elapsed_of(text, dt.datetime.now())

    scope_verdict = ("clean — no out-of-scope files" if not oos_files
                      else f"{len(oos_files)} out-of-scope file(s) — see section 3")
    test_targets = [c["target"] for c in parse_contracts(sec["contracts"]) if c["kind"] == "test"]
    if not test_targets:
        contracts_verdict = "no `test:` contracts declared"
    else:
        missing = [t for t in test_targets if not (root / t).is_file()]
        contracts_verdict = (f"MISSING: {', '.join(missing)}" if missing
                              else f"OK — {len(test_targets)} test target(s) present")

    today = dt.date.today().isoformat()
    return f"""<!-- status: active · updated: {today} · class: disposable -->

# {slug} — closeout report

> Derived by `cpc-sprint-report` from `{contract.relative_to(root).as_posix()}` + git. The mechanical
> fields are facts (git + the gates); the **JUDGMENT** sections are authored by the sprint-closeout skill.

## 1. What this was
{dod}

## 2. Plan vs actual
<!-- JUDGMENT: one line per DoD criterion — met | partial | cut — proof: test:line / artifact -->
- <criterion> — met | partial | cut — proof: <...>

## 3. Gaps & scope drift
Out-of-scope files changed (not in `affects`/`docs`):
{oos}
<!-- JUDGMENT: for each, the honest reason it was needed (the blast-radius note) -->

## 4. Workarounds
<!-- JUDGMENT: each shortcut + what it defers; link a .claude/RIGOR_TODO.md or KNOWN_ISSUES entry so it can't vanish -->
- <shortcut> -> defers <...> (RIGOR_TODO / KI-NNN)

## 5. Landed
**Gates:** sprint_check **{sprint_v}** · docs_check **{docs_v}** · tests: run your suite (pytest / cargo test / npm test) and paste the result.

**Commits ({base}..HEAD):**
```
{commits}
```

**Diffstat:**
```
{diffstat}
```

## 6. Left to do
<!-- from docs/ROADMAP.md parking-lot + any `partial`/`cut` criterion above -->
- <next sprint / phase item>

## 7. Review guide
<!-- JUDGMENT: risk-grade for the reviewer -->
- **Safe to skim:** <low-risk changes>
- **Needs your eyes:** <the 2-3 diffs that matter, and why>
- **Re-run the gates:** `python -m cpc.sprint_check --root . --strict` · `python -m cpc.docs_check --root . --strict`

## 8. Executor gaps
<!-- lifted verbatim from the contract's `## gaps` — triage: fix now / next planning session / promote to KNOWN_ISSUES -->
{gaps_block}

## 9. Effort
- **Estimate:** {estimate}
- **Elapsed:** {elapsed}
- **Diffstat:** see section 5 (Landed)
- **Tokens:** n/a (optional hand-filled field — never fake this measurement)

## 10. Commit readiness
**Derived checks:**
- Gates: sprint_check **{sprint_v}** · docs_check **{docs_v}**
- Scope: {scope_verdict}
- Contracts: {contracts_verdict}

**Judgment (fill before commit):**
- **Verdict:** <ship | hold | needs changes>
- **Proposed commit message:** <Conventional Commit subject + body>
"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", type=Path)
    ap.add_argument("--contract", default=None, type=Path)
    ap.add_argument("--base", default=None)
    ap.add_argument("--out", default=None, type=Path, help="report path (default: alongside the contract)")
    ap.add_argument("--stdout", action="store_true", help="print the report instead of writing a file")
    args = ap.parse_args()
    root = args.root.resolve()

    contract = find_active_contract(root, args.contract)
    if contract is None:
        print("sprint_report: no active sprint contract -> nothing to report")
        return 0
    base_parsed, _ = parse_contract(contract)
    base = args.base or base_parsed
    report = build_report(root, contract, base)

    if args.stdout:
        print(report)
        return 0
    out = args.out or (contract.parent / f"{contract.stem}-report.md")
    out.write_text(report, encoding="utf-8", newline="")
    print(f"sprint_report: wrote {out.relative_to(root)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
