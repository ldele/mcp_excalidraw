<!-- status: active · updated: 2026-11-17 · class: living -->

# SPEC-007 — an approval box in each screen (ADR-005)

> The executor brief (cpc ADR-019). Target executor: **an agent session in this repo with a terminal
> and a browser** (the round trip of rule 4 needs a real tab). The *why* is
> `docs/decisions/ADR-005-sign-off-and-end-of-round.md` (accepted 2026-11-16) and T-027; this SPEC
> is the *how* and does not reopen the choice. Written 2026-11-17 by the session the owner gave
> the build to, after ADR-004 landed as `1a5f530` (SPEC-006).
>
> **Built 2026-11-17, staged on `main`, not committed.** Every test case below ran; § Verified
> gives each result.

## Reader and what changes
- **Reader:** the session building ADR-005, then the owner reviewing the staged diff; after it, any
  agent drawing screens for review, and the person reviewing them.
- **What changes for them:** each screen carries a small "Approved" box. The person ticks it when
  the screen is done, and the agent sees which screens are approved in `wireframe` and `changes`,
  instead of asking in chat.

## Goal

An element whose id ends `-approval`, drawn inside a screen, is that screen's approval box. It is
not a component of the design. It is ticked by a fill or by a person's mark drawn inside it; the
reading prints the screen as approved or not yet, and `changes` reports a tick as approving that
screen. A round still ends with `watch`'s quiet period. Every scene with no approval box reads
exactly as before.

## Hard constraints
- **ADR-005, decided:** an approval box per screen, ticked by a stroke inside it or a fill; the
  reading prints the screen approved, `changes` reports it; the end of a round is unchanged; no file
  of upstream's is touched.
- **`AGENTS.md` rules 1–5,** as in SPEC-006: stage, never commit; `src/server.ts`, `src/index.ts`,
  `src/core/normalize.ts` and `frontend/src/App.tsx` untouched (upstream checked 2026-11-17, empty);
  edit `skills/` then sync; the round trip through a real tab on a private port; never stage
  `tools/conventions/`.
- **No new role;** the score's shape is unchanged, so no stored `.json` changes for it.
- **CONVENTIONS §16:** the approval rule is its own module, `src/core/approval.ts`.

## Open questions
- **familiarity:** wireframe semantics — **high** (the owner's call closes a row). Each row is the
  executor's call within the ADR, made so the build could go ahead.

| # | Question | Status | Resolution + reason | Reopens if |
|---|----------|--------|--------------------|------------|
| 1 | How is the box told apart? | resolved | **An id rule:** an element whose id ends `-approval` (`s01-approval`), like every other member id the conventions give a screen. It survives the tab; a declared role would be a new role. | a person must be able to add a box by hand |
| 2 | Which screen does a box approve? | resolved | **The screen it is nested in:** its `frameId`, or failing that the screen whose box holds its centre. A box outside every screen approves nothing and is left out like the others. | — |
| 3 | What is a tick? | resolved | **A fill, or any mark of a person's whose centre lies inside the box,** in any colour. Green, ADR-004's "fine", is what the legend suggests; a person who ticks in black still means it. The tick is not listed as an annotation: it is the approval. | a person marks a box in red to mean "not approved" |
| 4 | How does the reading print it? | resolved | **On the screen's heading,** `· approved` or `· not approved yet`, and a summary line `Approved: 1 of 2 screens.` when any screen has a box. `wireframe --json` carries `approval` on the screen. | — |
| 5 | How does `changes` print it? | resolved | **A tick added** reads `↳ approves screen "S01 — Sign in" [s01]` in place of an attribution; **a person filling the box** adds that line under its edit. A tick deleted reads as a deletion, since its place is gone with it; the reading shows the state. | the agent must be told an approval was withdrawn |

## Execution checklist
1. Write the test cases below.
2. Draw the fixture through a canvas on a private port, the tick in a real tab; write its `.json`
   by hand; see the tests fail before the reading changes.
3. `src/core/approval.ts`; the reading; `changes`.
4. Goldens regenerated and reviewed; every other golden unchanged.
5. The legend's line, conventions, SKILL.md, README; sync the skills.
6. The live round trip (test case 8).
7. Docs: DEVLOG, baton, CONTEXT, T-027 closed, this SPEC's § Verified.

## Work items
| # | Item | Files | Acceptance |
|---|------|-------|------------|
| 1 | The id rule, the screen a box belongs to, what a tick is | `src/core/approval.ts` | cases 3, 4 |
| 2 | The box is no component; ticks are no annotations; screens carry approval | `src/core/wireframe.ts` | cases 1, 2, 5 |
| 3 | `changes` reports a tick and a fill | `src/core/changes.ts` | case 6 |
| 4 | Fixture: one screen ticked in a tab, one not | `tests/fixtures/approval-boxes.excalidraw`, `tests/expected/approval-boxes.{json,txt}` | cases 1, 2 |
| 5 | Rules not drawable as a fixture | `tests/approval.test.mjs`, `tests/wireframe-corpus.test.mjs` | cases 3–7 |
| 6 | The legend's line and the box recipe | `skills/excalidraw-skill/references/markup-legend.json`, `…/wireframe-conventions.md`, `…/SKILL.md`, `README.md` | cases 7, 9 |

## Test cases (write these first — checklist step 1)
| # | Name | Assertion | Path |
|---|------|-----------|------|
| 1 | approved and not | approval-boxes reads its first screen `· approved` and its second `· not approved yet`, and `Approved: 1 of 2 screens.` | `tests/expected/approval-boxes.*` |
| 2 | the box is not the design | no approval box is a component (no `checkbox?`, no `shape`), the tick is no annotation; 0 fallbacks, 0 orphans | same |
| 3 | the id rule | `s01-approval` and `home-approval` are boxes; `approval`, `approvals` and `s01-approval-note` are not | `tests/approval.test.mjs` |
| 4 | what ticks | a filled box is approved; a person's stroke inside is; an agent's stroke inside is not; a person's note beside the box is not, and stays an annotation | same |
| 5 | which screen | a box with no `frameId` drawn inside a rectangle screen approves that screen; a box outside every screen approves nothing and is no orphan | same |
| 6 | `changes` | an added tick reads `↳ approves screen "…" [s01]`; a person's fill of the box reads it under the edit; an agent's addition inside the box does not | same |
| 7 | the legend says how | the skill's legend file has a line on the approval box, and still reads as nothing | same |
| 8 | the round trip, live | on a private port with a real tab: the agent draws two frame screens with boxes and the legend; `wireframe`: 0 fallbacks, both `· not approved yet`; a person draws a tick in one box in the tab; `changes` reads one human record that `approves screen` it; `wireframe`: `· approved`, `Approved: 1 of 2 screens.` | this SPEC § Verified |
| 9 | the docs say how | conventions give the box recipe and the tick; SKILL.md's loop says to read approval; `npm run sync:skills` | review |

## Verified

In the main checkout, 2026-11-17, Windows 11, Node 24.

| Case | Result |
|---|---|
| 1–2 · approval-boxes | **Pass.** Red first: against the ADR-004 code at `1a5f530`, 4 of the fixture's 5 checks failed. Now S01 `· approved`, S02 `· not approved yet`, `Approved: 1 of 2 screens.`; 2 screens, 7 components, 0 fallbacks, 0 orphans, 0 annotations: neither box is a component and the tick is no annotation |
| 3–7 · inline rules | **Pass**, 13 tests in `tests/approval.test.mjs`; the file failed before `approval.ts` existed, and the legend test failed until the legend gained its line |
| 8 · round trip, live | **Pass** on port 3072 with a real tab: two frame screens with boxes and the legend added by `apply`; `wireframe` 0 fallbacks, both `· not approved yet`. A stroke drawn in S01's box with the editor's pen in green: one human record, `freedraw … — by human · fine`, `↳ approves screen [s01] frame "S01 — Sign in"`; `wireframe` gave S01 `· approved` and `Approved: 1 of 2 screens.` Exported as the fixture |
| 9 · the docs say how | Conventions § 8 (the box recipe, the tick); SKILL.md (the loop's steps 1, 2 and 4, the reading, the report); README (the Markup row and an Approval bullet); `describe_wireframe`'s description; `npm run sync:skills` |
| Gates | `type-check`, `type-check:frontend`: pass. `node --test tests/**/*.test.mjs`: 157 / 157. `test:mcp`, `test:bind`: pass. Not run: `npm test`'s render, state, durable, share and paths checks and the browser suite, untouched here; the full gate runs once before the push. `docs_check --strict` and `init_check`: pass |

## Findings

1. **The port-3072 store gave the previous scene back.** The canvas keeps its scene per port
   (T-023 working as designed), so the round trip began by clearing it (`clear --yes`); without
   `--yes` the clear is refused, which a script that ignores the exit code reads as done.

## Out of scope
- A Done control in the page (ADR-005 option 2), or any change to how a round ends.
- Flagging a box outside every screen in Reading quality.
- Reporting an approval withdrawn when a tick is deleted (row 5).

## Docs to touch when this lands
- this SPEC, last: § Verified, then the shipped line and `status: archived · class: append-only`.
- README's differences table (its Markup row) · docs/DEVLOG.md · .claude/SESSION.md ·
  .claude/CONTEXT.md · T-027, closed as fixed.
