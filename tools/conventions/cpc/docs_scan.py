"""Scan surface and status-header reading for the doc gate.

The concept: **what is a governed document, and what does its header say.** Everything here answers
one of those two questions, and every rule in `docs_check` and every query in `docs_index` is built
on the answers. It is separated from the rules themselves so that the two surfaces cannot drift —
a gate and an index that disagree about which files are governed is the KI-5 failure, and a
predicate that disagrees with the reader classifying the same file is KI-7.

Stdlib-only (ADR-002): this travels in the vendored drop and must run on a bare interpreter.
"""
from __future__ import annotations

import re
from pathlib import Path

HEADER_RE = re.compile(r"status:\s*(active|superseded|archived)", re.I)
CLASS_RE = re.compile(r"class:\s*(append-only|living|disposable)", re.I)
# rule 1b: the optional topical axis. Reads to the end of the header comment or the next `·`
# separator, so `tags:` may sit anywhere in the header and carry a comma-separated list.
# Bounded to one line, and hyphens are legal in a tag value: an earlier `[^·\-]` class meant to
# stop before the `-->` terminator instead made the whole match fail on `tags: code-layout`, so a
# hyphenated tag silently erased the entire field — the valid tags beside it included.
TAGS_RE = re.compile(r"tags:\s*([^·\n]*?)\s*(?:·|-->|$)", re.I | re.M)
UPDATED_RE = re.compile(r"updated:\s*(\d{4}-\d{2}-\d{2})", re.I)
DATE_IN_NAME_RE = re.compile(r"(\d{4}-\d{2}-\d{2})")
# How far into a file a status header may sit. `header_of`, `tags_of` and `root_docs` MUST share
# this: a root doc admitted by one and unreadable by the others is governed for references while
# invisible to lifecycle, and renders with an empty status in docs/INDEX.md.
HEAD_LINES = 5


def header_line(text: str) -> str | None:
    """The doc's canonical status-header line, or None if it has none.

    ONE predicate decides what a status header is, and all three readers use it: `root_docs` admits
    on it, `header_of` and `tags_of` prefer it. Before that they disagreed — the opt-in matched a
    specific line while the classifiers took the first `status:`/`tags:` match anywhere in the head,
    so a banner carrying `status:` classified the doc beneath it and rule 7 could order
    `git mv` against a doc whose own header said `active` (KI-7).

    A canonical header is a **complete, single-line comment at column 0**, inside the leading run of
    comments and within `HEAD_LINES`, carrying **both** `status:` and `class:`. Blank lines separate
    comments; a multi-line block is walked *through* but never matched *inside* (a licence or SPDX
    banner is normally multi-line); any other content ends the run. Each condition is argued in
    `root_docs`.
    """
    banner = False                        # inside a multi-line leading comment
    for line in text.lstrip("﻿").splitlines()[:HEAD_LINES]:
        if banner:                        # skipped WHOLESALE and never matched
            banner = "-->" not in line
            continue
        if not line.strip():
            continue                      # blank lines separate comments; they do not end the run
        if not line.startswith("<!--"):
            return None                   # content — or an INDENTED comment — ends the leading run
        if (line.rstrip().endswith("-->") and line.count("<!--") == 1
                and HEADER_RE.search(line) and CLASS_RE.search(line)):
            return line
        banner = "-->" not in line        # an unterminated opener: what follows is inside it
    return None


def head_block(text: str) -> str:
    """The window every header field is read from — `status:`, `updated:` and `class:` alike.

    The canonical header line where there is one, else the historical first `HEAD_LINES` lines.
    The fallback is what makes the KI-7 fix safe: a doc whose header is not canonical is read
    exactly as before, so nothing that classifies correctly today can change.

    Takes text rather than a path because the rules that need it have already read the file, and
    because it is the same window `header_line` decides — one concept, one function. The rules used
    to inline the second half of this expression and never got the first: rules 7 and 12 spelled it
    `"\\n".join(text.splitlines()[:5])` and rule 4d spelled it `text[:400]`, so a banner above a
    real header still supplied their status, date and class after `header_of`/`tags_of`/`root_docs`
    had been fixed. KI-7 was resolved in the readers and open in the rules the record names as its
    victims — rule 7 ordering `git mv` against a doc whose own header says `active`.
    """
    return header_line(text) or "\n".join(text.splitlines()[:HEAD_LINES])


def header_of(p: Path) -> tuple[str | None, str | None]:
    """Return (status, updated_date), read from `head_block` — the shared header window."""
    try:
        text = p.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None, None
    head = head_block(text)
    s = HEADER_RE.search(head)
    u = UPDATED_RE.search(head)
    return (s.group(1).lower() if s else None), (u.group(1) if u else None)


def tags_of(p: Path) -> list[str]:
    """Return the header's `tags:` values, lowercased and de-duplicated in order.

    Empty when the field is absent — it is optional. Shared with `docs_index`, so the
    vault index and the gate can never disagree about what a doc is tagged.

    Read from the status-header comment only, not from the first N lines: prose is allowed to
    contain the word `tags:`, and a doc's body must never be able to invent a tag the gate then
    reports as unknown.
    """
    try:
        text = p.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return []
    # The canonical header where there is one, so the tags read here are the tags of the SAME line
    # `root_docs` admitted and `header_of` classified (KI-7). Otherwise the historical scan: the
    # status header, not merely the first comment — a doc may carry a leading `<!-- DESTINATION:
    # ... -->` or licence comment, and anchoring on that would read no tags at all.
    block = header_line(text)
    if block is None:
        head = "\n".join(text.splitlines()[:HEAD_LINES])
        block = next((c.group(0) for c in re.finditer(r"<!--.*?(?:-->|\Z)", head, re.S)
                      if "status:" in c.group(0).lower() or "tags:" in c.group(0).lower()), None)
    if block is None:
        return []
    m = TAGS_RE.search(block)
    if not m:
        return []
    out: list[str] = []
    for raw in m.group(1).split(","):
        t = raw.strip().lower()
        if t and t not in out:
            out.append(t)
    return out


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


def entry_file(root: Path) -> Path:
    """The canonical entry file: AGENTS.md (ADR-014) if present, else CLAUDE.md. In an
    AGENTS-canonical project CLAUDE.md is just the `@AGENTS.md` stub, so the content (and its routes,
    budget, glossary link) lives in AGENTS.md; a project that stayed CLAUDE.md-canonical falls back."""
    agents = root / "AGENTS.md"
    return agents if agents.exists() else root / "CLAUDE.md"


def root_docs(root: Path) -> list[Path]:
    """Root-level `*.md` carrying a status header — the opt-in for root-level governance (KI-5).

    Rules 1b/4/4b/4c/4d/7/12 all scanned `docs/**` + `.claude/**` only, so `CONVENTIONS.md` — the
    document consumers link to as the standard — went nine days with its `updated:` header behind
    its content while the gate reported 0/0 under `--strict`.

    The header is the opt-in, which is what makes widening safe: a `README.md` or `AGENTS.md`
    carrying none is invisible here, so this can never demand lifecycle governance of a file that
    never asked for it. Rule 1 (header REQUIRED) is deliberately not widened for the same reason —
    it would fire on exactly those files.

    Four conditions, and each one is load-bearing. A candidate line must:

    1. sit in the **leading run of comments** — blank lines separate them, any other content ends
       the run. Anchoring on the *first* comment instead would miss a doc opening with a licence or
       `<!-- markdownlint-disable -->` banner, silently ungoverning it; `tags_of` learned this the
       same way one commit earlier. A **multi-line** block is walked THROUGH but never matched
       inside: a copyright/SPDX header is the commonest thing to find above a status header and is
       almost always multi-line, so ending the run at its interior lines reintroduced exactly the
       silent miss this condition exists to prevent.
    2. be a **complete, single-line** comment, and everything under an unterminated opener is
       skipped wholesale rather than searched. Both halves guard the same accident: a leading block
       can have its `-->` supplied by a quotation several lines down, so prose *describing* this
       convention would opt the file in — and a README explaining cpc to a project adopting it is
       the likeliest file in the fleet to contain that prose. It would then be told to
       `git mv README.md docs/archive/`.
    3. carry **both** `status:` and `class:`. Requiring `class:` alone admits anything with the
       substring, `<!-- .banner { class: living; } -->` included, whose `header_of` is (None, None).
    4. start at **column 0**, and fall inside `HEAD_LINES`. An indented line is a markdown code
       block — a quotation, not a header — and a header past the window is one `header_of` cannot
       read, so admitting it would govern a doc no rule could then classify.
    """
    out: list[Path] = []
    for p in sorted(root.glob("*.md")):
        if not p.is_file() or in_embedded_tree(root, p):
            continue                      # a *directory* named `x.md` is legal, and read_text raises
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue                      # unreadable/locked — a scan surface is never curated
        if header_line(text) is not None:
            out.append(p)
    return out


def md_files(root: Path) -> list[Path]:
    """Rule 1's scan surface: every `*.md` under `docs/` and `.claude/`, embedded trees skipped.

    The embedded-tree filter here also covers rules 7 and 12, which reuse this list — one scan
    surface, one exclusion (doc_assistant KI-16)."""
    docs, claude = root / "docs", root / ".claude"
    out = list(docs.rglob("*.md")) if docs.exists() else []
    out += list(claude.rglob("*.md")) if claude.exists() else []
    return [f for f in out if not in_embedded_tree(root, f)]


def class_files(root: Path) -> list[Path]:
    """The class-derived surface: `md_files` plus root docs that opted in (KI-5).

    Rules 1b (tags), 7 (unarchived disposable) and 12 (living bump) read a doc's `class:`, so they
    govern any root-level doc that carries one. Rule 1 keeps the narrower `md_files` surface —
    requiring a header is exactly what a headerless root file must stay free of."""
    base = md_files(root)
    return base + [f for f in root_docs(root) if f not in base]
