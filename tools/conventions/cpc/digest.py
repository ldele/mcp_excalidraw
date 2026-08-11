#!/usr/bin/env python3
"""docs/DIGEST.md — the logs at a glance, derived from their headings.

  cpc-digest --root . [--check | --write]

**The problem.** Measured 2026-08-07: `docs/DEVLOG.md` is ~21.9k tokens and `.claude/KNOWN_ISSUES.md`
~2.6k, and the session-start read order asks for both. The convention says "newest 3 entries", which
costs ~10.7k against ~36.7k for reading them whole — but nothing enforces that at read time, and a
tool call that opens DEVLOG returns all of it. Meanwhile the entry context two files away is capped
at 3000 tokens and fires weekly.

**Why derived and not summarized.** An LLM-written précis is a second artifact that can drift from
its source and cannot be `--check`ed — it would be the first thing cpc ships that is allowed to
silently lie, which is the one property the whole repo exists to prevent. A digest built from
*headings only* is mechanical: regenerate it and either it matches or the source moved. That is the
same contract as `docs/INDEX.md` and `docs/SETTINGS.md` (ADR-013), and it is why this is registered
under `[generate]` rather than written by hand.

The cost of that choice, stated plainly: a heading-derived digest is only as good as the headings.
It cannot tell you *what* an entry concluded, only that the entry exists and what it was called.
That is a deliberate trade — it makes the digest cheap and un-lying, and it puts the pressure where
it belongs, on writing a heading that says something (rule 13c pushes the same way).

stdlib only (Python 3.11+).
"""
from __future__ import annotations
import argparse, datetime as dt, re, sys
from pathlib import Path

from cpc.tokens import estimate_tokens

DEFAULTS = {"digest": {"path": "docs/DIGEST.md", "devlog_entries": 20}}

ENTRY_RE = re.compile(r"^##\s+(\d{4}-\d{2}-\d{2})\s*[—-]?\s*(.*)$")
KI_RE = re.compile(r"^##\s+KI-(\d+)\b(.*)$")
# Measured across the fleet 2026-08-08 — FOUR heading dialects, not the two this file first assumed:
#   A  ## KI-7 (RESOLVED 2026-08-05) — title            cpc            leading parenthetical
#   B  ## KI-17 — title — FIXED in SPRINT-039 (dates)   BlackBox       trailing dash-segment
#   C  ## KI-2 — title (RESOLVED 2026-07-03)            harper-fr, jsm trailing parenthetical
#   D  ## KI-6 — title                                  cpc, others    no metadata at all
# All four keep the metadata in a DELIMITED region and never loose in the title, which is what makes
# them readable by one parser. Scanning the whole heading instead — what this did until 2026-08-08 —
# reads ordinary prose as metadata: BlackBox's "can't be fixed without breaking the build" was
# reported FIXED, and the word was deleted out of the title on the way past.
STATUS_RE = re.compile(r"\b(RESOLVED|FIXED|WONTFIX|DEFERRED|MITIGATED|OPEN)\b", re.I)
DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")
LEAD_PAREN_RE = re.compile(r"^\s*\(([^()]*)\)\s*")
TAIL_PAREN_RE = re.compile(r"\(([^()]*)\)\s*$")
# Em/en dash surrounded by spaces ONLY. A plain `-` occurs inside real titles (`--lib`, `--force`,
# "language-agnostic") and splitting on it eats them.
SEP_RE = re.compile(r"\s+[—–]\s+")
LABELLED_DATE_RE = re.compile(r"([A-Za-z]+)\s+(\d{4}-\d{2}-\d{2})")
CLOSED_STATUSES = {"RESOLVED", "FIXED", "WONTFIX"}
TITLE_TRIM = " —–·-"


def devlog_lines(root: Path, limit: int) -> list[str]:
    p = root / "docs" / "DEVLOG.md"
    if not p.is_file():
        return []
    out = []
    for ln in p.read_text(encoding="utf-8", errors="ignore").splitlines():
        m = ENTRY_RE.match(ln)
        if m:
            out.append(f"- **{m.group(1)}** — {m.group(2).strip()}")
        if len(out) >= limit:
            break
    return out


def split_ki_heading(rest: str) -> tuple[str, str]:
    """Split a `## KI-N …` heading tail into (title, metadata region).

    The metadata region is where a status/date may be read from; the title is never searched. See
    the dialect table above. A trailing parenthetical counts as metadata only when it holds a status
    or a date — harper-fr's `(2 tests ignored)` is part of its title and has to stay there.
    """
    lead = LEAD_PAREN_RE.match(rest)
    if lead:                                                    # dialect A
        return rest[lead.end():].strip(TITLE_TRIM), lead.group(1)
    meta: list[str] = []
    body = rest
    tail = TAIL_PAREN_RE.search(body)
    if tail and (STATUS_RE.search(tail.group(1)) or DATE_RE.search(tail.group(1))):
        meta.append(tail.group(1))                              # dialect C, and B's date half
        body = body[:tail.start()]
    parts = SEP_RE.split(body.strip(TITLE_TRIM))
    if len(parts) > 1 and STATUS_RE.search(parts[-1]):
        meta.append(parts[-1])                                  # dialect B's status half
        parts = parts[:-1]
    return " — ".join(parts).strip(TITLE_TRIM), " ".join(meta)


def pick_date(meta: str, status: str) -> str:
    """The date that belongs to `status`, from a metadata region that may carry several.

    `(found 2026-08-03 · fixed 2026-08-04)` on a FIXED issue means 2026-08-04; taking the first date
    reported the day it was found as the day it was fixed. When no label matches the status
    (`first … · recurred …` on an OPEN issue) the latest date wins — the most recent thing that
    happened is the useful one.
    """
    for label, date in LABELLED_DATE_RE.findall(meta):
        if label.upper() == status:
            return date
    found = DATE_RE.findall(meta)
    return found[-1] if found else ""


def clip(text: str, limit: int = 110) -> str:
    """Bound a title without cutting mid-word or leaving markdown open.

    A hard slice produced `…in SPRINT-039 (found` — a severed word and an unbalanced paren. Cutting
    on a space is most of the fix; re-closing an odd `**` is the rest, since one stray marker bolds
    every line after it in the rendered list.
    """
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0].rstrip(TITLE_TRIM + ",;:(")
    if not cut:
        cut = text[:limit].rstrip()
    if cut.count("**") % 2:
        cut += "**"
    return cut + "…"


def known_issues(root: Path) -> tuple[list[str], int, int]:
    """(lines, open_count, closed_count). Status comes from the heading — the reason the heading
    has to carry it. An issue whose heading names no status is reported as OPEN, because an
    unlabelled issue is one nobody has closed."""
    p = root / ".claude" / "KNOWN_ISSUES.md"
    if not p.is_file():
        return [], 0, 0
    lines, n_open, n_closed = [], 0, 0
    for ln in p.read_text(encoding="utf-8", errors="ignore").splitlines():
        m = KI_RE.match(ln)
        if not m:
            continue
        title, meta = split_ki_heading(m.group(2))
        st = STATUS_RE.search(meta)
        status = st.group(1).upper() if st else "OPEN"
        closed = status in CLOSED_STATUSES
        n_closed += closed
        n_open += not closed
        date = pick_date(meta, status)
        lines.append(f"- **KI-{m.group(1)}** · {status}{' ' + date if date else ''} — "
                     f"{clip(re.sub(r'\s{2,}', ' ', title))}")
    return lines, n_open, n_closed


def render(root: Path, cfg: dict, today: dt.date) -> str:
    limit = int(cfg.get("digest", {}).get("devlog_entries", 20) or 20)
    dl = devlog_lines(root, limit)
    ki, n_open, n_closed = known_issues(root)
    src_tokens = sum(estimate_tokens((root / f).read_text(encoding="utf-8", errors="ignore"))
                     for f in ("docs/DEVLOG.md", ".claude/KNOWN_ISSUES.md") if (root / f).is_file())
    body = [
        f"<!-- status: active · updated: {today.isoformat()} · class: living -->",
        "",
        "# DIGEST — the logs at a glance",
        "",
        "**Generated — do not edit.** `cpc-digest --write`. Derived from headings only, so it cannot",
        "drift from its sources without `cpc-generate --check` saying so.",
        "",
        "Read this at session start **instead of** `docs/DEVLOG.md` and `.claude/KNOWN_ISSUES.md`;",
        "open the full file only for the one entry you actually need.",
        "",
        f"## Known issues — {n_open} open, {n_closed} closed",
        "",
    ]
    body += ki or ["_None recorded._"]
    body += ["", f"## Recent work — newest {len(dl)} of `docs/DEVLOG.md`", ""]
    body += dl or ["_No entries._"]
    body += ["", "---", ""]
    digest_tokens = estimate_tokens("\n".join(body))
    body += [f"Sources total ~{src_tokens:,} tokens; this digest ~{digest_tokens:,}.",
             "Older entries: `docs/archive/`."]
    return "\n".join(body) + "\n"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Generate docs/DIGEST.md from the logs' headings.")
    ap.add_argument("--root", default=".", type=Path)
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="fail if DIGEST.md has drifted (default)")
    mode.add_argument("--write", action="store_true", help="regenerate DIGEST.md in place")
    args = ap.parse_args(argv)
    root: Path = args.root.resolve()

    try:
        from cpc._config import load_config
        cfg = load_config(root, None, DEFAULTS)
    except Exception:
        cfg = DEFAULTS
    out = root / cfg.get("digest", {}).get("path", "docs/DIGEST.md")
    fresh = render(root, cfg, dt.date.today())

    if args.write:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(fresh, encoding="utf-8", newline="")
        print(f"cpc-digest: wrote {out.relative_to(root).as_posix()}")
        return 0

    if not out.is_file():
        print(f"cpc-digest: {out.name} is missing -> regenerate: cpc-digest --write", file=sys.stderr)
        return 1
    # The `updated:` line is stamped with today's date, so comparing it would call the file stale
    # every morning for a body that never changed — the same trap `settings_doc` carries a
    # `_split_stamped` helper for. Compare everything BUT that line.
    def strip_stamp(t: str) -> str:
        return "\n".join(ln for ln in t.splitlines() if not ln.startswith("<!-- status:"))
    if strip_stamp(out.read_text(encoding="utf-8", errors="ignore")) != strip_stamp(fresh):
        print(f"cpc-digest: {out.name} has drifted -> regenerate: cpc-digest --write", file=sys.stderr)
        return 1
    print(f"cpc-digest: {out.name} is current -> OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
