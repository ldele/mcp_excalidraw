<!-- status: active · updated: 2026-11-16 · class: append-only -->

# ADR-003 — How a screen shows its id on the canvas

- **Status:** proposed
- **Date:** 2026-11-16
- **Deciders:** Lucas (to decide); drafted by Claude Code
- **In one sentence:** each screen of a wireframe carries a name a person can read on the
  zoomed-out canvas and quote in a message, and it matches the id the agent's reading uses.
- **To decide:** how a screen shows its id on the canvas. The options are an id badge drawn
  inside it, Excalidraw's own frame name, an overlay in the canvas page, or the heading as today.
  The other half of the same review, a person's markup convention, is ADR-004 and ADR-005.

## In practice — dnd_crawler_rust's 25 screens (T-028)

`docs/engine/wireframes/adr-0057-screens.excalidraw` in dnd_crawler_rust holds 894 elements and
25 screens. Each screen is a 960 × 600 rectangle, and they are laid out over about 5,760 × 6,740 px.
Each screen already opens with a 22 px heading that starts with its number (`s01-h`: "S01 Title —
continue or start again"). The reading lists it as `Screen 2 "S01 Title — continue or start again"
[s01]`. Zoomed to fit a 1,920 × 1,080 window, about 16 %, that heading is about 4 px tall. The
person reviewing the scene found and named screens through the reading, not the canvas. They asked
for "a visible id badge or number per screen frame, matching the reading's [id]" (`docs/TICKETS.md`,
T-028). After this decision, "S23, the doll" can be said, and found, from the overview.

## Context

- **How screens are drawn.** A screen is drawn as "a plain bordered rectangle, no fill, no label"
  (`skills/excalidraw-skill/references/wireframe-conventions.md`, line 46).
- **How screens are read.** The reading makes any top-level element a screen
  (`src/core/wireframe.ts:358`). `deriveScreenName` (`:471`) names it from its first heading, a text
  of 20 px or more, or else from its header bar. The id in brackets is the element's own id.
- **Native frames.** The CLI already accepts a `"type": "frame"` element with a `"name"`, and
  `"frameId"` on its children (README, CLI reference). The headless renderer draws frame names
  (`frameRendering: { … name: true … }`, `src/core/render/excalidraw-node/index.ts:54`). The
  reading ignores a frame's name today: `effectiveLabel` reads only label text
  (`src/core/changes.ts:63`).
- **The open question.** Whether frames should replace the plain rectangle is an open question in
  `.claude/CONTEXT.md`.
- **Not checked:** whether the editor draws a frame's name at a fixed size when zoomed out.

## Options

1. **An id badge inside each screen.** The agent draws a large text, for example a 64 px "S23", in
   the screen's top-left corner, declared with a new role that the reading leaves out of naming
   and out of the components.
   - **Gives:** about 10 px tall at 16 %; no change to how screens are drawn; visible in exports,
     renders and on excalidraw.com.
   - **Costs:** a new role in `COMPONENT_ROLES` and in both role lists of the skill
     (`tests/role-docs.test.mjs` holds them to the code); a rule in `deriveScreenName`, since a
     64 px text would otherwise name the screen "S23"; one more convention every drawing must
     follow; badges added to existing scenes by hand.
2. **Native frames as screens.** Each screen is drawn as a frame named, say, "S23 — Character",
   with `frameId` on its children. The reading takes the frame's name as the screen's name.
   - **Gives:** the editor and the headless renders show the name above each screen; moving a
     frame moves what it holds; CONTEXT's open question is settled.
   - **Costs:** the conventions' screen recipe, and the reading rules written for rectangle
     screens. Containment is geometric today, and a frame also clips whatever lies outside it.
     Rectangle scenes (dnd's 25 screens, the five fixtures under `tests/fixtures/`) must keep
     reading beside frames, or be redrawn. How legible the name is when zoomed out is not checked.
3. **An overlay in the canvas page.** The page draws each screen's reading id over the canvas,
   always or on hover.
   - **Gives:** no change to any drawing; the ids appear exactly as the reading prints them.
   - **Costs:** code in `frontend/src/App.tsx`, which is upstream's file, plus a reading call from
     the page. The ids show only in this page: not in exports, not in renders, not on
     excalidraw.com.
4. **Keep the heading, and write it down.** The conventions say a screen's heading starts with its
   id, as dnd's scene already does.
   - **Gives:** no code.
   - **Costs:** the heading stays 20 to 26 px, unreadable at an overview zoom. That is the case
     this ticket reports.

## Decision

Not decided. Proposed for the owner on 2026-11-16.

## Enforced by

Nothing yet, since nothing is decided. Options 1 and 2 would add a fixture whose stored reading
pins the badge or the frame name (`tests/wireframe-corpus.test.mjs`), and rule 4's round trip
applies. Option 3 would need a browser test (`tests/browser/`). Option 4 is judgment, not
enforceable.

## Consequences

- **Option 2** settles CONTEXT's frames question, and gives ADR-004's legend a natural home as a
  frame of its own.
- **Options 1 and 2** change the reading, so they need the round trip of `.claude/CONTEXT.md`
  rule 4.
- **Option 3** is the only one that touches upstream's files.
- **Option 4** costs nothing and leaves T-028 open.
