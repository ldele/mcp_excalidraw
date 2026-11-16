<!-- status: active · updated: 2026-11-16 · class: living -->

# SPEC-005 — screens drawn as native frames (ADR-003)

> The executor brief (cpc ADR-019). Target executor: **an agent session in this repo with a terminal
> and a browser** (the round trip of rule 4 needs a real tab). The *why* is
> `docs/decisions/ADR-003-visible-screen-ids.md` (accepted 2026-11-16) and T-028; this SPEC is the
> *how* and does not reopen the choice. Written 2026-11-16 by the session the owner gave the build to.
>
> **Landed 2026-11-16.** Committed on `adr-003-frame-screens` as `6414461` on the owner's yes,
> fast-forwarded onto `main` and pushed; CI run 43952866891 dispatched on it. The worktree and the
> branch are removed. Every test case below ran; § Verified gives each result. Work item 8 and
> test case 15 were added during the work.

## Reader and what changes
- **Reader:** the session building ADR-003, then the owner reviewing the staged branch; after it,
  any agent drawing a wireframe.
- **What changes for them:** an agent can draw a screen as a frame named "S23 — Character" and the
  reading names the screen "S23 — Character", so a person can name a screen from the zoomed-out
  canvas and the agent can find it in the reading. Rectangle screens read as before.

## Goal

A top-level Excalidraw frame is a screen, named by the frame's `name`; its members are the elements
whose `frameId` names it, nested inside it by geometry as today. Every rectangle screen, and every
reading in `tests/expected/`, stays exactly as it is.

## Hard constraints
- **ADR-003, decided:** frames, named with id and title; the reading takes the frame's name as the
  screen's; rectangle screens keep reading; no scene is migrated by force.
- **`AGENTS.md` rule 1:** stage, never commit. Work on branch `adr-003-frame-screens` in the
  worktree `C:\Projects\mcp_excalidraw-adr003`, since the owner's canvas on port 3000 runs from the
  main checkout's `dist/`.
- **Rule 2:** `src/server.ts`, `src/index.ts`, `src/core/normalize.ts` are not touched. Upstream
  checked 2026-11-16: `HEAD..upstream/main` is empty.
- **Rule 3:** edit `skills/`, never `.agents/`, then `npm run sync:skills`.
- **Rule 4:** the round trip closes: draw it, read it back, zero `shape` fallbacks, through a real
  tab on a private port (not 3000, not 3010).
- **Rule 5:** never stage `tools/conventions/`.
- **No new role.** `COMPONENT_ROLES` is unchanged, so `tests/role-docs.test.mjs` holds as is.
- **CONVENTIONS §16, test weight:** no new test dependency; fixtures and `node:test` only.

## Open questions
- **familiarity:** wireframe semantics — **high** (the owner's call closes a row).

| # | Question | Status | Resolution + reason | Reopens if |
|---|----------|--------|--------------------|------------|
| 1 | How does a frame's name split into id and title? | resolved | **It does not split.** The whole name is the screen's label: `Screen 1 "S23 — Character" [s23]`. The conventions ask the agent to give the frame the element id `s23`, so the badge and the bracketed id agree. A frame a person draws reads by whatever they typed. (Owner, 2026-11-16.) | readers need the id apart from the title, e.g. to check them against each other |
| 2 | What does a frame need inside it, and how does an empty frame read? | resolved | **The name is enough.** A named frame needs no heading; a heading inside stays optional and reads as a heading. A frame with no name (Excalidraw shows "Frame") is named from its heading or header bar, as a rectangle is. An empty frame is an empty screen, not a `shape` outside every screen. (Owner, 2026-11-16.) | exports, where the name is drawn at 14 px of the drawing, prove too small for review |
| 3 | Which decides an element's screen: `frameId` or geometry? | resolved | **`frameId`, then geometry.** An element whose `frameId` names a frame belongs to it even where it pokes out, since the editor clips it there. Inside the frame, nesting stays geometric. An element with no `frameId` nests by geometry, so a drawing that forgets `frameId` reads the same. Frames are never nested. (Owner, 2026-11-16.) | Excalidraw starts nesting frames |
| 4 | What is "where it pokes out" when the member lies wholly outside its frame, or its frame is gone? | resolved | **Geometry.** Containment uses the member's box clipped to its frame. A member that does not overlap its frame, or whose `frameId` names no frame in the scene, has no clipped box and nests by geometry, as an element with no `frameId` does. The editor draws nothing of the first, so reading it as outside every screen is what flags it. Executor's call within row 3. | the owner wants such members flagged in Reading quality |
| 5 | Does the frame's name reach anything but the reading? | resolved | **Yes, through `effectiveLabel`,** which is where the ADR found it ignored. So the change log's canonical form carries a frame's name as its label, and renaming a frame in the tab is reported as a label change; a change record names the frame by it. Both sides of a comparison are computed by the same code, so no stored scene reports a change on upgrade. `describe_scene` does not use `effectiveLabel` and is left as is. Executor's call. | a rename should not count as a design edit |

## Execution checklist
1. Write the test cases in the table below.
2. Draw the fixtures through a canvas on a private port and export them; write their `.json`
   claims by hand; see the corpus test fail on them before the reading changes.
3. Read the frame's name (`effectiveLabel`), build the tree with frames as roots and members
   clipped to them, classify a top-level frame as a screen.
4. Generate the two new golden readings, review them line by line, re-review the attribution
   baseline; confirm `tests/expected/` is unchanged for the five old fixtures.
5. Skill and conventions: the frame recipe; sync the skills.
6. The live round trip with a tab (test case 12).
7. Docs: DEVLOG, baton, CONTEXT, T-028, this SPEC's § Verified.

## Work items
| # | Item | Files | Acceptance |
|---|------|-------|------------|
| 1 | A frame's visible text is its `name` | `src/core/changes.ts` (`effectiveLabel`) | cases 8, 11 |
| 2 | Frames are roots; members nest by their box clipped to their frame | `src/core/wireframe.ts` (`buildTree`) | cases 3, 4, 5, 9, 10 |
| 3 | A top-level frame is a screen, even when empty | `src/core/wireframe.ts` (`classify`) | case 6 |
| 4 | Fixture: screens drawn as the conventions say | `tests/fixtures/frame-screens.excalidraw`, `tests/expected/frame-screens.{json,txt}` | cases 1–3, 7 |
| 5 | Fixture: the edges, beside a rectangle screen | `tests/fixtures/frame-edges.excalidraw`, `tests/expected/frame-edges.{json,txt}` | cases 4–6, 13 |
| 6 | Rules not drawable as a fixture | `tests/frame-screens.test.mjs` | cases 8–11 |
| 7 | The frame recipe for drawing a screen | `skills/excalidraw-skill/references/wireframe-conventions.md`, `skills/excalidraw-skill/SKILL.md`, `README.md` | case 14 |
| 8 | Added during the work (finding 1): a tab keeps an agent's arrow bound to a frame | `frontend/src/utils/scene.ts` (`prepareServerScene`), `FORK.md` | cases 12, 15 |

## Test cases (write these first — checklist step 1)
| # | Name | Assertion | Path |
|---|------|-----------|------|
| 1 | frame-screens reads as drawn | the reading equals the reviewed golden text; score 0 fallbacks, 0 unnamed, 0 orphans | `tests/wireframe-corpus.test.mjs`, `tests/expected/frame-screens.*` |
| 2 | a screen is named by its frame | each screen's label is its frame's name, including a frame that holds a heading of its own (the heading is listed as a component) | same |
| 3 | navigation between frames | an arrow from a button in one frame to another frame is a navigation flow to that frame's screen | same |
| 4 | a member that pokes out | an element whose `frameId` names a frame, and which crosses its edge, is listed inside that screen, not outside every screen | `tests/expected/frame-edges.*` |
| 5 | no `frameId`, inside a frame | an element drawn wholly inside a frame with no `frameId` is listed inside that screen | same |
| 6 | the unnamed and the empty | a frame with no name is named from its heading; an empty named frame is a screen "(empty)", with no fallback and no orphan | same |
| 7 | markup on a frame's member | a note beside a button inside a frame binds to that button; the attribution baseline is re-reviewed by hand for the grown corpus | `tests/expected/frame-screens.json`, `tests/expected/attribution-baseline.json` |
| 8 | the name is the label | `effectiveLabel` of a frame is its trimmed name; a null, empty or blank name gives none | `tests/frame-screens.test.mjs` |
| 9 | frames never nest | a frame drawn wholly inside another frame, or inside a larger rectangle, is a screen of its own | same |
| 10 | geometry when the frame cannot hold it | a member wholly outside its frame, and an element whose `frameId` names no frame, read as an element with no `frameId` does | same |
| 11 | a rename is a label change | the canonical form of a frame carries its name as `label`, so a renamed frame differs | same |
| 12 | the round trip, live | on a private port with a real tab: the agent draws frame screens with the CLI; `wireframe` names each from its frame, 0 fallbacks; the tab shows each name; a person's note beside a button in a frame is one human record annotating that button, and the reading lists it under it; a person renames a frame in the tab and the reading takes the new name | `docs/specs/SPEC-005-frame-screens.md` § Verified |
| 13 | rectangle screens unchanged | `git diff --quiet main -- tests/expected` names only the new files and the baseline; the rectangle screen in `frame-edges` reads as a rectangle screen does | corpus run + `git diff` |
| 14 | the docs say how | the conventions' § 1 gives the frame recipe and says rectangles still read; `npm run sync:skills` leaves `.agents/` matching | review |
| 15 | a tab keeps an arrow bound to a frame | the page's scene restore (`prepareServerScene`, bundled as `prepareScene`) gives an arrow whose `end` names a frame an `endBinding` to it and lists the arrow on the frame; a binding the arrow already has is kept | `tests/frame-screens.test.mjs` |

## Findings

1. **A tab dropped an agent's arrow bound to a frame, and the reading lost the navigation.**
   Found in the first live round trip (test case 12), 2026-11-16, port 3071. The page's
   `prepareServerScene` keeps frames out of Excalidraw's skeleton converter (upstream #110, so
   that the converter does not recompute frame bounds), so an arrow drawn with
   `"end": {"id": "s02"}` found no target and came back with `endBinding: null`. The tab's first
   sync then reported both navigation arrows as edited by a human ("endTarget s02 ⇒ null"), and
   a human arrow reads as markup: `### Navigation` was gone, and the arrows were listed as
   annotations pointing at the screens. A rectangle screen does not do this: the same edit on
   `two-screen-flow` gave one human record, the note. Fixed in the page, as T-024 was:
   `bindArrowsToFrames` binds such an arrow to its frame the way the export does (focus 0,
   gap 4) and lists it on the frame; recorded in `FORK.md`. Test case 15 fails without it.
2. **A tab that outlives a restart brings its scene back.** Restarting the canvas, clearing it,
   then reloading the tab gave the previous scene back to the server (T-023's merge after a
   restart, working as designed). Clear with the tab connected, or close the tab first.

## Verified

In the worktree, 2026-11-16, Windows 11, Node 24.

| Case | Result |
|---|---|
| 1–3 · frame-screens | **Pass.** Red first: before the reading changed, S01 and S03 read unnamed and S02 as "Welcome back". Now each screen is named by its frame, S02's heading is a component, two navigation flows |
| 4–6 · frame-edges | **Pass.** Red first: `e02` read as `shape` outside every screen, `Next` outside every screen, `e03` by its heading. Now 4 screens, 0 fallbacks, 0 orphans |
| 7 · markup on a frame's member | **Pass.** The tab note binds `near` `[s02-out]`; baseline re-reviewed by hand, 5 / 6 (was 4 / 5) |
| 8–11 · inline rules | **Pass**, 11 tests; 9 of them failed before the reading changed (the other two pin behaviour that was already right) |
| 12 · round trip, live | **Pass** on port 3071 with a real tab (the browser pane), after finding 1 was fixed: 3 screens named from their frames, 0 fallbacks, 18 agent records and none from the tab's load; a note typed in the tab, one human record annotating `[s02-out]` (33px); S02 renamed in the tab, one human record `text "S02 — Dashboard" → "S02 — Home"`, the reading took the new name and both flows followed it. Each name is drawn above its frame in the tab at 40 % zoom and in the headless render. Before the fix, the first sync turned both arrows into human markup |
| 13 · rectangle screens unchanged | **Pass.** `corpus:update` rewrote the five old goldens byte for byte; `git status` lists none of them. `r01` in frame-edges reads as a rectangle screen |
| 14 · the docs say how | Conventions § 1 (frame recipe, rectangles still read), § 3, § 5, § 7, § 9, § 10 (the worked skeleton is a frame, drawn and read back: 0 fallbacks); SKILL.md; README; `npm run sync:skills` |
| 15 · a tab keeps an arrow bound to a frame | **Pass**, 2 tests. The first failed before `bindArrowsToFrames` (`endBinding` undefined); the second, an arrow the tab already bound, pins what already held. T-024's elbow tests still pass |
| Gates | `type-check`, `type-check:frontend`: pass. `npm test`: pass (corpus 123 / 123, wire 6 / 6, bind, render, state, durable, share, paths). Browser suite on the system Chrome (a scratch config spreading `playwright.config.mjs` with `channel: 'chrome'`, not staged): 32 / 32. `docs_check --strict` and `init_check`: pass |

## Estimate
- **estimate:** M / 4–6 h

## Out of scope
- ADR-004's legend frame and how the reading leaves it out; ADR-005's approval boxes. Both read
  screens and are built next, on this.
- Migrating rectangle scenes, dnd_crawler_rust's 25 screens included (ADR-003: no forced migration).
- `describe_scene` showing frame names; it has its own label code.
- A check that the frame's id and the start of its name agree (row 1).

## Docs to touch when this lands
- this SPEC, last: § Verified, then under the title add `> **Shipped** in vX.Y.Z (YYYY-MM-DD).
  What was delivered is recorded in the CHANGELOG and that release's report. Not edited after this
  line (cpc ADR-054).`, and set the header to `status: archived · class: append-only`.
- docs/DEVLOG.md
- .claude/SESSION.md
- .claude/CONTEXT.md (current phase; the frames open question)
- T-028, closed as fixed (now in `docs/archive/TICKETS-archive-001.md`)
