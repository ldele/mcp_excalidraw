"""The history rules: 11 (baton), 13 (devlog), 14 (resolved known issues).

The concept: **a history file that grows without bound stops being read.** Three rules, one shape —
each governs a file whose entries accumulate, and each pairs an ordering invariant the file itself
declares with a size budget past which entries move to `docs/archive/`. Rotation is always on-call:
the gate flags, a human moves the text. A gate that rewrote an append-only file would be the one
thing the append-only class exists to forbid.

Rules 11 and 13 share `check_dated_log` because they are the same rule on two files; rule 14 differs
because `KNOWN_ISSUES.md` is `class: living`, so its archival is summarize-then-move rather than
verbatim rotation — and the summary is judgment, which is why the gate flags age and nothing else.

Stdlib-only (ADR-002): this travels in the vendored drop and must run on a bare interpreter.
"""
from __future__ import annotations

import datetime as dt
import re
from pathlib import Path

from cpc.docs_scan import text_of
from cpc.tokens import estimate_tokens

SESSION_ENTRY_RE = re.compile(r"^##\s+(\d{4}-\d{2}-\d{2})\b")  # rules 11/13: a dated `## ` log entry
RESOLVED_DATE_RE = re.compile(r"RESOLVED\D{0,3}(\d{4}-\d{2}-\d{2})")  # rule 14: (RESOLVED date) / [RESOLVED date]
SECTION_HEADING_RE = re.compile(r"^##(?!#)\s")  # any `## ` heading; `###` and deeper stay in-entry


def ends_entry(line: str) -> bool:
    """Whether *line* CLOSES the entry stream: a `## ` heading that carries no date.

    An entry runs to the next `## ` heading — dated or not. Rule 11a already says as much
    ("non-dated `## ` headings are not part of the sequence"), but only its ordering half acted on
    it, so everything below a trailing non-dated section was charged to whichever entry happened to
    sit last: a `## Older entries` pointer, a rotation note, an archive table. Two gates were wrong
    in the same way, and both symptoms mislead rather than fail loudly —

    * rule 13c warned that an entry was over its token budget and named an entry that **had not
      changed**, with a count that moved when something *below* it did;
    * `cpc-rotate` let that trailing section travel into the archive attached to the oldest entry,
      so the live file silently lost its own pointer.

    `###` and deeper are sub-headings *inside* an entry and must not close it — hence the `(?!#)`.
    """
    return bool(SECTION_HEADING_RE.match(line)) and not SESSION_ENTRY_RE.match(line)


def check_dated_log(path: Path, rel: str, tag: str, cap: int, archive_stem: str,
                    rule: str) -> tuple[list[str], list[str]]:
    """Shared body of rules 11 (baton, ADR-018) and 13 (devlog, ADR-023): an append-only,
    newest-first log of dated `## YYYY-MM-DD` entries. Ordering is the file's own declared
    invariant (ERROR, always on); the entry-count cap is the rotation budget (WARN, 0 = off).
    Rotation stays on-call — the gate flags, a human moves entries verbatim to the archive."""
    errors: list[str] = []
    warns: list[str] = []
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
    return errors, warns


def check_entry_size(path: Path, cfg: dict) -> list[str]:
    """Rule 13c — one DEVLOG entry over `[budgets] devlog_entry_max_tokens`.

    Rule 13b caps the file in ENTRIES; this caps an entry in TOKENS, and the pair exists because
    the two units disagreed badly. Measured here 2026-08-07: a 20-entry cap at a 940-token median
    permits ~18.8k tokens, while the entry context two files away is capped at 3000 and fires
    weekly. The largest single entry was 2,245 tokens — most of that budget in one log entry.

    Capping the entry rather than the file attacks the cause. A DEVLOG entry is meant to say what
    changed and why; when it needs 2000 tokens the reasoning has outgrown a log and belongs in an
    ADR or a research note, with the entry pointing at it. 0 = off, the token-cap precedent.
    """
    cap = int(cfg["budgets"].get("devlog_entry_max_tokens", 0) or 0)
    if cap <= 0:
        return []
    warns: list[str] = []
    heading, body = None, []
    def flush() -> None:
        if heading is None:
            return
        n = estimate_tokens("".join(body))
        if n > cap:
            warns.append(f"[devlog] docs/DEVLOG.md entry `{heading.strip()[:60]}` is ~{n} tokens "
                         f"> {cap} — say what changed and point at the ADR that holds the "
                         f"reasoning (rule 13c)")
    for ln in text_of(path).splitlines(keepends=True):
        if SESSION_ENTRY_RE.match(ln):
            flush()
            heading, body = ln, [ln]
        elif ends_entry(ln):
            # A non-dated `## ` closes the stream — see `ends_entry`. Without this the trailing
            # pointer section was charged to the last entry, so the warning named the wrong entry
            # and its token count moved when something below it did.
            flush()
            heading, body = None, []
        elif heading is not None:
            body.append(ln)
    flush()
    return warns


#: Rule 17: an index entry-line. A list item carrying a date — `- **2026-07-28** — <title>`. The
#: table rows some indexes open with (`| file | span | … |`) and the dates inside intro prose are
#: both excluded by requiring the line to START a list item, which is what an entry line is.
INDEX_ENTRY_RE = re.compile(r"^\s*[-*]\s+.*?(\d{4}-\d{2}-\d{2})")


def check_archive_index(root: Path) -> list[str]:
    """Rule 17 — when an archive index exists, it must account for every archived entry.

    **Why this is a gate and not a `cpc-rotate` feature.** An index is a *consumer* convention: cpc
    has none, and `LOGS` in `cpc-rotate` knows nothing about one. Teaching the mover to write index
    prose would mean teaching it one project's format, and it still would not catch the rotations
    done by hand before `cpc-rotate` existed — which is where the first known instance came from.
    A gate is format-agnostic and covers both paths, so the mover stays generic and the claim gets
    checked. `cpc-rotate` additionally prints a reminder at the moment it moves entries; that closes
    the "I forgot" half, and this closes the "nothing ever noticed" half.

    **Counted by date, not matched by title.** An index line habitually trims the tail of a long
    heading (`… (ADR-028 stage 1)` for `… (ADR-028 stage 1; the parallel track's other half)`), so
    substring matching reports healthy entries as missing — the first hand-written version of this
    check did exactly that and had to be thrown away. Per-date counts do not care how a title was
    shortened, and they still name the date to look at.

    Shortfalls only: an index with MORE dated list items than the archive holds is not flagged, since
    a project may legitimately list other things. False negatives are the safe direction for a rule
    whose failure mode is nagging about a correct file.

    WARN, not ERROR: consumers upgrade into this rule with archives already written, and an index
    they have not backfilled should not stop their build. `--strict` still makes it bite.
    """
    warns: list[str] = []
    archive_dir = root / "docs" / "archive"
    for stem in ("SESSION", "DEVLOG"):
        index = archive_dir / f"{stem}-INDEX.md"
        if not index.is_file():
            continue                      # no index = nothing claims completeness = nothing to check
        archived: dict[str, int] = {}
        for arch in sorted(archive_dir.glob(f"{stem}-archive-*.md")):
            for ln in text_of(arch).splitlines():
                if m := SESSION_ENTRY_RE.match(ln):
                    archived[m.group(1)] = archived.get(m.group(1), 0) + 1
        if not archived:
            continue
        indexed: dict[str, int] = {}
        for ln in text_of(index).splitlines():
            if m := INDEX_ENTRY_RE.match(ln):
                indexed[m.group(1)] = indexed.get(m.group(1), 0) + 1
        rel = f"docs/archive/{index.name}"
        if not indexed:
            # Deliberately its own message: reporting "N entries missing" here would be technically
            # true and useless, because the cause is the file's shape, not a forgotten line.
            warns.append(f"[archive-index] {rel} holds no entry lines this rule can read "
                         f"(a `- …YYYY-MM-DD…` list item) while {sum(archived.values())} entries "
                         f"sit in {stem}-archive-*.md — is the index in a different shape? (rule 17)")
            continue
        short = {d: n - indexed.get(d, 0) for d, n in archived.items() if n > indexed.get(d, 0)}
        if short:
            named = ", ".join(f"{d} ({n})" for d, n in sorted(short.items())[:4])
            more = f" +{len(short) - 4} more date(s)" if len(short) > 4 else ""
            warns.append(f"[archive-index] {rel} is missing {sum(short.values())} archived "
                         f"entry(ies) — by date: {named}{more}. Every rotated entry needs a line "
                         f"(rule 17)")
    return warns


def check(root: Path, cfg: dict, today: dt.date) -> tuple[list[str], list[str]]:
    """Run rules 11, 13, 14 and 17. Returns (errors, warns)."""
    errors: list[str] = []
    warns: list[str] = []
    docs, claude = root / "docs", root / ".claude"

    # 11. baton (ADR-018 D1). Governs .claude/SESSION.md when present. 11a enforces the file's own
    #     declared "newest entry on top" invariant — dated `## ` entries must be non-increasing
    #     top-to-bottom (ERROR, always on, like rule 1). Non-dated `## ` headings (e.g. an intro or
    #     a "Session start" note) are not part of the sequence and are skipped. 11b is the rotation
    #     budget: entry count over [budgets] session_max_entries warns (0 = off, the token-cap
    #     precedent). Rotation is on-call — the gate flags; a human moves entries to the archive.
    session = claude / "SESSION.md"
    if session.exists():
        e, w = check_dated_log(session, ".claude/SESSION.md", "baton",
                               int(cfg["budgets"].get("session_max_entries", 0) or 0),
                               "SESSION", "11")
        errors += e
        warns += w

    # 13. devlog (ADR-023). The same two invariants as the baton, applied to docs/DEVLOG.md — the
    #     other append-only, newest-first log that grows without bound on a long project. 13a is the
    #     ordering ERROR (always on); 13b warns past [budgets] devlog_max_entries (0 = off) — rotate
    #     the oldest entries VERBATIM to docs/archive/DEVLOG-archive-NNN.md; the live file keeps a
    #     one-line pointer to the archive so the trail stays discoverable.
    devlog = docs / "DEVLOG.md"
    if devlog.exists():
        e, w = check_dated_log(devlog, "docs/DEVLOG.md", "devlog",
                               int(cfg["budgets"].get("devlog_max_entries", 0) or 0),
                               "DEVLOG", "13")
        errors += e
        warns += w
        warns += check_entry_size(devlog, cfg)

    # 11a/13a on the ARCHIVES as well (KI-8). Each archive repeats "Newest entry on top." in its own
    # intro and nothing read it, so rotations done by hand before `cpc-rotate` existed drifted the
    # order with no signal — 3 inversions across 126 archived entries when this was written. The
    # ordering half only: an archive IS the rotation destination, so an entry-count cap on it would
    # ask a human to rotate the rotation. `cpc-rotate` already inserts moved entries on top and its
    # own source comment claimed "rules 11a/13a make the alternative a hard ERROR" — which was true
    # of the live files and false of the archives it writes. This closes that gap.
    #
    # An explicit stem map, not a blanket glob: `KNOWN_ISSUES-archive-NNN.md` is the destination of
    # rule 14's summarize-then-move and holds `## KI-N` headings, not dated entries, so a glob would
    # scan a file whose headings this rule cannot read and report nothing forever.
    for arch in sorted((docs / "archive").glob("*-archive-*.md")):
        stem = arch.name.split("-archive-", 1)[0]
        rule, tag = {"SESSION": ("11", "baton"), "DEVLOG": ("13", "devlog")}.get(stem, (None, None))
        if rule is None:
            continue
        e, _ = check_dated_log(arch, f"docs/archive/{arch.name}", tag, 0, stem, rule)
        errors += e

    # 17. the archive index is complete (opt-in by existence). A consumer that keeps a
    #     `docs/archive/<STEM>-INDEX.md` is asserting it lists every rotated entry; nothing read it,
    #     so `cpc-rotate` archived entries and left the index short three times in eight days on one
    #     consumer — twice unnoticed for days, once caught only because the issue had just been
    #     written. No index = no claim = no finding, so cpc and every consumer without one are
    #     unaffected. See `check_archive_index` for why this is a gate rather than a rotate feature.
    warns += check_archive_index(root)

    # 14. resolved known issue still live (ADR-023). KNOWN_ISSUES.md is class:living, so its
    #     archival is summarize-then-move, not verbatim rotation: past the grace window a RESOLVED
    #     entry becomes one line in the file's `## Resolved index` (KI id, date, one-line summary,
    #     archive path) and the full entry moves to docs/archive/KNOWN_ISSUES-archive-NNN.md.
    #     The gate flags age only — the summary is judgment, so a human writes it (ADR-007 split).
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
                             f"but undated — date it so it can age out (rule 14)")
                continue
            try:
                age = (today - dt.date.fromisoformat(m.group(1))).days
            except ValueError:
                continue
            if age > ki_days:
                warns.append(f"[known-issue] .claude/KNOWN_ISSUES.md `{title}` resolved "
                             f"{age}d ago (> {ki_days}) — summarize it into the Resolved index and "
                             f"move the full entry to docs/archive/KNOWN_ISSUES-archive-NNN.md "
                             f"(rule 14)")
    return errors, warns
