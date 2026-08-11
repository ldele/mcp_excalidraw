"""The planning rules: 10 (prior art in PLAN.md) and 15/15c (the spec ledger at sprint activation).

The concept: **specificity decays late in a project**, when tasks start arriving as one-liners
against stale artifacts. Both rules put a floor under the moment work is committed to — a plan must
record what was already tried, and a started contract must name the executor brief whose open
questions have been walked to resolved-or-parked.

Both are opt-in and both check only that the interrogation *happened*. Whether a resolution is any
good is sprint-review's judgment, never a gate's — the ADR-007 split, applied.

Stdlib-only (ADR-002): this travels in the vendored drop and must run on a bare interpreter.
"""
from __future__ import annotations

import re
from pathlib import Path

from cpc.docs_scan import header_of, text_of

SPEC_REF_RE = re.compile(r"docs/specs/SPEC-[\w.\-]+\.md")  # rule 15: SPEC paths a contract names
STARTED_LINE_RE = re.compile(r"^- \*\*started:\*\*", re.M)  # rule 15: the activation stamp (ADR-019)
KEYPOINT_STAMP_RE = re.compile(r"^- \*\*keypoint:\*\* sprint-start\b", re.M)  # rule 15c: ritual ran green


def section_nonempty(text: str, title: str) -> bool:
    """True if a `## <title>` heading exists and has at least one non-blank, non-comment content
    line before the next `##`/`#` heading. Presence + non-empty only — whether a `<placeholder>`
    was actually filled is design-conformance's / deep-review's judgment call, not this gate's."""
    hdr = re.compile(rf"^##\s+{re.escape(title)}\s*$", re.I)
    started = False
    for ln in text.splitlines():
        srt = ln.strip()
        if not started:
            if hdr.match(srt):
                started = True
            continue
        if re.match(r"^#{1,2}\s", srt):   # next h1/h2 ends the section
            break
        if not srt or srt.startswith("<!--"):
            continue
        return True
    return False


def ledger_rows(text: str) -> list[tuple[str, str]] | None:
    """Rule 15: parse a SPEC's `## Open questions` table. None = no such section; else one
    (question, status) tuple per data row. The header row ('Question') and `---` separator are
    skipped; non-table lines (the familiarity bullet, comments) are ignored. Row *quality* — did
    a low-familiarity resolution cite a source — is judgment (sprint-review's), never parsed."""
    hdr = re.compile(r"^##\s+Open questions\s*$", re.I)
    rows: list[tuple[str, str]] = []
    started = False
    for ln in text.splitlines():
        srt = ln.strip()
        if not started:
            if hdr.match(srt):
                started = True
            continue
        if re.match(r"^#{1,2}\s", srt):   # next h1/h2 ends the section
            break
        if not srt.startswith("|"):
            continue
        cells = [c.strip() for c in srt.strip("|").split("|")]
        if len(cells) < 3 or cells[1].lower() == "question":
            continue
        if all(set(c) <= set("-: ") for c in cells):
            continue                       # the |---|---| separator row
        rows.append((cells[1], cells[2].lower()))
    return rows if started else None


def check(root: Path, cfg: dict, pre_stamp: bool) -> tuple[list[str], list[str]]:
    """Run rules 10, 15 and 15c. Returns (errors, warns) — both are ERROR-only today, but the
    pair is returned so the caller treats every rule module the same way."""
    errors: list[str] = []
    warns: list[str] = []
    docs = root / "docs"

    # 10. prior-art section in PLAN.md (opt-in [plan] require_prior_art, ADR-016). When on and
    #     docs/PLAN.md exists, it must carry a non-empty `## Prior art` block — the atlas /
    #     internal-reuse / external record iterative-planning writes at scope-lock. Silent when the
    #     toggle is off or PLAN.md is absent (a project not using the iterative-planning PLAN leaves
    #     it off). Presence + non-empty only; filled-vs-placeholder is design-conformance's call.
    if cfg["plan"].get("require_prior_art", False):
        plan = docs / "PLAN.md"
        if plan.exists() and not section_nonempty(text_of(plan), "Prior art"):
            errors.append("[plan] docs/PLAN.md missing a non-empty `## Prior art` section "
                          "([plan] require_prior_art) — record the atlas / internal-reuse / "
                          "external checks (iterative-planning §2.5)")

    # 15. spec ledger (opt-in [sprint] require_spec_ledger, ADR-027). Specificity decays late in
    #     a project — tasks arrive as one-liners against stale artifacts — so activation gains a
    #     floor: a STARTED active contract (ADR-019 stamp; roadmap_sync-materialized backlog rows
    #     are exempt) must name its executor brief(s), and each named SPEC's `## Open questions`
    #     ledger must be fully resolved-or-parked. The scoped grill (grill-me, keypoint
    #     sprint-start) fills the ledger; per ADR-007 this gate only checks the interrogation
    #     HAPPENED — resolution quality stays sprint-review's judgment.
    if cfg["sprint"].get("require_spec_ledger", False):
        sprints = docs / "sprints"
        for f in (sorted(sprints.glob("SPRINT-*.md")) if sprints.exists() else []):
            rel = f.relative_to(root).as_posix()
            if f.name.startswith("SPRINT-000"):        # the laid template is not a contract
                continue
            status, _ = header_of(f)
            ctext = text_of(f)
            if status != "active" or not STARTED_LINE_RE.search(ctext):
                continue
            # 15c (SPEC-keypoint-stamp): the activation ritual must have run green — the keypoint
            # writes this stamp on a green floor. A repo without the runner hand-writes the line
            # after running the floor itself. --pre-stamp = the keypoint's own floor run.
            if not pre_stamp and not KEYPOINT_STAMP_RE.search(ctext):
                errors.append(f"[spec] {rel} is started but carries no `- **keypoint:** "
                              f"sprint-start` stamp (rule 15c) — run `cpc-keypoint sprint-start` "
                              f"(no runner vendored? hand-write the stamp after a green "
                              f"`docs_check --strict --pre-stamp`)")
            specs = [s for s in sorted(set(SPEC_REF_RE.findall(ctext)))
                     if not s.endswith("SPEC-000-template.md")]
            if not specs:
                errors.append(f"[spec] {rel} is started but names no docs/specs/SPEC-*.md "
                              f"(rule 15) — the executor brief belongs in the contract (ADR-019)")
                continue
            for spec_rel in specs:
                spec = root / spec_rel
                if not spec.exists():
                    errors.append(f"[spec] {rel} -> missing `{spec_rel}` (rule 15)")
                    continue
                rows = ledger_rows(text_of(spec))
                if rows is None:
                    errors.append(f"[spec] {spec_rel} has no `## Open questions` ledger "
                                  f"(rule 15) — run the scoped grill before executing")
                elif not rows:
                    errors.append(f"[spec] {spec_rel} `## Open questions` has no rows (rule 15) "
                                  f"— record the honest empty: `none — trivial task | resolved`")
                else:
                    for q, s in rows:
                        if s == "open":
                            errors.append(f"[spec] {spec_rel} ledger row still open: “{q}” "
                                          f"(rule 15) — resolve or park before execution")
    return errors, warns
