<!-- status: active · updated: 2026-11-16 · class: append-only -->

# ADR-003 — How a screen shows its id on the canvas

- **Status:** accepted
- **Date:** 2026-11-16
- **Deciders:** Lucas; drafted by Claude Code
- **In one sentence:** each screen of a wireframe carries a name a person can read on the
  zoomed-out canvas and quote in a message, and it matches the id the agent's reading uses.
- **Decided:** screens are drawn as native Excalidraw frames, named with the screen's id and
  title, and the reading takes the frame's name as the screen's (option 2). Lucas, 2026-11-16.
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
- **How a frame's name is drawn,** checked 2026-11-16 with a real tab: 25 screens, 13 of them
  frames, fitted to a 1,600 × 900 window at 10 %. The editor draws each frame's name as a page
  label at a fixed 14 px on screen (`FRAME_STYLE.nameFontSize`, Excalidraw 0.18.1), about 86 px
  wide for "S01 — Screen 1", whatever the zoom. The 22 px heading inside was about 2 px tall. In
  exports and renders the name is drawn at 14 px of the drawing, so it shrinks with the image.

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
     reading beside frames, or be redrawn. In exports and renders the name shrinks with the image.
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

Option 2: native frames. A screen is a frame named with its id and title ("S23 — Character"), and
the reading takes the frame's name as the screen's name. It is the one option that answers T-028
in the editor at any zoom, as checked above, without adding an element to every screen, and it
settles CONTEXT's open question on frames. Rectangle screens keep reading as they do now; no
scene is migrated by force. Decided by Lucas on 2026-11-16, choosing option 2 from the four.

## Enforced by

To be built with the change: a fixture drawn with frames, whose stored reading names each screen
from its frame (`tests/wireframe-corpus.test.mjs`), seen red before the reading reads frame
names. Rule 4's round trip applies.

## Consequences

- **Option 2** settles CONTEXT's frames question, and gives ADR-004's legend a natural home as a
  frame of its own.
- **Options 1 and 2** change the reading, so they need the round trip of `.claude/CONTEXT.md`
  rule 4.
- **Option 3** is the only one that touches upstream's files.
- **Option 4** costs nothing and leaves T-028 open.
