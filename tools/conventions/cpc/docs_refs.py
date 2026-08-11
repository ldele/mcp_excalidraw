"""Reference extraction and resolution: what a document points at.

The concept: **turning prose into the set of things it references**, and deciding whether each one
resolves. Rules 4/4b/4c/4d in `docs_check` consume it forward ("does this target exist?") and
`docs_index` consumes it backward ("what points at this?"). They import the same functions rather
than each writing their own regex, because a forward gate and a reverse index that disagree about
what counts as a reference produce an index nobody can trust (ADR-031).

Stdlib-only (ADR-002): this travels in the vendored drop and must run on a bare interpreter.
"""
from __future__ import annotations

import posixpath
import re
from pathlib import Path, PurePosixPath

BACKTICK_RE = re.compile(r"`([^`]+)`")
# Spans that look like backtick routes but are not: a fenced block, and markdown's literal-backtick
# escape ``  `x`  ``. Both carry runs of backticks that leave a naive single-backtick scan one
# backtick out of phase for the rest of the file — see `code_spans`.
FENCE_RE = re.compile(r"^[ \t]*```.*?^[ \t]*```", re.M | re.S)
BACKTICK_ESCAPE_RE = re.compile(r"``[^\n]*?``")
INLINE_CODE_RE = re.compile(r"`[^`\n]*`")            # a single-backtick span, after the runs are gone
# A trailing `:136` / `:136-152` is a line reference, not part of the path. cpc's own SESSION
# template asks for "file:line where useful", so flagging the form it recommends is cpc's bug, not
# the author's — found on harper-fr the first time rule 4b reached a DEVLOG.
LINE_SUFFIX_RE = re.compile(r":\d+(?:-\d+)?$")
PATHISH_RE = re.compile(r"^[\w.\-/]+$")
LINK_RE = re.compile(r"\]\(([^)]+)\)")               # rule 4b: markdown [text](target)
ADR_CITE_RE = re.compile(r"\bADR-(\d{3,})\b(?!-)")   # rule 4c: bare ADR-NNN, not the ADR-NNN-slug form
# rule 4d: the compact co-citation form `ADR-002/015` — one reference naming two ADRs. Without this
# the trailing number is invisible, and a line that DOES name its successor reads as unmarked.
ADR_COCITE_RE = re.compile(r"\bADR-\d{3,}((?:/\d{3,})+)\b")


def code_spans(text: str) -> list[str]:
    """Every `backtick-delimited` span in `text`, fenced blocks and ``escapes`` removed first.

    Naively scanning for `` `([^`]+)` `` pairs the wrong backticks the moment a doc contains a run
    of them — markdown writes a literal backtick as ``  `x`  `` (four), and a fenced block opens
    and closes with three. Either leaves the scan one backtick out of phase, so every route after
    it in the file silently stops being seen: a gate that reports clean because its input never
    reached it. Stripping the runs first re-phases the scan.

    Shared by rule 4 and `docs_index`, which must agree on what counts as a route.
    """
    return BACKTICK_RE.findall(BACKTICK_ESCAPE_RE.sub(" ", FENCE_RE.sub(" ", text)))


def md_links(text: str) -> list[str]:
    """Every markdown `[text](target)` in `text`, code removed first.

    A link inside a fence *or an inline code span* is documentation about link syntax, not a link:
    both render as literal text, so neither is ever a real target. This is scribe's false-positive
    class 1, and dropping only the fenced half is not enough — cpc's own tree carries
    ``[text](target)`` in two documents that explain the rule, and both read as broken links.
    Rule 4 has been code-aware since `code_spans` existed; 4b scanned raw text, which stayed
    harmless only because its surface was small. Loosening, never tightening: a coded example can
    stop being a finding, never start.
    """
    stripped = INLINE_CODE_RE.sub(" ", BACKTICK_ESCAPE_RE.sub(" ", FENCE_RE.sub(" ", text)))
    return LINK_RE.findall(stripped)


def escapes_root(root: Path, src: Path, tgt: str) -> bool:
    """True when `tgt`, read relative to `src`, points outside the repo.

    `[GitHub Release](../../releases)` in a nested README is correct — the host resolves it against
    the repo, not the filesystem — and a gate that calls it broken is noisy on day one. Judged by
    path arithmetic only; nothing is read from disk.
    """
    try:
        rel = (src.parent / tgt).resolve().relative_to(root.resolve())
    except (ValueError, OSError):
        return True
    return rel.as_posix().startswith("..")


def link_token(tgt: str) -> str | None:
    """Normalise a markdown link target to a repo path, or None when it is not one.

    Drops a trailing `"title"` and any in-page `#anchor`; rejects anchors, absolute paths, URLs
    and angle-bracket forms. Shared by rule 4b and `docs_index` so the forward gate and the
    reverse index cannot disagree about what a link points at."""
    tgt = tgt.strip()
    if not tgt or tgt[0] in "#?/" or tgt.startswith(("http", "mailto:")) \
            or "<" in tgt or ">" in tgt:
        return None
    tgt = tgt.split()[0].split("#", 1)[0]
    tgt = LINE_SUFFIX_RE.sub("", tgt)      # `path/to/file.py:136` — a location, not a filename
    if not tgt or tgt.startswith("/"):
        return None
    # A bare word with neither a directory part nor an extension is not a path. It reaches here when
    # an UNBALANCED backtick puts the inline-code scan out of phase and leaks a coded example — the
    # phase failure `code_spans` documents for rule 4, seen in the wild as ``![cap](png)`` nested
    # inside a longer span. The cost is an extensionless same-directory target, which no repo here
    # has; the gain is not reporting `png` as a missing file.
    if "/" not in tgt and "." not in tgt:
        return None
    return tgt


def route_exists(root: Path, tok: str) -> bool:
    """A route/link target resolves if it exists, or if a `docs/X` ref resolves to `docs/archive/X`
    (so archiving a doc never breaks an append-only citation). Shared by rules 4 and 4b."""
    if (root / tok).exists():
        return True
    if tok.startswith("docs/"):
        return (root / tok.replace("docs/", "docs/archive/", 1)).exists()
    return False


def link_resolves(root: Path, src: Path, tgt: str) -> bool:
    """Rule 4b's resolution test: root-relative, source-relative, or pre-archive-relative.

    The third arm is ADR-009's redirect run backwards, and it is what makes the widened rule usable.
    ADR-009 covers a doc that *cites* something later archived; nothing covered a doc's own relative
    links after the doc itself was archived — the move puts it a directory deeper and every relative
    link is off by exactly that much. Measured 2026-08-08, that single move caused 2 of cpc's 3
    findings and all 9 of BlackBox's.

    The alternative was to re-base the links by hand, which for `docs/archive/DEVLOG-archive-*.md`
    means editing append-only history to satisfy a gate — the trade CONVENTIONS §2 refuses, and the
    same argument that keeps `CHANGELOG.md` on the route-exempt list.
    """
    if route_exists(root, tgt) or (src.parent / tgt).exists():
        return True
    rel = src.relative_to(root).as_posix()
    if "/archive/" in rel:
        pre_dir = PurePosixPath(rel.replace("/archive/", "/", 1)).parent
        # `route_exists`, not a bare `.exists()`, so the two redirects COMPOSE: an archived doc
        # citing a target that was itself later archived needs both (BlackBox's last finding was
        # exactly that). normpath first, or a `docs/../rules/x.py` candidate would never match the
        # forward redirect's `docs/` prefix test.
        return route_exists(root, posixpath.normpath((pre_dir / tgt).as_posix()))
    return False
