<!-- status: active · updated: 2026-11-27 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: [`docs/archive/DEVLOG-archive-001.md`](archive/DEVLOG-archive-001.md). Rotation
began on 2026-10-08; the archive holds everything older than the entries kept here (three since
2026-11-16).

## 2026-11-27 — a recipe for menus and dialogs
- **Why:** a desktop wireframe needs a menu row, an open menu with its groups and a dialog; §4
  had no recipe for any of them.
- **What:** `wireframe-conventions.md` §4 gains one: the menu row as a `header` of transparent
  `button`s, an open menu as a `card` of `list-item`s with `divider`s, a dialog as a frame of its
  own named *(dialog over S01)* with a flow from its entry. Drawn and read on port 3917 with
  `dist/bin.js` 1.3.0: the reading nests as written, flow included, score 0 fallbacks, 0 orphans.
  `npm run sync:skills` run.
- **Rejected:** a dialog drawn over the screen inside its frame: it reads `card?`, a guess, and the
  same as a card.
- **Opens:** no `dialog` or `menu` role, and a dialog's place over its screen is not in the
  reading; filed to the inbox the same day.

## 2026-11-21 — T-031 fixed: a line or arrow the page re-based is no edit
- **Why:** T-031, found in (g): an agent's path whose first point is not the origin came back from
  a tab's first save as "moved, path reshaped — by human".
- **What:** probed with the page's own scene preparation: it re-bases a line and an arrow (first
  point to the origin, x and y moved by it), not a freedraw. `canonicalizeElement`
  (`src/core/changes.ts`, ours) now compares every path re-based, its origin rounded as the points
  are, so the echo matches; a move or reshape after it still reads as one. 4 tests in
  `tests/frontend-echo.test.mjs` from the probed payloads, 3 red first. Live on port 3011: an
  agent's off-origin line and arrow, a tab, a save; the log held only the button's tick, both paths
  still `agent`. Corpus goldens unchanged.
- **Rejected:** re-basing paths when the agent writes them (`src/core/normalize.ts` and
  `src/server.ts` are upstream's, and scenes already stored would still echo).
- **Open:** a path's move in `changes` now names its first point's position, not the stored x, y.

## 2026-11-20 (g) — the header's "Send to Claude" button (ADR-007 option 3); T-031 found
- **Why:** PR 1's round 2, (f): the person moved the Send box while trying to tick it. The owner
  chose the button.
- **What:** on a scene with the legend's Send box the page header shows "Send to Claude"; a click
  draws a tick in the box (`src/core/send-tick.ts`, shared with the reading) and saves through the
  ordinary sync, so the agent sees a person's tick and the send rule is unchanged. A fresh tick per
  click, so a person can send again. `syncToBackend` resolves whether the save went through.
  `tests/send-tick.test.mjs` (6), `tests/browser/send-button.spec.mjs` (2). Live on port 3011: a
  click made `watch --until-sent` return the round once and clear the box. FORK.md row, README,
  ADR-007, the skill's hand-over line and conventions § 8.
- **Found:** that live round reported the legend's example tick "moved down 7px — by human",
  untouched: the tab re-bases a line whose first point is not the origin, and the sync records it
  as the person's move. Round 2's "the person moved the example tick" in (f) was this, not the
  person (the Send box's move was theirs); the round-2 fixture's note is corrected. The legend's
  tick and the button's start at the origin now; a re-check recorded only the button's tick. The
  general case, any agent line or arrow, is T-031.
- **Rejected:** filling the box on click (a second send would change nothing); a new server route.
- **Open:** T-031; a round with marks on single components (KI-3).
