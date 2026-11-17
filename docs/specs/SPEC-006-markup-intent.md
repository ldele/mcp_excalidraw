<!-- status: active · updated: 2026-11-17 · class: living -->

# SPEC-006 — a mark's intent is its colour (ADR-004)

> The executor brief (cpc ADR-019). Target executor: **an agent session in this repo with a terminal
> and a browser** (the round trip of rule 4 needs a real tab). The *why* is
> `docs/decisions/ADR-004-markup-intent.md` (accepted 2026-11-16) and T-027; this SPEC is the
> *how* and does not reopen the choice. Written 2026-11-17 by the session the owner gave the build to.
>
> **Built 2026-11-17, staged on `main`, not committed.** Every test case below ran; § Verified
> gives each result. Work item 8 was added during the work.

## Reader and what changes
- **Reader:** the session building ADR-004, then the owner reviewing the staged diff; after it, any
  agent handing a person the pen, and the person marking up.
- **What changes for them:** the person sees on the canvas how to say "change this", "remove
  this", "I have a question" or "this is fine": a legend frame beside the screens names four
  colours. The agent reads which one each mark means, printed beside the mark in `wireframe` and
  in `changes`, instead of guessing it from the note's words.

## Goal

A mark a person draws (origin `human`) in one of four colour families of the editor's palette
carries an intent: change, remove, question or fine. `wireframe` and `changes` print it beside the
mark. A legend frame, which the agent adds from a file in the skill, says which colour is which,
and the reading leaves it out. A mark in any other colour reads exactly as it does today.

## Hard constraints
- **ADR-004, decided:** intent by colour; four stroke colours from the editor's own picker; a
  legend frame the reading leaves out; only a person's marks are read for intent; a mark in any
  other colour reads as today.
- **`AGENTS.md` rule 1:** stage, never commit. On `main` in the main checkout; no canvas runs on
  port 3000, so the checkout's `dist/` may be rebuilt.
- **Rule 2:** `src/server.ts`, `src/index.ts`, `src/core/normalize.ts` and `frontend/src/App.tsx`
  are not touched. Upstream checked 2026-11-17: `HEAD..upstream/main` is empty.
- **Rule 3:** edit `skills/`, never `.agents/`, then `npm run sync:skills`.
- **Rule 4:** the round trip closes through a real tab on a private port (not 3000, not 3010).
- **Rule 5:** never stage `tools/conventions/`.
- **No new role.** `COMPONENT_ROLES` is unchanged.
- **CONVENTIONS §16:** split by concept: the colour rule and the legend rule are their own module,
  `src/core/markup-intent.ts`; no new test dependency.

## Open questions
- **familiarity:** wireframe semantics — **high** (the owner's call closes a row). Every row below
  is the executor's call within the ADR, made so the build could go ahead; each says what reopens it.

| # | Question | Status | Resolution + reason | Reopens if |
|---|----------|--------|--------------------|------------|
| 1 | Which four colours? | resolved | **The four one-click picks beside black in the stroke picker:** red `#e03131` change, the orange-looking `#f08c00` (Excalidraw's "yellow") remove, blue `#1971c2` question, green `#2f9e44` fine. They are what a person reaches in one click, and the ADR's example order. Executor's call. | the owner wants another mapping |
| 2 | Only those four hexes, or their shades? | resolved | **Every shade of the family in the editor's palette:** red; yellow and orange; blue; green (open-color shades 0, 2, 4, 6, 8, as `COLOR_PALETTE` in `@excalidraw/excalidraw` 0.18 builds them), compared without case. A person who picks a lighter red from the shade row still means red. Cyan, violet, teal and the rest carry no intent. Executor's call. | a person's light shade is read as an intent they did not mean |
| 3 | How is the legend told apart? | resolved | **An id rule:** an element whose id is `legend` or begins `legend-`. Left out of the reading with it: every element whose `frameId` names it, every element drawn wholly inside it, and their bound text. The reading says in one line that it left the legend out. An id survives the tab round trip; a declared role would need a new role. Executor's call within the ADR's "a declared role or an id rule". | a person draws something into the legend that should be read |
| 4 | Where is the intent printed? | resolved | **In `wireframe`,** a `[change]` tag before the mark in the annotations block, whose header names the four tags when any is present. **In `changes`,** `· change` after `by human` on an added mark, and `intent change → fine` when a person recolours a mark. `wireframe --json` carries `intent` on each mark. Executor's call. | — |
| 5 | Who draws the legend, and how? | resolved | **The agent, from a file in the skill:** `references/markup-legend.json`, an `apply` patch with a frame `legend` named "How to mark up", placed left of the convention's frame origin, so the agent adds it with one command and moves it if it collides. Executor's call. | the legend should be drawn by the canvas page itself |

## Execution checklist
1. Write the test cases in the table below.
2. Recolour the annotated fixture's marks, draw the legend fixture through a canvas on a private
   port, write their `.json` claims by hand; see the tests fail before the reading changes.
3. `src/core/markup-intent.ts`: the colour families, `markIntent`, the legend rule.
4. The reading leaves the legend out and prints intent; `changes` prints intent and leaves the
   legend out of attribution targets.
5. Regenerate the goldens, review them line by line; confirm the other goldens are unchanged.
6. Skill: the legend file, conventions § 8, SKILL.md's review loop; sync the skills.
7. The live round trip with a tab (test case 9).
8. Docs: README's differences table, DEVLOG, baton, CONTEXT, T-027, this SPEC's § Verified.

## Work items
| # | Item | Files | Acceptance |
|---|------|-------|------------|
| 1 | Colour families, intent, legend rule | `src/core/markup-intent.ts` | cases 4, 5 |
| 2 | The reading leaves the legend out, prints intent | `src/core/wireframe.ts` | cases 1–3, 6 |
| 3 | `changes` prints intent, ignores the legend as a target | `src/core/changes.ts` | case 7 |
| 4 | Fixture: one mark of each intent, one in another colour | `tests/fixtures/annotated.excalidraw`, `tests/expected/annotated.{json,txt}` | case 1 |
| 5 | Fixture: the legend beside a screen, left out | `tests/fixtures/markup-legend.excalidraw`, `tests/expected/markup-legend.{json,txt}` | cases 2, 3 |
| 6 | Rules not drawable as a fixture | `tests/markup-intent.test.mjs`, `tests/wireframe-corpus.test.mjs` | cases 4–8 |
| 7 | The legend file and how to hand over the pen | `skills/excalidraw-skill/references/markup-legend.json`, `…/wireframe-conventions.md`, `…/SKILL.md`, `README.md` | cases 8, 10 |
| 8 | Added during the work: box geometry in its own module, so `markup-intent.ts` and `changes.ts` do not import each other | `src/core/box.ts` (`boxOf`, `isUnsizedText`, `normalizePoints`, moved unchanged; `changes.ts` re-exports the first two) | cases 1–8 |

## Test cases (write these first — checklist step 1)
| # | Name | Assertion | Path |
|---|------|-----------|------|
| 1 | each intent in the stored reading | annotated's marks read change (red note), question (blue note), fine (green ring), remove (orange scribble); the arrow in the old `#d03b3b` has no intent; attribution is unchanged | `tests/expected/annotated.*`, `tests/wireframe-corpus.test.mjs` |
| 2 | the legend is left out | markup-legend reads 1 screen, 0 fallbacks, 0 orphans; no legend element is a component; the reading says it left the legend out | `tests/expected/markup-legend.*` |
| 3 | a mark beside the legend | a person's note between the legend and a screen binds to the screen's component, never to the legend | same |
| 4 | the colour rule | each family's five shades give its intent, in either case; black, `#d03b3b`, cyan, transparent and no colour give none | `tests/markup-intent.test.mjs` |
| 5 | only a person's marks | an agent's element in red has no intent | same |
| 6 | the legend rule | `legend` and `legend-x` are legends, `legendary` is not; a member by `frameId`, one drawn inside with no `frameId`, and bound text are all left out | same |
| 7 | `changes` prints intent | an added human note in red reads `by human · change`; a human recolour red → green reads `intent change → fine`; an agent's red shape has no intent; a note beside the legend is not attributed to it | same |
| 8 | the legend file reads as nothing | the skill's `markup-legend.json`, beside a frame screen, adds no component, no screen and no orphan to the reading | same |
| 9 | the round trip, live | on a private port with a real tab: the agent adds the legend from the file and a frame screen; `wireframe`: 0 fallbacks, the legend left out; the tab shows it; a person draws a note in red and a ring in green in the tab; `changes` reads one human record `· change` and one `· fine`, attributed to their components; `wireframe` prints `[change]` and `[fine]` | this SPEC § Verified |
| 10 | the docs say how | conventions § 8 gives the colours and the legend; SKILL.md's hand-over tells the agent to add it; `npm run sync:skills` leaves `.agents/` matching | review |

## Verified

In the main checkout, 2026-11-17, Windows 11, Node 24.

| Case | Result |
|---|---|
| 1 · each intent in the stored reading | **Pass.** Red first: the intent check failed on annotated before the code. Now red note `[change]`, blue note `[question]`, green ring `[fine]`, orange scribble `[remove]`; the `#d03b3b` arrow untagged; every binding as before |
| 2–3 · markup-legend | **Pass.** Red first: run against the old reading code, 6 of the 10 checks on annotated and markup-legend failed. Now 1 screen, 4 components, 0 fallbacks, 0 orphans, the `Left out` line; the tab-drawn note, 13px from the legend and 19px from Password, binds `near` Password. Attribution baseline re-reviewed by hand: 7 / 8 (was 5 / 6) |
| 4–8 · inline rules | **Pass**, 11 tests in `tests/markup-intent.test.mjs`; the file failed before `markup-intent.ts` existed. Two test scenes were wrong at first and fixed (a default parameter that swallowed `undefined`; a one-field frame, which is no container, so a note bound to it) |
| 9 · round trip, live | **Pass** on port 3072 with a real tab (the browser pane): the screen and the legend added by `apply`, `wireframe` 0 fallbacks with the legend left out; the tab shows the legend's colours and words. A note typed in the tab and set red, a ring drawn round Sign in and set green: `changes` gave two human records, `· change` annotating `[s01-password]` (19px) and `· fine` circling `[s01-submit]`, and none from the tab's load; `wireframe` printed `[change]` and `[fine]`. Exported as `tests/fixtures/markup-legend.excalidraw` |
| 10 · the docs say how | Conventions § 8 (the legend, the four colours, the gestures); SKILL.md (the reading's annotations, the hand-over, the report); README (its differences row and the annotations bullet); the MCP descriptions of `describe_wireframe` and `get_canvas_changes`; `npm run sync:skills` |
| Gates | `type-check`, `type-check:frontend`: pass. `node --test tests/**/*.test.mjs`: 139 / 139. `test:mcp` 6 / 6, `test:bind`: pass. Not run: `npm test`'s render, state, durable, share and paths checks and the browser suite, none of which this change touches; the full gate runs once before the push. `docs_check --strict` (after rotating the oldest baton and DEVLOG entry) and `init_check`: pass |

## Findings

1. **A synthetic drag in the browser pane lands in full, but a screenshot taken at once shows it
   half drawn.** Two rings were undone for being short when they were not. Wait a second before
   judging a drag. Not a defect of this project.

## Out of scope
- ADR-005's approval box, built next on this; the legend gains its line then.
- A first-word intent ("change: …", ADR-004 option 3), or reading intent from fill.
- Colour-blind support beyond the legend's words: the reading names the intent for the agent;
  the person still picks by colour (a cost the ADR accepted).
- Measuring attribution with a person (KI-3, ROADMAP PR 1).

## Docs to touch when this lands
- this SPEC, last: § Verified, then the shipped line and `status: archived · class: append-only`.
- README's "How it differs from upstream" table, FORK.md if a page file changes (none planned).
- docs/DEVLOG.md · .claude/SESSION.md · .claude/CONTEXT.md · T-027's note (closed 2026-11-17, now in `docs/archive/TICKETS-archive-001.md`).
