#!/usr/bin/env python3
"""Assisted sprint start: scaffold the contract + open the doc stubs the gate will enforce.

  python sprint_start.py --root . --sprint 13 --slug rule-binding [--title "..."] [--base main]

Idempotent: re-running won't duplicate the contract or the DEVLOG stub.
You fill in DoD / uses / affects / contracts and the DEVLOG body; sprint_check.py enforces them.
"""
from __future__ import annotations
import argparse, datetime as dt, re
from pathlib import Path

# KI-4: the `--base` default used to be the literal "main". In a repo whose default branch is named
# anything else that silently disabled two sprint_check gates, so the default is now detected.
# `workflow -> gates` is an allowed concept-map edge, and one implementation beats two copies.
from cpc.sprint_check import default_branch

STARTED_RE = re.compile(r"^- \*\*started:\*\*", re.M)
BASE_LINE_RE = re.compile(r"^- \*\*base:\*\*", re.M)

CONTRACT_TMPL = """<!-- status: active · updated: {date} · class: disposable -->

# SPRINT-{num} — {slug}

- **base:** {base}
- **DoD:** <behavioral acceptance criteria — what proves this is done>

## uses
- docs/specs/SPEC-{num}-<brief>.md
- <file the agent should load>

## affects
- <file this sprint will create/modify>

## contracts
- test: <path/test_x.py::ident>
- snap: docs/openapi.json | when: **/api.py

## docs
- docs/DEVLOG.md
"""

DEVLOG_STUB = """## {date} — SPRINT-{num} {slug}
- **What:** <TODO: fill on landing>
- **Why:** <TODO>
- **Rejected:** <TODO>
- **Opens:** <TODO>

"""

def ensure_contract(root: Path, num: str, slug: str, base: str, date: str) -> Path:
    d = root / "docs" / "sprints"
    d.mkdir(parents=True, exist_ok=True)
    f = d / f"SPRINT-{num}-{slug}.md"
    if f.exists():
        print(f"= contract exists: {f.relative_to(root)}")
    else:
        f.write_text(CONTRACT_TMPL.format(date=date, num=num, slug=slug, base=base), encoding="utf-8", newline="")
        print(f"+ created contract: {f.relative_to(root)}")
    return f

def stamp_started(contract: Path, timestamp: str) -> None:
    """Activation stamp (ADR-019): idempotent — a contract that already carries a `started:`
    line (from an earlier activation) is left untouched, so re-running never duplicates it."""
    text = contract.read_text(encoding="utf-8")
    if STARTED_RE.search(text):
        print("= contract already stamped: started:")
        return
    lines = text.splitlines(keepends=True)
    m = next((i for i, ln in enumerate(lines) if BASE_LINE_RE.match(ln)), None)
    insert_at = m + 1 if m is not None else len(lines)
    lines.insert(insert_at, f"- **started:** {timestamp}\n")
    contract.write_text("".join(lines), encoding="utf-8", newline="")
    print(f"+ stamped started: {timestamp}")


def ensure_devlog(root: Path, num: str, slug: str, date: str) -> None:
    f = root / "docs" / "DEVLOG.md"
    if not f.exists():
        print("! docs/DEVLOG.md missing — create it from the template first")
        return
    text = f.read_text(encoding="utf-8")
    if f"SPRINT-{num} " in text:
        print("= DEVLOG already has an entry for this sprint")
        return
    stub = DEVLOG_STUB.format(date=date, num=num, slug=slug)
    lines = text.splitlines(keepends=True)
    idx = next((i for i, ln in enumerate(lines) if ln.startswith("## ")), len(lines))
    lines.insert(idx, stub)
    f.write_text("".join(lines), encoding="utf-8", newline="")
    print("+ opened DEVLOG stub entry (fill on landing)")

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", type=Path)
    ap.add_argument("--sprint", required=True)
    ap.add_argument("--slug", required=True)
    ap.add_argument("--base", default=None,
                    help="branch this sprint merges into; defaults to the repo's DETECTED default "
                         "branch (a hardcoded `main` is what caused KI-4)")
    ap.add_argument("--title", default=None)
    args = ap.parse_args()
    root = args.root.resolve()
    num = str(args.sprint).zfill(3)
    date = dt.date.today().isoformat()
    base = args.base or default_branch(root)
    contract = ensure_contract(root, num, args.slug, base, date)
    stamp_started(contract, dt.datetime.now().isoformat(timespec="seconds"))
    ensure_devlog(root, num, args.slug, date)
    print(f"\nNext: fill DoD/uses/affects/contracts in the contract, then work the sprint. "
          f"At the checkpoint run:\n  python scripts/sprint_check.py --root . --strict")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
