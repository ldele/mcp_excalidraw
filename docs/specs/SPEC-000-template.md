<!-- status: active · updated: YYYY-MM-DD · class: living -->

# SPEC-NNN — <slug>

> The executor brief (ADR-019). Target executor: **<agent/role>**. If an ADR owns the *why*, read
> it first and link it here — this SPEC is the *how* and must not re-litigate that decision.

## Goal
<One paragraph: what this delta makes possible. One sentence if it can be.>

## Hard constraints
<!-- carried over from the owning ADR/CONVENTIONS — do not violate.
     Coding conventions reach the executor HERE, not by luck (SPEC-concept-map Q6) — three
     sources, named inline: CONVENTIONS §12+§16 (design principles, file-level layout),
     dodlint.toml (graph/layer/concept-map rules), and the scaffold's linter config
     (ruff/clippy/ESLint — the language-level floor). Carry the ones this delta touches. -->
- <constraint 1>
- <constraint 2>

## Open questions
<!-- the scoped-grill ledger (grill-me scoped mode at keypoint sprint-start; enforced by
     docs_check rule 15 when [sprint] require_spec_ledger is on). status: open | resolved |
     parked — no row may still be `open` once the sprint is started; parked names where the
     question now lives. familiarity comes from .claude/CONTEXT.md `## Familiarity map`
     (override for this task on the line below): high = ask the user, their call closes the
     row; low = research first (atlas / market-scan / tech-landscape / web), the question flips
     to confirm-or-veto and the resolution cites a source — source quality is sprint-review's
     judgment, not the gate's. A trivial task keeps one honest row: none — trivial task. -->
- **familiarity:** <domain> — <high|medium|low>

| # | Question | Status | Resolution + reason | Reopens if |
|---|----------|--------|--------------------|------------|
| 1 | <the fork to resolve> | open | <resolution + the deciding reason> | <condition> |

## Execution checklist
<!-- ordered; step 1 is always "write the test cases below" -->
1. Write the test cases in the table below.
2. <work item 1>
3. <work item 2>

## Work items
| # | Item | Files | Acceptance |
|---|------|-------|------------|
| 1 | <what> | <path(s)> | <how you know it's done> |

## Test cases (write these first — checklist step 1)
| Name | Assertion | Path |
|------|-----------|------|
| test_x | <behavioral assertion> | path/test_x.py |

## Estimate
- **estimate:** <S\|M\|L> / <rough hours>  <!-- planner judgment, not a measurement -->

## Out of scope
- <explicitly excluded item>

## Docs to touch when this lands
- docs/DEVLOG.md
- .claude/SESSION.md
- CHANGELOG.md
