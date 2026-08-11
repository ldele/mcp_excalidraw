#!/usr/bin/env python3
"""Rotate an append-only log's oldest entries to its archive, verbatim (ADR-018 D1, ADR-023 rule 13b).

  cpc-rotate [--root .] [--file baton|devlog|all] [--write]

`docs_check` rules 11b and 13b flag a log past its entry cap; moving the text has been a hand edit
ever since. On this repo that hand edit came up in four consecutive sessions, and it went wrong
once — a hand rotation swept the live file's trailing archive-pointer line into the archive along
with the entry it followed. A repeated manual edit on an append-only file is the wrong place to
spend care.

**Default is a plan; `--write` moves.** The same shape as `cpc-generate` and `cpc-docs-index`,
and the right default for the only tool here that edits an append-only file.

Reliability, given that this rewrites files whose whole point is never being rewritten:

  * **Verbatim or nothing.** Entry text is sliced and re-joined, never reformatted. After writing,
    `_verify` re-reads both files from disk and asserts the moved bytes are present in the archive
    and absent from the live file. A failed verification is a hard error, not a warning.
  * **No entry may be lost.** The check is on entry COUNT and on each entry's exact text, not on
    file size — a truncating bug that happened to keep the byte count would pass a size check.
  * **The gate's own predicate.** Entries are found with `docs_rules_history.SESSION_ENTRY_RE`, the
    regex rules 11/13 count with. A second definition of "an entry" here would let the tool and the
    gate disagree about how many there are, which is the KI-5/KI-7 failure shape.
  * **The tail stays home.** Trailing non-entry lines (the `> Older entries: ...` pointer) belong to
    the live file, not to the last entry above them. That is the bug the hand rotation hit.
  * **Ordering is preserved.** Rotated entries are older than everything left live and newer than
    everything already archived, so they are inserted at the TOP of the archive — keeping the
    newest-first invariant rules 11a/13a enforce as an ERROR.

**`.claude/KNOWN_ISSUES.md` is deliberately not rotatable.** Rule 14's archival is
summarize-then-move: a resolved issue becomes one line in the Resolved index and the full entry goes
to the archive. The summary is judgment, so a human writes it (ADR-007). Automating the move would
leave the index unwritten.

stdlib only (Python 3.11+). Exit 1 on a failed verification or an unreadable target; 0 otherwise.
"""
from __future__ import annotations
import argparse, datetime as dt
from pathlib import Path

from cpc._config import load_config
from cpc.docs_rules_history import SESSION_ENTRY_RE

# name -> (live path, archive path, cap key, ADR/rule citation, archive title, archive blurb)
LOGS: dict[str, tuple[str, str, str, str, str, str]] = {
    "baton": (".claude/SESSION.md", "docs/archive/SESSION-archive-001.md", "session_max_entries",
              "ADR-018 D1 / rule 11b", "SESSION archive 001",
              "Rotated baton entries — older than the newest {cap} kept in `.claude/SESSION.md`, "
              "moved here **verbatim** per ADR-018 D1. Newest entry on top. Append-only; never "
              "edited."),
    "devlog": ("docs/DEVLOG.md", "docs/archive/DEVLOG-archive-001.md", "devlog_max_entries",
               "ADR-023 rule 13b", "DEVLOG archive 001",
               "Rotated DEVLOG entries — older than the newest {cap} kept in `docs/DEVLOG.md`, "
               "moved here **verbatim** per ADR-023 rule 13b. Newest entry on top. Append-only; "
               "never edited."),
}

DEFAULTS = {"budgets": {"session_max_entries": 0, "devlog_max_entries": 0}}


def split_entries(text: str) -> tuple[str, list[str], str]:
    """(preamble, entries, tail) — every byte accounted for, so ''.join round-trips exactly.

    `tail` is the trailing run of non-entry lines after the last entry: a pointer line, a trailing
    blank. It belongs to the live file and must not travel with the entry it happens to follow.
    """
    lines = text.splitlines(keepends=True)
    starts = [i for i, ln in enumerate(lines) if SESSION_ENTRY_RE.match(ln)]
    if not starts:
        return text, [], ""
    end = len(lines)
    while end > starts[-1] + 1 and (not lines[end - 1].strip()
                                    or lines[end - 1].lstrip().startswith(">")):
        end -= 1
    bounds = starts + [end]
    entries = ["".join(lines[bounds[i]:bounds[i + 1]]) for i in range(len(starts))]
    return "".join(lines[:starts[0]]), entries, "".join(lines[end:])


def new_archive(title: str, blurb: str, cap: int, today: str) -> str:
    """A fresh archive file. `status: archived` because rule 6 ERRORs on an active file under
    docs/archive/, and `class: append-only` because that is what it holds."""
    return (f"<!-- status: archived · updated: {today} · class: append-only -->\n\n"
            f"# {title}\n\n{blurb.format(cap=cap)}\n\n")


def plan(root: Path, name: str, cfg: dict) -> tuple[Path, Path, list[str], int, int]:
    """(live, archive, entries_to_move, kept, cap). Empty list = nothing to do."""
    rel_live, rel_arch, cap_key, _, _, _ = LOGS[name]
    live, arch = root / rel_live, root / rel_arch
    cap = int(cfg["budgets"].get(cap_key, 0) or 0)
    if cap <= 0 or not live.is_file():          # 0 = the cap is off, the token-cap precedent
        return live, arch, [], 0, cap
    _, entries, _ = split_entries(live.read_text(encoding="utf-8"))
    if len(entries) <= cap:
        return live, arch, [], len(entries), cap
    return live, arch, entries[cap:], cap, cap   # entries are newest-first; the tail is oldest


def _inversions(text: str) -> int:
    """How many adjacent dated headings sit oldest-above-newest. 0 = strictly newest-first."""
    dates = [m.group(1) for ln in text.splitlines() if (m := SESSION_ENTRY_RE.match(ln))]
    return sum(1 for a, b in zip(dates, dates[1:]) if b > a)


def _heads(text: str) -> list[str]:
    """Every dated `## ` heading line, verbatim — the verifier's OWN notion of an entry.

    Deliberately independent of `split_entries`. A verifier that re-uses the writer's parse proves
    only that the writer agrees with itself: sabotaging `split_entries` to drop an entry silently
    deleted it from the live file and still verified clean, because both sides of the comparison
    inherited the same bug. This scans lines and nothing else, so a parse bug cannot hide behind it.
    """
    return [ln.rstrip("\r\n") for ln in text.splitlines() if SESSION_ENTRY_RE.match(ln)]


def _verify(live: Path, arch: Path, moved: list[str], kept_before: list[str],
            arch_inversions_before: int, heads_before: list[str]) -> list[str]:
    """Re-read both files from disk and prove nothing was lost or mangled. Returns problems."""
    bad: list[str] = []
    live_text = live.read_text(encoding="utf-8")
    arch_text = arch.read_text(encoding="utf-8")
    _, live_entries, _ = split_entries(live_text)
    _, arch_entries, _ = split_entries(arch_text)

    # THE check: every heading that existed before must exist after, in the same order, across the
    # two files combined. Independent of `split_entries`, so a parse bug cannot satisfy it.
    heads_after = _heads(live_text) + _heads(arch_text)
    if heads_after != heads_before:
        lost = [h for h in heads_before if h not in heads_after]
        gained = [h for h in heads_after if h not in heads_before]
        if lost:
            bad.append(f"{len(lost)} entry(ies) LOST — first: {lost[0][:70]}")
        if gained:
            bad.append(f"{len(gained)} entry(ies) appeared from nowhere — first: {gained[0][:70]}")
        if not lost and not gained:
            bad.append("entries were REORDERED — rotation must preserve the newest-first stream")

    if len(live_entries) != len(kept_before):
        bad.append(f"live entry count is {len(live_entries)}, expected {len(kept_before)}")
    for e in kept_before:
        if e.rstrip("\n") not in live_text:
            bad.append(f"a kept entry vanished from {live.name}: {e.splitlines()[0][:60]}")
    for e in moved:
        if e.rstrip("\n") not in arch_text:
            bad.append(f"a moved entry is not in {arch.name}: {e.splitlines()[0][:60]}")
        if e.rstrip("\n") in live_text:
            bad.append(f"a moved entry is STILL in {live.name}: {e.splitlines()[0][:60]}")
    if len(arch_entries) < len(moved):
        bad.append(f"{arch.name} holds {len(arch_entries)} entries, fewer than the {len(moved)} moved")
    # Ordering is judged as a DELTA, never as an absolute. An absolute check blamed this tool for a
    # condition it inherited: both of cpc's archives were already out of newest-first order at HEAD
    # (first inversions 2026-06-15→2026-06-24 and 2026-06-15→2026-07-16), from hand rotations
    # predating it. Nothing scans an archive's ordering — rules 11a/13a read only `.claude/SESSION.md`
    # and `docs/DEVLOG.md` — so a tool that refused to run until the archive was clean would be
    # unusable, and one that claimed "rule 11a will ERROR" would be stating something untrue.
    after = _inversions(arch_text)
    if after > arch_inversions_before:
        bad.append(f"{arch.name} gained {after - arch_inversions_before} ordering inversion(s) — "
                   f"rotation must never reorder; it inserts newer-than-archived entries on top")
    return bad


def rotate(root: Path, name: str, cfg: dict, write: bool, today: str) -> tuple[int, list[str]]:
    """Returns (entries moved, problems). Writes only when `write`."""
    _, _, _, cite, title, blurb = LOGS[name]
    live, arch, moving, cap, cap_val = plan(root, name, cfg)
    if not moving:
        return 0, []
    preamble, entries, tail = split_entries(live.read_text(encoding="utf-8"))
    keeping = entries[:cap]

    if not write:
        return len(moving), []

    arch.parent.mkdir(parents=True, exist_ok=True)
    arch_text = (arch.read_text(encoding="utf-8") if arch.is_file()
                 else new_archive(title, blurb, cap_val, today))
    inversions_before = _inversions(arch_text)
    # Captured from the ORIGINAL bytes, before a single write, by the verifier's own scanner.
    heads_before = _heads(live.read_text(encoding="utf-8")) + _heads(arch_text)
    a_pre, a_entries, a_tail = split_entries(arch_text)
    # Moved entries are older than what stays live and newer than what is already archived, so they
    # go on TOP of the archive. Rules 11a/13a make the alternative a hard ERROR.
    arch.write_text(a_pre.rstrip("\n") + "\n\n" + "".join(e.rstrip("\n") + "\n\n" for e in moving)
                    + "".join(a_entries).rstrip("\n") + "\n" + a_tail,
                    encoding="utf-8", newline="")
    live.write_text(preamble.rstrip("\n") + "\n\n"
                    + "".join(e.rstrip("\n") + "\n\n" for e in keeping)
                    + tail.lstrip("\n"), encoding="utf-8", newline="")
    return len(moving), _verify(live, arch, moving, keeping, inversions_before, heads_before)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description="Rotate an append-only log's oldest entries to its archive, verbatim.")
    ap.add_argument("--root", default=".", type=Path)
    ap.add_argument("--config", default=None, type=Path)
    ap.add_argument("--file", choices=[*LOGS, "all"], default="all")
    ap.add_argument("--write", action="store_true",
                    help="perform the move (default: print the plan and write nothing)")
    args = ap.parse_args(argv)
    root: Path = args.root.resolve()
    cfg = load_config(root, args.config, DEFAULTS)
    today = dt.date.today().isoformat()

    names = list(LOGS) if args.file == "all" else [args.file]
    total = 0
    problems: list[str] = []
    for name in names:
        rel_live, rel_arch, _, cite, _, _ = LOGS[name]
        live, _, moving, cap, _ = plan(root, name, cfg)
        if not live.is_file():
            print(f"  skip  {rel_live} — not present")
            continue
        if not moving:
            print(f"  OK    {rel_live} — within cap ({cap})")
            continue
        moved, bad = rotate(root, name, cfg, args.write, today)
        total += moved
        problems += bad
        verb = "moved" if args.write else "would move"
        print(f"  {verb} {moved} entry(ies) from {rel_live} -> {rel_arch}  [{cite}]")
        for e in moving:
            print(f"          {e.splitlines()[0][:88]}")

    for p in problems:
        print(f"ERROR verification: {p}")
    if problems:
        print("\ncpc-rotate: VERIFICATION FAILED — inspect `git diff` before doing anything else. "
              "The move is on disk; git is the undo.")
        return 1
    if not total:
        print("\ncpc-rotate: nothing to rotate -> OK")
        return 0
    if args.write:
        print(f"\ncpc-rotate: {total} entry(ies) rotated, content verified byte-for-byte. "
              "Review `git diff` — the move should be pure relocation.")
    else:
        print(f"\ncpc-rotate: {total} entry(ies) would rotate — re-run with --write.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
