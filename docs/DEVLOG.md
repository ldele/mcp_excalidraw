<!-- status: active · updated: 2026-11-16 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: [`docs/archive/DEVLOG-archive-001.md`](archive/DEVLOG-archive-001.md). Rotation
began on 2026-10-08; the archive holds everything older than the entries kept here (three since
2026-11-16).

## 2026-11-16 (g) — ADR-003 to ADR-005 accepted; the 2.2.0 merge decided
- **Decided by the owner, one at a time:**
  - ADR-003: screens become native frames, and the reading takes the frame's name.
  - ADR-004: a mark's intent is its colour, with a legend frame.
  - ADR-005: each screen gets an approval box; a round still ends with `watch`'s quiet period.
  - Upstream 2.2.0: merge it next, before those builds.
  Each ADR records the choice; T-027 and T-028 carry a note.
- **Checked before ADR-003 was asked:** 25 screens, 13 of them named frames, opened in a real tab
  fitted to 1,600 × 900 at 10 %. The editor draws a frame's name as a page label at a fixed 14 px
  (`FRAME_STYLE.nameFontSize`), while the 22 px headings were about 2 px tall. Exports and renders
  draw the name at 14 px of the drawing, so there it shrinks.
- **Corrected in ADR-004 before acceptance:** the colour option's cost no longer says the agent's
  palette must avoid the four colours. Only a person's marks are read for intent.
- **Nothing built.**

## 2026-11-16 (f) — T-024 fixed: an elbowed arrow keeps its bindings through export, import and a tab
- **Cause, found with a real tab:** creating, updating or live-drawing an elbowed arrow kept its
  bindings. Export did not. It writes an arrow bound by `start`/`end` refs with
  `fixedPoint: null`, and Excalidraw 0.18.1's restore drops such a binding on an elbowed arrow
  (`repairBinding`, read in its source). So an export made with no tab, imported again, lost its
  elbowed flows on the tab's first click: "re-bound: s1-go → s2 ⇒ nothing, by human", one flow
  gone, read as an annotation. A plain arrow binds without a fixed point and kept its flow.
  Upstream 2.2.0's export writes the same null.
- **Fix:** `fillElbowFixedPoints` (new `src/core/elbow-binding.ts`) gives each such binding the
  fixed point its end implies, computed as Excalidraw's own
  `calculateFixedPointForElbowArrowBinding` does. It runs in the export and in the page just
  before `restoreElements`, so files written before the fix load bound too. The exported values
  equal those a real tab computed for the same arrow.
- **Rule 2:** `src/server.ts`, `src/index.ts` and `normalize.ts` were not touched. Two calls went
  into upstream's `expand-elements.ts` and `scene.ts`, listed in `FORK.md`.
- **Verified:** `tests/elbow-binding.test.mjs`, two of three red before the fix (one replays the
  tab's restore through the renderer's bundle). `npm test` gave 97 of 97 plus wire, bind, render
  and state, and the corpus is unchanged. Playwright gave 22 of 22 with the system Chrome, through
  a scratch config, since the bundled shell is not installed. Live on port 3050: the pre-fix
  export, imported, kept both flows through a tab, and a fresh export re-exports byte-identical.

## 2026-11-16 (e) — T-027 and T-028 framed as three proposed ADRs; nothing built
- **What:** both tickets are design questions, so each was framed as decisions for the owner.
  ADR-003 covers how a screen shows its id. ADR-004 covers what a person's mark asks for. ADR-005
  covers approving a screen and ending a round. Each has four options with their costs, and none
  is marked recommended (cpc ADR-069). Both tickets carry a note pointing at their ADRs.
- **Found while framing T-028:** in dnd_crawler_rust's scene each screen's heading already starts
  with its number, at 22 px. Fitted to a 1,920 × 1,080 window (about 16 %), it is about 4 px tall,
  so the ask is about reading ids from an overview, not about adding them. Not checked: how the
  editor sizes a frame's name when zoomed out, which matters for ADR-003's option 2.
- **Opens:** CONTEXT's open question on frames is now ADR-003's option 2.

> Entries below dated 2026-07-31 were backfilled on 2026-08-01 from the commits and the baton; they
> are short by intent, not by neglect.
