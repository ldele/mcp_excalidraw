#!/usr/bin/env python3
"""Bulk supersede: retire every document a direction change invalidated (ADR-037).

  cpc-supersede --adr NNN [--root .] [--dry-run]

A project pivots. Twelve documents describing the old direction stay `status: active`, so the next
agent reads them as current and builds toward a goal that was abandoned three weeks ago. cpc's
supersession machinery was all **per document** — rule 4d marks one dead ADR citation, rule 7 moves
one stale disposable — and nobody hand-edits twelve headers at the exact moment they are busy
pivoting. This closes the gap between "we changed direction" and "the vault says so".

It reads the pivot ADR's `## Supersedes` list and, for each named doc:

  1. sets `status:` to `superseded` on the canonical header line,
  2. bumps `updated:` to today, because the header changed,
  3. inserts a **banner** directly beneath the header naming the pivot ADR and its title.

**The banner is the part that does the work.** The header fields feed the gates; the banner is what
an agent sees in the first two lines of a file it opened for content. It also composes with rule 4d,
which already treats a "supersed" note in a file's first 15 lines as governing that file — so a
retired doc stops emitting stale-citation findings, correctly, since it is now history.

**What it will not touch, and why.** `.claude/SESSION.md` and `docs/DEVLOG.md` record what happened,
not what is true; a pivot does not make yesterday's log entry false, and rewriting an append-only log
is the one thing that class exists to forbid (§2). Naming one is an error, not a silent skip.

**What it deliberately leaves to a human.** A `class: disposable` doc superseded in place will be
flagged by rule 7 ("move it to docs/archive/"). This prints the `git mv` line and moves nothing,
following the rotation precedent: the gate flags, a person moves the file. A writer that relocated
files would make a pivot unreviewable as a diff.

Idempotent: re-running replaces an existing banner rather than stacking a second one.

stdlib only (Python 3.11+). Exit 1 on a bad request (no such ADR, no `## Supersedes`, a named path
that does not exist or must not be retired); 0 otherwise.
"""
from __future__ import annotations
import argparse, datetime as dt, re
from pathlib import Path

from cpc._config import load_config
from cpc.docs_scan import CLASS_RE, HEADER_RE, UPDATED_RE, header_line, is_exempt
from cpc._console import make_console_safe

# A `## Supersedes` bullet names its path in backticks: `docs/specs/SPEC-x.md` — anything after is
# prose for the reader. Bare paths are rejected on purpose; the backtick form is what rule 4's route
# gate already validates, so a typo in the list is a broken route before it is a silent no-op.
_BULLET_PATH_RE = re.compile(r"^\s*[-*]\s+`([^`]+)`")
_SECTION_RE = re.compile(r"^##\s+Supersedes\b", re.I)
_ANY_H2_RE = re.compile(r"^##\s+")
_TITLE_RE = re.compile(r"^#\s+(.+)$", re.M)
_BANNER_RE = re.compile(r"^>\s*\*\*Superseded by ADR-\d{3,}\b")

# Append-only LOGS: history, not a claim about the present. Distinct from an append-only ADR, which
# is a decision and is superseded in place (rule 7 scopes archiving to class:disposable).
_NEVER_RETIRE = {".claude/SESSION.md", "docs/DEVLOG.md", "CHANGELOG.md"}


def find_adr(root: Path, num: str) -> Path | None:
    """The local ADR file for `NNN`, searched where rules 4c/4d already look."""
    for d in (root / "docs" / "decisions", root / "docs" / "archive"):
        if d.exists():
            for f in sorted(d.rglob(f"ADR-{int(num):03d}-*.md")):
                return f
    return None


def parse_supersedes(text: str) -> list[str]:
    """The backticked paths bulleted under `## Supersedes`, in order, de-duplicated."""
    out: list[str] = []
    inside = False
    for line in text.splitlines():
        if _SECTION_RE.match(line):
            inside = True
            continue
        if inside and _ANY_H2_RE.match(line):
            break
        if inside:
            m = _BULLET_PATH_RE.match(line)
            if m and m.group(1) not in out:
                out.append(m.group(1))
    return out


def retire(text: str, adr_num: str, adr_title: str, adr_rel: str, today: str) -> str | None:
    """Return `text` with the header retired and the banner inserted, or None if it has no
    canonical header (a doc the gates cannot classify is one this must not guess at)."""
    head = header_line(text)
    if head is None:
        return None
    lines = text.splitlines(keepends=True)
    idx = next(i for i, ln in enumerate(lines) if ln.rstrip("\r\n") == head.rstrip("\r\n"))
    new_head = HEADER_RE.sub("status: superseded", head, count=1)
    new_head = UPDATED_RE.sub(f"updated: {today}", new_head, count=1)
    lines[idx] = new_head + "\n"

    # Drop any banner this tool wrote before, so a re-run refreshes instead of stacking.
    rest = [ln for ln in lines[idx + 1:] if not _BANNER_RE.match(ln)]
    while rest and not rest[0].strip():          # collapse the blank run we are about to rebuild
        rest.pop(0)
    banner = (f"> **Superseded by ADR-{int(adr_num):03d} on {today}.** {adr_title}\n"
              f"> Read that first: `{adr_rel}`. This file records the previous direction and is "
              f"kept for history — do not build from it.\n")
    return "".join(lines[:idx + 1]) + "\n" + banner + "\n" + "".join(rest)


def main(argv: list[str] | None = None) -> int:
    make_console_safe()   # KI-9: never crash echoing text cpc did not write
    ap = argparse.ArgumentParser(
        description="Retire every doc a direction-change ADR supersedes (ADR-037).")
    ap.add_argument("--adr", required=True, help="the pivot ADR number, e.g. 37 or 037")
    ap.add_argument("--root", default=".", type=Path)
    ap.add_argument("--dry-run", action="store_true", help="print the plan; write nothing")
    args = ap.parse_args(argv)
    root: Path = args.root.resolve()

    if not args.adr.strip().isdigit():
        print(f"cpc-supersede: --adr must be a number, got {args.adr!r}")
        return 1
    adr = find_adr(root, args.adr)
    if adr is None:
        print(f"cpc-supersede: no docs/decisions/ADR-{int(args.adr):03d}-*.md — write the pivot ADR "
              "first; this tool executes a decision, it does not make one")
        return 1

    adr_text = adr.read_text(encoding="utf-8", errors="ignore")
    adr_rel = adr.relative_to(root).as_posix()
    tm = _TITLE_RE.search(adr_text)
    title = tm.group(1).strip() if tm else adr.stem
    targets = parse_supersedes(adr_text)
    if not targets:
        print(f"cpc-supersede: {adr_rel} has no `## Supersedes` list with backticked paths.\n"
              "  A direction change that names nothing it replaces is a decision, not a pivot — "
              "add the section, or use a plain ADR.")
        return 1

    today = dt.date.today().isoformat()
    errors: list[str] = []
    planned: list[tuple[str, str]] = []          # (rel, class) for the report
    for rel in targets:
        if rel in _NEVER_RETIRE:
            errors.append(f"[refused] {rel} is an append-only LOG — it records what happened, which "
                          "a pivot does not make false. Remove it from `## Supersedes`.")
            continue
        p = root / rel
        if not p.is_file():
            errors.append(f"[missing] {rel} — named in `## Supersedes` but not in the tree")
            continue
        text = p.read_text(encoding="utf-8", errors="ignore")
        out = retire(text, args.adr, title, adr_rel, today)
        if out is None:
            errors.append(f"[no-header] {rel} carries no canonical status header, so the gates "
                          "cannot classify it and this will not guess — add a header first")
            continue
        cm = CLASS_RE.search(header_line(text) or "")
        cls = cm.group(1).lower() if cm else "?"
        planned.append((rel, cls))
        if not args.dry_run:
            p.write_text(out, encoding="utf-8", newline="")

    verb = "would retire" if args.dry_run else "retired"
    for rel, cls in planned:
        print(f"  {verb}: {rel}  ({cls})")
    for e in errors:
        print(f"  {e}")

    # §2: a superseded disposable belongs under docs/archive/. Rule 7 enforces that — but it skips
    # `[headers] exempt` paths, and `docs/specs/**` is exempt in the shipped default, so promising
    # "the gate will ask" would be false for exactly the commonest pivot casualty. State the rule,
    # and say honestly which of these the gate actually backs.
    # Borrow docs_check's OWN defaults, never a local copy. A second exempt list here would answer
    # this question differently from the gate that enforces it — two surfaces disagreeing about
    # which files are governed is the KI-5/KI-7 shape, and this message exists to predict rule 7.
    from cpc.docs_check import DEFAULTS as GATE_DEFAULTS
    exempt = load_config(root, None, {"headers": dict(GATE_DEFAULTS["headers"])})["headers"]["exempt"]
    moves = [(rel, is_exempt(rel, exempt)) for rel, cls in planned if cls == "disposable"]
    if moves:
        gated = sum(1 for _, ex in moves if not ex)
        print(f"\n{len(moves)} superseded disposable(s) must move to docs/archive/ (§2). This moves "
              "nothing, so the pivot stays reviewable as a diff — run them yourself:")
        for rel, ex in moves:
            note = "   # header-exempt: no gate will remind you" if ex else ""
            print(f"  git mv {rel} docs/archive/{Path(rel).name}{note}")
        print(f"  ({gated} of {len(moves)} are backed by rule 7; the rest are on you.)")

    print(f"\ncpc-supersede: {len(planned)} {verb} under ADR-{int(args.adr):03d}, "
          f"{len(errors)} refused"
          f"{' (dry run — nothing written)' if args.dry_run else ''}")
    if not args.dry_run and planned:
        print("Next: re-run `cpc-docs-check --strict`, regenerate the index, and state the new "
              "direction in .claude/CONTEXT.md — a pivot nobody records in CONTEXT is a pivot the "
              "next session does not know about.")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
