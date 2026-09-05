#!/usr/bin/env python3
"""Stamp `updated:` on staged `class: living` docs — rule 12's missing half (consumer KI-18).

  cpc-date-stamp [--root .] [--check]

**The problem this closes.** Rule 12 compares a living doc's `updated:` header against that file's
last *commit* date. Before the commit exists there is nothing to compare against; after it exists,
the date compared against is the one just created. The rule is therefore **structurally
unsatisfiable before the commit that trips it** — a post-commit assertion run as a pre-commit gate.
The documented workaround is a second, content-free commit that moves only header dates. On one
consumer it fired **6 times across 5 sessions**, and **3 of those were sessions that crossed
midnight**, where care cannot help: a doc correctly dated the day its prose was written is wrong the
instant the next day's commit touches it. "Remember to set it correctly" was tried and is dead.

**This is the first cpc gate that WRITES, and that is the whole point.** Every other gate reports
and leaves the file alone; §13's own rule is that a gate never rewrites an append-only file. That
rule is kept exactly: this touches `class: living` documents only — the class whose entire contract
is *edit in place and bump the date*. Append-only history and disposables are never opened. Writing
is justified here because the value being written is not a judgment: it is today's date, which the
tool knows and the human is merely re-typing.

**It does not `git add` what it fixes, deliberately.** A file can be partially staged (`git add -p`),
in which case the worktree copy carries changes the author chose to leave out. Re-adding the whole
file would sweep those into the commit — a data-losing surprise from a hook that is supposed to fix
a date. Under `pre-commit` that risk is absent (it stashes unstaged changes first), but this must be
safe when run by hand too, and a tool that is safe only inside one harness is a trap. So: rewrite,
say so, exit non-zero. `pre-commit` reports "files were modified by this hook", the author re-adds
and commits again, and the fix lands **in that same commit** — which is the outcome KI-18 wants. No
second commit enters history.

`--check` writes nothing and exits 1 if any staged living doc is out of date — for a CI leg, or for
anyone who wants the answer without the edit.

stdlib only (Python 3.11+); git is shelled, never imported, and any git failure is a silent skip —
the same contract `docs_check.git_last_commit_date` set. Exit 1 if files were changed (or, under
`--check`, would be); 0 when there was nothing to do.
"""
from __future__ import annotations

import argparse
import datetime as dt
import subprocess
from pathlib import Path

from cpc._console import make_console_safe
from cpc.docs_scan import CLASS_RE, UPDATED_RE, header_line


def staged_files(root: Path) -> list[str]:
    """Repo-relative paths staged for the next commit (added/copied/modified/renamed).

    Deletions are excluded by `--diff-filter=ACMR`: a deleted file has nothing to stamp, and
    opening it would raise. Any git failure returns an empty list rather than an error, so a
    non-repo, a missing git, or a first commit degrades to "nothing to do" instead of blocking.
    """
    try:
        r = subprocess.run(
            ["git", "-C", str(root), "diff", "--cached", "--name-only", "--diff-filter=ACMR"],
            capture_output=True, text=True, check=False)
    except (OSError, ValueError):
        return []
    if r.returncode != 0:
        return []
    return [ln.strip() for ln in r.stdout.splitlines() if ln.strip()]


def restamp(text: str, today: str) -> str | None:
    """The text with its header date set to *today*, or None if there is nothing to change.

    None covers every "not ours" case in one place, and each is a deliberate refusal:

    * no canonical header line — `header_line` is the single predicate rules 1/7/12 admit on, so a
      doc it does not recognise is a doc rule 12 will never fire on either;
    * `class:` is not `living` — append-only and disposable are not ours to rewrite, and this is the
      line that keeps §13's "a gate never rewrites append-only history" true;
    * no `updated:` field — adding one would be inventing a header, not fixing a date;
    * already today — so a second run is a no-op and the hook cannot loop.

    Only the date characters inside the canonical header line change; the surrounding text is
    reassembled from the original bytes, so spacing, separators and any other field survive exactly.
    """
    line = header_line(text)
    if line is None:
        return None
    cls = CLASS_RE.search(line)
    if not cls or cls.group(1).lower() != "living":
        return None
    m = UPDATED_RE.search(line)
    if not m or m.group(1) == today:
        return None
    return text.replace(line, line[:m.start(1)] + today + line[m.end(1):], 1)


def run(root: Path, today: str, write: bool) -> tuple[list[str], list[str]]:
    """(changed, unreadable) — repo-relative paths stamped (or needing it), and ones git named
    but the filesystem could not supply. A staged path can be absent from the worktree in a
    partially-applied rebase or a case-collision on Windows; that is worth a line, not a crash."""
    changed: list[str] = []
    unreadable: list[str] = []
    for rel in staged_files(root):
        p = root / rel
        try:
            text = p.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            if p.exists():                      # a binary or unreadable file is simply not a doc
                continue
            unreadable.append(rel)
            continue
        new = restamp(text, today)
        if new is None:
            continue
        changed.append(rel)
        if write:
            p.write_text(new, encoding="utf-8", newline="")
    return changed, unreadable


def main(argv: list[str] | None = None) -> int:
    make_console_safe()   # KI-9: never crash echoing text cpc did not write
    ap = argparse.ArgumentParser(
        description="Set `updated:` to today on staged class:living docs (rule 12 / KI-18).")
    ap.add_argument("--root", default=".", type=Path)
    ap.add_argument("--check", action="store_true",
                    help="report only; write nothing (exit 1 if any doc is out of date)")
    args = ap.parse_args(argv)
    root: Path = args.root.resolve()
    today = dt.date.today().isoformat()

    changed, unreadable = run(root, today, write=not args.check)
    for rel in unreadable:
        print(f"  skip  {rel} — staged but not readable from the worktree")
    if not changed:
        print("cpc-date-stamp: every staged living doc already carries today's date -> OK")
        return 0
    verb = "would set" if args.check else "set"
    for rel in changed:
        print(f"  {verb} updated: {today}  {rel}")
    if args.check:
        print(f"\ncpc-date-stamp: {len(changed)} staged living doc(s) are not dated {today} — "
              "run without --check, or bump them by hand (rule 12).")
        return 1
    print(f"\ncpc-date-stamp: {len(changed)} file(s) restamped. They are NOT staged for you — a "
          "partially staged file must not have its unstaged changes swept into the commit. "
          "`git add` them and commit again; the fix lands in this same commit.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
