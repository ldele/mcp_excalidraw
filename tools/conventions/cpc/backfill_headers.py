#!/usr/bin/env python3
"""Prepend the convention status header to docs/**.md and .claude/**.md that lack one.

Infers class from filename, status from location. Dry-run by default; pass --write to apply.
Run from a project root:  python backfill_headers.py --root . --write
"""
from __future__ import annotations
import argparse, datetime as dt, re
from pathlib import Path

HAS_HEADER = re.compile(r"^\s*<!--\s*status:", re.I)
DATE_IN_NAME = re.compile(r"(\d{4}-\d{2}-\d{2})")

def classify(rel: str) -> str:
    name = Path(rel).name.lower()
    if name.startswith(("adr-", "devlog", "session")) or "/decisions/" in f"/{rel.lower()}":
        return "append-only"
    if name.startswith(("plan_", "review_")):
        return "disposable"
    return "living"

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", type=Path)
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()
    root = args.root.resolve()
    today = dt.date.today().isoformat()
    targets: list[Path] = []
    for sub in ("docs", ".claude"):
        d = root / sub
        if d.exists():
            targets += [p for p in d.rglob("*.md")]
    changed = 0
    for f in sorted(targets):
        rel = f.relative_to(root).as_posix()
        text = f.read_text(encoding="utf-8", errors="ignore")
        if text and HAS_HEADER.match(text.splitlines()[0]):
            continue
        cls = classify(rel)
        status = "superseded" if "/archive/" in f"/{rel}" else "active"
        m = DATE_IN_NAME.search(f.name)
        updated = m.group(1) if m else today
        header = f"<!-- status: {status} · updated: {updated} · class: {cls} -->\n\n"
        print(f"{'WRITE' if args.write else 'WOULD'}  {rel}  [{status}/{cls}]")
        if args.write:
            f.write_text(header + text, encoding="utf-8", newline="")
        changed += 1
    print(f"\n{changed} file(s) {'updated' if args.write else 'need a header (dry-run)'}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
