<!-- status: active · updated: 2026-11-16 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: [`docs/archive/DEVLOG-archive-001.md`](archive/DEVLOG-archive-001.md). Rotation
began on 2026-10-08; the archive holds everything older than the entries kept here (three since
2026-11-16).

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

## 2026-11-16 (d) — T-026 and T-001 fixed: a tab's first sync leaves shapes the agent's; unsized text is read
- **T-026:** reproduced with the built-in browser as the tab, on a private canvas (BlackBox's WF-07
  is not on this machine). After the first click, unlabelled shapes drawn with `fontFamily`,
  `textAlign` or `fontSize` came back as "text styling changed, by human", and their origin
  flipped. Only text has a font, and the editor drops those keys from anything else, so
  `canonicalizeElement` (`src/core/changes.ts`) now compares them on text only. On the fixed build
  the same click sent 10 syncs and left 0 records, with every element still the agent's.
- **T-001:** `boxOf` gives text stored without a size the box export estimates, so with no tab
  the text is read and a heading names its screen. The entry says `size estimated` (SKILL.md
  says why). The server still stores no size, so a tab's measurement replaces the estimate.
  **Rejected:** measuring on the server, which would keep the estimate over the editor's.
- **Rule 2:** no file of upstream's touched.
- **Verified:** a test for each, both red before the fix. `npm test` gave 94 of 94 plus wire,
  bind, render and state; the corpus is unchanged; both type-checks pass. Not run: the browser
  suite. Seen in passing: one click gave 10 syncs, which looks like the autosync loop upstream's
  #142 stops.

> Entries below dated 2026-07-31 were backfilled on 2026-08-01 from the commits and the baton; they
> are short by intent, not by neglect.
