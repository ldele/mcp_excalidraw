"""The reference rules: 4 (backtick routes), 4b (markdown links), 4c and 4d (ADR citations).

The concept: **does what a document points at still hold.** Four rules, one scan surface — the
entry files plus the root docs that opted in (KI-5) — because they answer four versions of the same
question and a surface that drifted between them would make three of the four lie.

Returns findings rather than appending to a caller's lists: shared mutable accumulators are the
parameter-mutation smell CONVENTIONS §12 names (dod-lint O003), and they are what let the old
single-function gate hide which rule produced which line.

Stdlib-only (ADR-002): this travels in the vendored drop and must run on a bare interpreter.
"""
from __future__ import annotations

import re
from pathlib import Path

from cpc.docs_refs import (ADR_CITE_RE, ADR_COCITE_RE, PATHISH_RE, code_spans, escapes_root,
                           link_resolves, link_token, md_links, route_exists)
from cpc.docs_scan import CLASS_RE, head_block, header_of, in_embedded_tree, is_exempt, root_docs


def route_sources(root: Path, cfg: dict) -> list[Path]:
    """The reference surface: every `CLAUDE.md`, `.claude/*.md`, `AGENTS.md`, plus opted-in root docs.

    `[routes] exempt` drops a *source* whose recorded paths are historical (KI-5). Applied here for
    root docs and, since 2026-08-07, to rule 4d's `docs/**` half as well — a generated doc such as
    `docs/DIGEST.md` reproduces citations verbatim and cannot annotate them without ceasing to be a
    faithful derivation. It deliberately does not reach rule 12: a file committed without bumping
    its date is still drift, exempt or not."""
    claude = root / ".claude"
    out = [p for p in root.rglob("CLAUDE.md") if not in_embedded_tree(root, p)]
    out += list(claude.glob("*.md")) if claude.exists() else []
    agents_entry = root / "AGENTS.md"        # ADR-014: the entry file's routes/links move here from
    if agents_entry.exists():                # the (now-stub) CLAUDE.md — keep them under the route gate
        out.append(agents_entry)
    route_exempt = cfg["routes"].get("exempt", [])
    out += [f for f in root_docs(root)
            if f not in out and not is_exempt(f.relative_to(root).as_posix(), route_exempt)]
    return out


def docs_link_sources(root: Path, cfg: dict, already: list[Path]) -> list[Path]:
    """`docs/**/*.md` minus what the first tier already scanned and minus `[routes] exempt`.

    Same exempt list as rule 4d's `docs/**` half, for the same reason: a generated doc reproduces
    its source's links verbatim and cannot annotate them without ceasing to be a derivation."""
    docs = root / "docs"
    if not docs.is_dir():
        return []
    seen = {p.resolve() for p in already}
    exempt = cfg["routes"].get("exempt", [])
    return [p for p in sorted(docs.rglob("*.md"))
            if p.resolve() not in seen
            and not in_embedded_tree(root, p)
            and not is_exempt(p.relative_to(root).as_posix(), exempt)]


def broken_links(root: Path, src: Path, text: str, allow_missing: list[str],
                 seen: set[tuple[str, str]]) -> list[str]:
    """Rule 4b for one file: every markdown link whose target resolves neither way.

    A link resolves if it exists repo-root-relative (archive-redirect aware) OR relative to the
    source's own directory — the natural form for a module `CLAUDE.md` linking a sibling. Skipped:
    externals, anchors, queries, absolute app routes, `<placeholders>` (all via `link_token`),
    `allow_missing` entries, and targets that leave the repo (a host-resolved `../../releases`).
    """
    out: list[str] = []
    rel_src = src.relative_to(root).as_posix()
    for raw in md_links(text):
        tgt = link_token(raw)                      # drops a `"title"` and any in-page #anchor
        if tgt is None:
            continue
        key = (rel_src, "link:" + tgt)
        if key in seen:
            continue
        seen.add(key)
        if is_exempt(tgt, allow_missing) or escapes_root(root, src, tgt):
            continue
        if not link_resolves(root, src, tgt):
            out.append(f"[link] {rel_src} -> missing ({tgt})")
    return out


def check(root: Path, cfg: dict) -> tuple[list[str], list[str]]:
    """Run rules 4, 4b, 4c and 4d. Returns (errors, warns)."""
    errors: list[str] = []
    warns: list[str] = []
    docs = root / "docs"

    # 4. broken routes
    exts = tuple(cfg["routes"]["extensions"])
    allow_missing = cfg["routes"].get("allow_missing", [])
    sources = route_sources(root, cfg)
    check_links = cfg["routes"].get("check_md_links", True)
    seen: set[tuple[str, str]] = set()
    for src in sources:
        text = src.read_text(encoding="utf-8", errors="ignore")
        rel_src = src.relative_to(root).as_posix()
        # 4. backtick path routes: `docs/x.md` must resolve (archive-redirect aware). The redirect
        #    lets append-only history (SESSION/DEVLOG) cite a doc later archived without breaking.
        for tok in code_spans(text):
            tok = tok.strip()
            if "<" in tok or ">" in tok or " " in tok or tok.startswith("http"):
                continue
            if not PATHISH_RE.match(tok) or "/" not in tok:
                continue
            if not (tok.endswith(exts) or tok.endswith("/CLAUDE.md")):
                continue
            if tok.startswith("/"):  # API routes like /api/v1/, not files
                continue
            if is_exempt(tok, allow_missing):   # a consumer-repo / sibling-repo path, not ours
                continue
            key = (rel_src, tok)
            if key in seen:
                continue
            seen.add(key)
            if not route_exists(root, tok):
                errors.append(f"[route] {rel_src} -> missing `{tok}`")
        # 4b. markdown [text](target) link existence (SPEC-reference-validator) — opt-out via
        #     [routes] check_md_links. Skips externals, #anchors, ?queries, absolute app routes
        #     (`/api/v1`, same as the backtick gate above), and <placeholders>. A link resolves if
        #     its target exists repo-root-relative (archive-redirect aware, like the backtick gate)
        #     OR relative to the source file's own directory (the natural form for a module CLAUDE.md
        #     linking a sibling) — so it only fires on a target that exists neither way.
        if check_links:
            errors += broken_links(root, src, text, allow_missing, seen)

    # 4b, second tier — `docs/**` (KI-10). Rule 4c widened here under KI-5 and its siblings did not,
    # so most of every vault has never had its links checked: scribe audited its own and found 76
    # broken across 18 files, then built the rule cpc was missing. Measured 2026-08-08: cpc 3,
    # BlackBox 9, scribe 0 (it had already fixed all 76). One move causes nearly all of them —
    # archiving a doc puts it a directory deeper and nobody re-bases its relative links, which
    # ADR-009's redirect covers for a backtick route and for nothing else.
    #
    # WARN, not ERROR, and separately configurable: this surface carries years of history in every
    # consumer, and a widened rule that hard-fails a re-vendor is a rule that gets switched off.
    # cpc runs --strict on itself, so it still holds itself to zero.
    #
    # Rule 4 (backtick routes) deliberately does NOT widen. A markdown link is an explicit
    # navigational claim; a backticked path in a DEVLOG is as often illustrative — a fixture name in
    # an example is not a promise the file exists. The evidence covers links only.
    docs_mode = str(cfg["routes"].get("check_docs_links", "warn")).lower()
    if check_links and docs_mode != "off":
        sink = errors if docs_mode == "error" else warns
        for src in docs_link_sources(root, cfg, sources):
            sink += broken_links(root, src, src.read_text(encoding="utf-8", errors="ignore"),
                                 allow_missing, seen)

    # 4c. ADR citation existence (SPEC-reference-validator) — a bare `ADR-NNN` prose ref must
    #     resolve to a local docs/decisions/ADR-NNN-*.md. OPT-IN ([routes] check_adr_refs): a repo
    #     that cites another repo's ADRs (cpc cites claude-skills') would false-positive, so off by
    #     default. WARN, promoted to failure under --strict (same as the other warn-level checks).
    #     Scope = route_sources + docs/**/*.md, so it reaches opted-in ROOT docs too (KI-5) — 4c is
    #     the seventh widened rule, silent only because it ships off. The ADR-NNN-slug filename form
    #     is skipped (regex), so `ADR-000-template.md` and a `[..](docs/decisions/ADR-008-…md)`
    #     target never trip it.
    if cfg["routes"].get("check_adr_refs", False):
        local_adrs: set[str] = set()
        for d in (docs / "decisions", docs / "archive"):
            if d.exists():
                for f in d.rglob("ADR-*.md"):
                    m = re.match(r"ADR-(\d{3,})", f.name)
                    if m:
                        local_adrs.add(m.group(1))
        cite_sources = list(sources) + (list(docs.rglob("*.md")) if docs.exists() else [])
        seen_cite: set[tuple[str, str]] = set()
        for src in cite_sources:
            rel_src = src.relative_to(root).as_posix()
            for num in ADR_CITE_RE.findall(src.read_text(encoding="utf-8", errors="ignore")):
                if num in local_adrs or (rel_src, num) in seen_cite:
                    continue
                seen_cite.add((rel_src, num))
                warns.append(f"[citation] {rel_src} -> ADR-{num} not found")

    # 4d. superseded-ADR citation (finding 1 of the vault review) — a live doc that cites an ADR
    #     whose own header says superseded/archived, on a line that does not say so, presents a dead
    #     decision as current. Rule 4c cannot catch it: 4c resolves a citation to a FILE, and ADRs
    #     are append-only and superseded IN PLACE (rule 7 scopes archiving to class:disposable), so
    #     the file never moves and the citation stays "valid" forever. Measured on doc_assistant:
    #     ADR-005 superseded 2026-07-07, still cited by 12 docs, gate green — including a
    #     reader-facing explainer asserting the reversed default as current behaviour.
    #
    #     ON by default (see DEFAULTS): 4c's cross-repo false positive cannot occur here, because a
    #     foreign ADR-NNN has no local file and therefore no local header to be superseded.
    #     Line-scoped, not file-scoped: one doc legitimately mentions an ADR twice, once to record
    #     the supersession and once by mistake, and only the second is a finding.
    if cfg["routes"].get("check_superseded_refs", True):
        dead_adrs: dict[str, str] = {}
        local_live: set[str] = set()
        for d in (docs / "decisions", docs / "archive"):
            if not d.exists():
                continue
            for f in d.rglob("ADR-*.md"):
                m = re.match(r"ADR-(\d{3,})", f.name)
                if not m:
                    continue
                status, _ = header_of(f)
                if status in ("superseded", "archived"):
                    dead_adrs[m.group(1)] = status
                else:
                    local_live.add(m.group(1))
        if dead_adrs:
            # `sources` already had `[routes] exempt` applied; the docs/** half had not, so an
            # exempt entry naming a `docs/**` path did nothing here. Widened deliberately (not a
            # bug fix — `route_sources` documents the narrower scope): a GENERATED doc can reproduce
            # historical citations verbatim and cannot annotate them without ceasing to be a
            # faithful derivation, which is the same argument the key was created for. Rule 12 still
            # reaches every exempt file, so a stale `updated:` is still drift.
            route_exempt = cfg["routes"].get("exempt", [])
            cite_sources = list(sources) + [
                p for p in (docs.rglob("*.md") if docs.exists() else [])
                if not is_exempt(p.relative_to(root).as_posix(), route_exempt)]
            seen_dead: set[tuple[str, str, int]] = set()
            for src in cite_sources:
                rel_src = src.relative_to(root).as_posix()
                # docs/archive/** is history by definition — it is SUPPOSED to cite dead decisions.
                if rel_src.startswith("docs/archive/"):
                    continue
                # An ADR citing itself is not stale.
                self_m = re.match(r"docs/(?:decisions|archive)/ADR-(\d{3,})\b", rel_src)
                own = str(int(self_m.group(1))) if self_m else None
                # §2 lifecycle class decides whether a stale citation is even a defect, and the
                # test is POSITIVE: only a `class: living` (or disposable) doc claims to describe
                # current state. An append-only doc (ADR, DEVLOG) records what was true when it was
                # written and must NOT be edited later, so its citation of a since-superseded ADR is
                # history working correctly. A doc with no class header — `docs/specs/**` is
                # header-exempt by default — makes no currency claim either, so it is not judged;
                # inferring "living" from silence would fire the rule hardest exactly where the
                # project opted out of the header regime.
                # Measured on cpc: unscoped 22 findings -> 19 of them correct-as-written records.
                src_text = src.read_text(encoding="utf-8", errors="ignore")
                # Read the class from the SHARED header window (`head_block`), not from a private
                # `[:400]` slice. The slice was a third spelling of "the head" — 5 lines in rules
                # 7/12, 400 chars here, the canonical line in `header_of` — and the widest of the
                # three, so a leading banner carrying `class: append-only` silently excluded a
                # living doc from this rule (KI-7's shape, in the rules rather than the readers).
                cls_m = CLASS_RE.search(head_block(src_text))
                if (cls_m.group(1).lower() if cls_m else "") not in ("living", "disposable"):
                    continue
                src_lines = enumerate(src_text.splitlines(), 1)
                # Doc-level banner: a "superseded in part by ADR-NNN" note near the top governs
                # every citation below it. cpc's own SPEC-init-cli.md does exactly this, and
                # demanding the marker again on each line would be busywork, not rot-catching.
                if any("supersed" in ln.lower() for ln in src_text.splitlines()[:15]):
                    continue
                for lineno, line in src_lines:
                    low = line.lower()
                    if "supersed" in low:
                        continue
                    nums = ADR_CITE_RE.findall(line)
                    for tail in ADR_COCITE_RE.findall(line):
                        nums += [n for n in tail.split("/") if n]
                    # A line naming a still-live ADR alongside the dead one is a *considered*
                    # citation — "(ADR-002, retained by ADR-015)" cites the invariant ADR-015 kept.
                    # Supersession is partial in practice, and this is the signal that the author
                    # knew: they named the successor. Without it, the reader cannot tell.
                    if any(n in local_live for n in nums):
                        continue
                    for num in nums:
                        # Per OCCURRENCE, not per file: the fix is per line, and a once-per-file
                        # report turns one pass into N passes — fix a line, the next appears.
                        # The line number goes in the message because the doc gates carry no
                        # line field (findings.Finding: path-in-message, tree-level checkers).
                        if num not in dead_adrs or (rel_src, num, lineno) in seen_dead:
                            continue
                        if own is not None and int(num) == int(own):
                            continue
                        seen_dead.add((rel_src, num, lineno))
                        warns.append(
                            f"[superseded] {rel_src}:{lineno} -> ADR-{num} is {dead_adrs[num]}; "
                            f"name the superseding ADR on the citing line or repoint it"
                        )

    # 16. an accepted ADR must name what FAILS if its decision is violated.
    warns += check_enforced_by(root, cfg)
    return errors, warns


ACCEPTED_RE = re.compile(r"^-\s+\*\*Status:\*\*\s*accepted\b", re.M | re.I)
ENFORCED_RE = re.compile(r"^##\s+Enforced by\s*$", re.M)
NEXT_HEADING_RE = re.compile(r"^##\s", re.M)


def check_enforced_by(root: Path, cfg: dict) -> list[str]:
    """Rule 16 — an accepted ADR carries a non-empty `## Enforced by` section.

    The question an ADR should answer and mostly does not: *what breaks if someone violates this?*
    Three decisions in this repo asserted something for weeks with nothing able to fail — ADR-002's
    stdlib-only claim, ADR-013's `shell=False`, ADR-022's "never a gate" — and each was found by
    accident rather than by a check. The section makes the answer a required field, so the absence
    of enforcement becomes visible at authoring time instead of on the day it matters.

    **Presence, never truth.** This cannot tell whether the named test really constrains the
    decision, and it does not try: that is exactly ADR-007's presence/observance split, and the
    reason it is a WARN. "judgment — not enforceable" is a valid and common answer — the point is
    that it be *written down* rather than left ambiguous.

    OFF by default ([adr] require_enforced_by): switching it on retroactively demands a new section
    in every ADR a consumer already wrote, which is noise rather than a finding. cpc runs it ON.
    """
    if not cfg.get("adr", {}).get("require_enforced_by", False):
        return []
    warns: list[str] = []
    for p in sorted((root / "docs" / "decisions").glob("ADR-*.md")):
        # `ADR-000-template.md` and `ADR-000-pivot-template.md` are the blanks cpc-init lays; they
        # carry placeholder status lines and are not decisions.
        if "template" in p.name:
            continue
        text = p.read_text(encoding="utf-8", errors="ignore")
        if not ACCEPTED_RE.search(text):
            continue
        m = ENFORCED_RE.search(text)
        rel = p.relative_to(root).as_posix()
        if not m:
            warns.append(f"[enforced] {rel} is accepted but has no `## Enforced by` section — name "
                         f"the test or gate that fails if this decision is violated, or write "
                         f"\"judgment — not enforceable\" (rule 16)")
            continue
        rest = text[m.end():]
        nxt = NEXT_HEADING_RE.search(rest)
        if not (rest[: nxt.start()] if nxt else rest).strip():
            warns.append(f"[enforced] {rel} has an empty `## Enforced by` section (rule 16)")
    return warns
