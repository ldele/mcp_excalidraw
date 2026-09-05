#!/usr/bin/env python3
"""Reverse index over the docs vault: who points at each doc (ADR-031).

Owns: reference extraction, the docs/INDEX.md render, the --of query, drift check.
Not here: forward-link existence (docs_check rules 4/4b/4c/4d owns that).

Every reference rule in `docs_check` runs forward — does this target exist? The
question you ask *before* editing or superseding a doc is the reverse one, and
nothing could answer it. This builds that edge set once and renders it.

Reference forms are read from `docs_check` rather than re-declared: a second copy
of `ADR_CITE_RE` is exactly the duplication dod-lint's D-family rules exist to
catch, and a reverse index that disagreed with the forward gate would be worse
than no index.

stdlib only (Python 3.11+). Exit 1 when --check finds drift; 0 otherwise.
"""
from __future__ import annotations

import argparse
import datetime as dt
import re
import sys
from collections import defaultdict
from pathlib import Path

from cpc.docs_refs import ADR_CITE_RE, LINK_RE, PATHISH_RE, code_spans, link_token
from cpc.docs_scan import header_of, in_embedded_tree, root_docs, tags_of
from cpc.rotate import LOGS
from cpc._console import make_console_safe

INDEX_REL = "docs/INDEX.md"
WIKILINK_RE = re.compile(r"\[\[([^\]|#]+)")
TITLE_RE = re.compile(r"^#\s+(.+?)\s*$", re.M)
# Citers listed inline per doc. A vault index is for reading; the full edge list
# for one doc is what `--of` is for.
MAX_CITERS = 6

# The live logs whose oldest entries `cpc-rotate` moves to docs/archive/ once they pass their cap.
# Read from `rotate.LOGS` rather than listed here: that registry is what the rotation tool acts on,
# and a second spelling of "which files rotate" is the KI-5/KI-7 shape — two definitions that agree
# until one moves.
ROTATING_SOURCES = frozenset(live for live, *_rest in LOGS.values())


def cites_from_rotating_text(relpath: str) -> bool:
    """Is a citation written here scheduled to move out of the live vault?

    True for a rotating log and for anything already archived. Not for `CHANGELOG.md`, which is
    `class: living` and never rotates — a release note is a permanent home for a citation.
    """
    return relpath in ROTATING_SOURCES or relpath.startswith("docs/archive/")


def vault_docs(root: Path) -> list[Path]:
    """Every markdown doc in the vault: docs/** and .claude/**, plus opted-in root docs.

    Root-level docs join on the same terms the gates use (KI-5) — `docs_check.root_docs`, so the
    vault and the checks can never disagree about what a governed doc is. Without them
    `CONVENTIONS.md`, the document consumers link to as the standard, was absent from the index,
    from `--of` and from `--tag`: the reverse-lookup ADR-031 exists to provide could not answer
    the one question most worth asking before superseding anything.

    The index excludes itself. Including it would make the artifact unstable: it lands
    unreferenced, the next render counts one more doc and one more orphan, and --check
    reports drift forever on a file nobody edited.
    """
    index = (root / INDEX_REL).resolve()
    out: list[Path] = []
    for base in (root / "docs", root / ".claude"):
        if not base.exists():
            continue
        out += [p for p in base.rglob("*.md")
                if not in_embedded_tree(root, p) and p.resolve() != index]
    out += [p for p in root_docs(root) if p.resolve() != index]
    # Sort by the POSIX string, never by Path. `sorted()` on Path uses PureWindowsPath's
    # CASE-INSENSITIVE comparison on Windows and PurePosixPath's case-sensitive one on Linux,
    # so the same vault produced two different committed artifacts and `--check` failed on
    # whichever platform did not generate it. Measured: `docs/DEVLOG.md` sorts before
    # `docs/decisions/…` on Linux and after it on Windows.
    return sorted(set(out), key=Path.as_posix)


def adr_number(p: Path) -> str | None:
    m = re.match(r"ADR-(\d{3,})", p.name)
    return m.group(1) if m else None


def references(src: Path, root: Path, by_name: dict[str, Path],
               by_adr: dict[str, Path]) -> set[Path]:
    """Resolve every outbound reference in `src` to a vault doc.

    Four forms, all already understood by the forward gate: markdown links,
    backtick routes, bare ADR-NNN citations, and `[[wikilinks]]`. A reference that
    resolves to nothing is not this tool's problem — docs_check reports those.
    """
    text = src.read_text(encoding="utf-8", errors="ignore")
    hits: set[Path] = set()

    def resolve(tok: str) -> None:
        tok = tok.split("#")[0].split("?")[0].strip()
        if not tok or tok.startswith(("http://", "https://", "mailto:")):
            return
        cand = (src.parent / tok) if not tok.startswith("/") else (root / tok.lstrip("/"))
        cands = [cand, root / tok]
        if tok.startswith("docs/"):
            # The archive redirect the forward gate already honours (`route_exists`), so a
            # citation of a since-archived doc counts as the edge docs_check accepts.
            cands.append(root / tok.replace("docs/", "docs/archive/", 1))
        for p in cands:
            try:
                rp = p.resolve()
            except OSError:
                continue
            if rp.is_file() and rp.suffix == ".md":
                hits.add(rp)
                return
        # Bare filename or wikilink stem, e.g. [[ADR-013-derived-artifact-regen]]. Only for a
        # token carrying no path: one that names a directory and did not resolve is a *broken*
        # reference for docs_check to report, not an edge to a same-named doc somewhere else.
        if "/" in tok:
            return
        stem = Path(tok).name
        for key in (stem, stem + ".md"):
            if key in by_name:
                hits.add(by_name[key].resolve())
                return

    for raw in LINK_RE.findall(text):
        tgt = link_token(raw)          # same normalisation rule 4b applies: `"title"`, #anchor
        if tgt is not None:
            resolve(tgt)
    for tok in WIKILINK_RE.findall(text):
        resolve(tok)
    for tok in code_spans(text):
        tok = tok.strip()
        if tok.endswith(".md") and PATHISH_RE.match(tok):
            resolve(tok)
    for num in ADR_CITE_RE.findall(text):
        if num in by_adr:
            hits.add(by_adr[num].resolve())

    hits.discard(src.resolve())          # a doc citing itself is not an inbound edge
    return hits


def build(root: Path) -> tuple[dict[Path, set[Path]], list[Path]]:
    """Return ({doc -> set of docs citing it}, all docs). The reverse index."""
    docs = vault_docs(root)
    by_name = {p.name: p for p in docs}
    by_adr: dict[str, Path] = {}
    for p in docs:
        n = adr_number(p)
        if n:
            by_adr.setdefault(n, p)

    inbound: dict[Path, set[Path]] = {p.resolve(): set() for p in docs}
    for src in docs:
        for tgt in references(src, root, by_name, by_adr):
            if tgt in inbound:
                inbound[tgt].add(src.resolve())
    return inbound, docs


def title_of(p: Path) -> str:
    m = TITLE_RE.search(p.read_text(encoding="utf-8", errors="ignore"))
    return m.group(1).strip() if m else p.stem


def render(root: Path, inbound: dict[Path, set[Path]], docs: list[Path]) -> str:
    """Render the index body (everything below the status header)."""
    rel = lambda p: p.relative_to(root).as_posix()          # noqa: E731 - local shorthand
    groups: dict[str, list[Path]] = defaultdict(list)
    for p in docs:
        groups[Path(rel(p)).parent.as_posix()].append(p)      # posix: goldens must match on Windows

    out: list[str] = [
        "# Vault index",
        "",
        "Generated by `cpc-docs-index --write` — do not edit by hand. Regenerate after adding,",
        "renaming, or removing a doc; `cpc-docs-index --check` fails when this file has drifted.",
        "",
        "**In** counts the vault docs that reference this one — markdown links, backtick routes,",
        "bare `ADR-NNN` citations, and `[[wikilinks]]`. Read it before superseding or renaming:",
        "it is the list of documents that will be wrong afterwards.",
        "",
    ]

    orphans = [p for p in docs
               if not inbound[p.resolve()] and not rel(p).startswith("docs/archive/")]
    # Cited, but only from text that rotates away. Disjoint from `orphans` by construction: these
    # have at least one citation, which is exactly why the Unreferenced list can never name them.
    log_only = [p for p in docs
                if inbound[p.resolve()] and not rel(p).startswith("docs/archive/")
                and all(cites_from_rotating_text(rel(c)) for c in inbound[p.resolve()])]
    total_edges = sum(len(v) for v in inbound.values())
    by_tag: dict[str, list[Path]] = defaultdict(list)
    for p in docs:
        for t in tags_of(p):
            by_tag[t].append(p)
    tagged = sum(1 for p in docs if tags_of(p))
    out += [f"**{len(docs)} docs · {total_edges} references · {len(orphans)} unreferenced "
            f"· {len(log_only)} cited only from rotating logs · {tagged} tagged.**", ""]

    if by_tag:
        out += ["## By tag", "",
                "The topical axis (ADR-032). `cpc-docs-index --tag <name>` lists one.", "",
                "| Tag | Docs |", "|---|---|"]
        for t in sorted(by_tag):
            out.append(f"| `{t}` | " + ", ".join(f"`{rel(p)}`" for p in sorted(by_tag[t], key=Path.as_posix)) + " |")
        out.append("")

    if orphans:
        out += ["## Unreferenced", "",
                "Nothing in the vault points at these. That is correct for an entry point and a",
                "symptom for anything else — a doc no one links is a doc no one reads.", ""]
        out += [f"- `{rel(p)}`" for p in orphans]
        out.append("")

    if log_only:
        out += ["## Cited only from rotating logs", "",
                "Every citation of these sits in a log whose oldest entries `cpc-rotate` moves to",
                "`docs/archive/` once it passes its cap. **`Unreferenced` above can never name them**:",
                "an archived citer still counts, so the reference total never reaches zero while the",
                "last live pointer quietly ages out. Cite one from a living doc, or accept that it is",
                "reachable only by search.", ""]
        out += [f"- `{rel(p)}` — {len(inbound[p.resolve()])} citation(s), "
                + ", ".join(f"`{c}`" for c in sorted(rel(c) for c in inbound[p.resolve()])[:MAX_CITERS])
                for p in log_only]
        out.append("")

    for gname in sorted(groups):
        title = "(repo root)" if gname == "." else f"`{gname}/`"
        out += [f"## {title}", "", "| Doc | Status | In | Referenced by |", "|---|---|---|---|"]
        for p in sorted(groups[gname], key=lambda q: q.name):
            status, _ = header_of(p)
            citers = sorted(rel(c) for c in inbound[p.resolve()])
            shown = ", ".join(f"`{c}`" for c in citers[:MAX_CITERS])
            if len(citers) > MAX_CITERS:
                shown += f", +{len(citers) - MAX_CITERS} more"
            out.append(f"| [`{p.name}`]({Path(rel(p)).name if gname == 'docs' else '../' + rel(p)}) "
                       f"| {status or '—'} | {len(citers)} | {shown or '—'} |")
        out.append("")

    return "\n".join(out).rstrip("\n") + "\n"


def mermaid_id(rel: str) -> str:
    """A Mermaid-safe node id. Path separators, dots and dashes all break the parser."""
    return "n_" + re.sub(r"[^0-9A-Za-z]", "_", rel)


def mermaid_label(text: str) -> str:
    """Quote a node label so a doc title cannot break the graph.

    Titles here routinely carry backticks, em-dashes, parentheses and quotes. Mermaid
    takes a double-quoted label, so the only character that must go is the double
    quote itself; brackets are escaped because they close a node shape.
    """
    return (text.replace('"', "'").replace("[", "(").replace("]", ")")
                .replace("`", "").strip())


def render_map(root: Path, tag: str, inbound: dict[Path, set[Path]],
               docs: list[Path]) -> list[str]:
    """Render one tag's docs as a Mermaid graph. Cluster-scoped by design (ADR-033).

    Nodes are the docs carrying `tag`; edges are references *among* them. References
    crossing the cluster boundary are counted, not drawn — drawing them pulls in the
    rest of the vault, which is the hairball this mode exists to avoid.
    """
    members = sorted((p for p in docs if tag in tags_of(p)), key=Path.as_posix)
    mset = {p.resolve() for p in members}
    rel = lambda p: p.relative_to(root).as_posix()          # noqa: E731

    inside: list[tuple[str, str]] = []
    crossing = 0
    for tgt, srcs in inbound.items():
        for src in srcs:
            if tgt in mset and src in mset:
                inside.append((rel(src), rel(tgt)))
            elif tgt in mset or src in mset:
                crossing += 1

    out = ["```mermaid", "graph LR"]
    for p in members:
        r = rel(p)
        out.append(f'  {mermaid_id(r)}["{mermaid_label(p.name)}"]')
    for src, tgt in sorted(set(inside)):
        out.append(f"  {mermaid_id(src)} --> {mermaid_id(tgt)}")
    out.append("```")
    out.append("")
    out.append(f"{len(members)} docs · {len(set(inside))} references inside the cluster "
               f"· {crossing} crossing its boundary (not drawn).")
    return out


def vault_updated(docs: list[Path]) -> str:
    """The index's `updated:` date, derived from the vault instead of the calendar.

    The newest `updated:` among the docs being indexed. This is what makes the artifact
    **fully deterministic**: two runs over the same tree produce byte-identical files on any day,
    which is the property a generated, committed, drift-checked artifact needs and the reason
    `--check` can compare the whole file rather than skipping the header.

    It is also honest: the index is current as of the newest document it describes. `docs/INDEX.md`
    excludes itself from the vault, so its own date can never feed back into its input.

    Falls back to today only when no indexed doc carries a date — a vault with no governed headers,
    where there is nothing for the index to be stale against.
    """
    dates = [u for _, u in (header_of(p) for p in docs) if u]
    return max(dates) if dates else dt.date.today().isoformat()


def main(argv: list[str] | None = None) -> int:
    make_console_safe()   # KI-9: never crash echoing text cpc did not write
    ap = argparse.ArgumentParser(description="Reverse index over the docs vault (ADR-031).")
    ap.add_argument("--root", default=".", type=Path)
    ap.add_argument("--of", metavar="DOC",
                    help="print what references DOC (a path, filename, or ADR-NNN) and exit")
    ap.add_argument("--tag", metavar="TAG",
                    help="print the docs carrying TAG and exit; `--tag a,b` intersects (AND), "
                         "which is how an over-cap cluster is narrowed without splitting it; "
                         "bare --tag=? lists the tags in use")
    ap.add_argument("--map", metavar="TAG",
                    help="render TAG's docs as a Mermaid graph and exit (ADR-033); nothing is written")
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="fail if docs/INDEX.md has drifted (default)")
    mode.add_argument("--write", action="store_true", help="regenerate docs/INDEX.md in place")
    args = ap.parse_args(argv)
    root: Path = args.root.resolve()

    inbound, docs = build(root)
    if not docs:
        print("cpc-docs-index: no vault docs -> OK (nothing to do)")
        return 0

    if args.map:
        want = args.map.strip().lower()
        in_use = {t for p in docs for t in tags_of(p)}
        if want not in in_use:
            print(f"cpc-docs-index: no doc carries tag {want!r} "
                  f"(in use: {', '.join(sorted(in_use)) or 'none'})", file=sys.stderr)
            return 1
        for line in render_map(root, want, inbound, docs):
            print(line)
        return 0

    if args.tag:
        by_tag: dict[str, list[Path]] = defaultdict(list)
        for p in docs:
            for t in tags_of(p):
                by_tag[t].append(p)
        if args.tag == "?":
            if not by_tag:
                print("cpc-docs-index: no doc carries a `tags:` header field")
                return 0
            for t in sorted(by_tag):
                print(f"{t:20} {len(by_tag[t])}")
            return 0
        # `--tag a,b` intersects (AND). Measured 2026-08-07: `process` 24, `gates` 21, `docs` 21 —
        # all three over the 12-file read-set cap this repo calibrated from real sprints, and all
        # three growing. But every intersection among them fits it (`docs`+`gates` 7,
        # `docs`+`process` 8, `gates`+`process` 7), and 16 of 21 `gates` docs already carry a second
        # tag. The vocabulary is already two axes — a KIND (gates, process) and a SUBJECT (docs,
        # sprint, init, packaging, testing, layout) — and the retrieval failure was never cluster
        # size; it was that the query could only name one axis. `gates` returning 21 narrows
        # nothing, which is exactly the research note's argument; `gates,docs` returning 7 narrows
        # plenty. Intersecting is therefore the cheaper answer than splitting the vocabulary: no tag
        # is renamed, no doc header is touched, and the 14 edits blocked behind "what do the three
        # split into?" stop being blocked by a question that did not need answering.
        wants = [t.strip().lower() for t in args.tag.split(",") if t.strip()]
        unknown = [t for t in wants if t not in by_tag]
        if not wants or unknown:
            print(f"cpc-docs-index: no doc carries tag {', '.join(map(repr, unknown)) or '(none given)'} "
                  f"(in use: {', '.join(sorted(by_tag)) or 'none'})", file=sys.stderr)
            return 1
        hits = set(by_tag[wants[0]])
        for t in wants[1:]:
            hits &= set(by_tag[t])          # AND, not OR: a filter's job is to narrow
        if not hits:
            print(f"cpc-docs-index: no doc carries all of {', '.join(wants)} "
                  f"(individually: {', '.join(f'{t} {len(by_tag[t])}' for t in wants)})",
                  file=sys.stderr)
            return 1
        for p in sorted(hits, key=Path.as_posix):
            print(p.relative_to(root).as_posix())
        return 0

    if args.of:
        # Matched on whole path segments, never a bare suffix: `endswith("x.md")` also matches
        # `ADR-013-x.md`, and this is the query ADR-031 tells you to trust before superseding a
        # doc — a confident answer about the wrong document is worse than no answer. A backslash
        # path (what Windows pastes back) normalises to the posix form the tool prints.
        want = args.of.strip().replace("\\", "/")
        want = want[2:] if want.startswith("./") else want   # a prefix, not `lstrip`'s char set:
        #                                                      `.claude/x.md` must keep its dot
        matches = []
        for p in docs:
            n = adr_number(p)
            rel = p.relative_to(root).as_posix()
            if (p.name == want or p.stem == want or rel == want or rel.endswith("/" + want)
                    or (n and want.upper() in (f"ADR-{n}", f"ADR-{int(n)}"))):
                matches.append(p)
        if not matches:
            print(f"cpc-docs-index: no vault doc matches {want!r}", file=sys.stderr)
            return 1
        if len(matches) > 1:
            print(f"cpc-docs-index: {want!r} matches {len(matches)} docs — name one:",
                  file=sys.stderr)
            for p in sorted(matches, key=Path.as_posix):
                print(f"  {p.relative_to(root).as_posix()}", file=sys.stderr)
            return 1
        target = matches[0]
        citers = sorted(c.relative_to(root).as_posix() for c in inbound[target.resolve()])
        rel_t = target.relative_to(root).as_posix()
        status, _ = header_of(target)
        print(f"{rel_t}  [{status or 'no header'}]  <- {len(citers)} reference(s)")
        for c in citers:
            print(f"  {c}")
        return 0

    body = render(root, inbound, docs)
    out_path = root / INDEX_REL
    # The WHOLE file is a pure function of the vault — header included (see vault_updated). So the
    # comparison below is over the whole file, and "already current" means every byte matches,
    # not "every byte except the date". The old calendar-stamped header made that impossible and
    # deadlocked rule 12: a stale date could not be cleared by --write, and the file's own header
    # forbids hand-editing it.
    want = f"<!-- status: active · updated: {vault_updated(docs)} · class: living -->\n\n" + body

    if args.write:
        if out_path.exists() and out_path.read_text(encoding="utf-8") == want:
            print(f"cpc-docs-index: {INDEX_REL} already current -> OK")
            return 0
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(want, encoding="utf-8", newline="")
        print(f"cpc-docs-index: wrote {INDEX_REL} "
              f"({len(docs)} docs, {sum(len(v) for v in inbound.values())} references)")
        return 0

    if not out_path.exists():
        print(f"STALE {INDEX_REL} does not exist — run: cpc-docs-index --write", file=sys.stderr)
        return 1
    if out_path.read_text(encoding="utf-8") != want:
        print(f"STALE {INDEX_REL} has drifted — run: cpc-docs-index --write", file=sys.stderr)
        return 1
    print(f"cpc-docs-index: {INDEX_REL} is current -> OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
