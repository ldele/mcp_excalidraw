<!-- status: active · updated: 2026-11-20 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: [`docs/archive/DEVLOG-archive-001.md`](archive/DEVLOG-archive-001.md). Rotation
began on 2026-10-08; the archive holds everything older than the entries kept here (three since
2026-11-16).

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

## 2026-11-20 (f) — PR 1 round 2: two human marks, both hits; the first round sent with the box
- **Why:** ROADMAP PR 1 / KI-3, the attribution measure, after ADR-007 was built in (d).
- **What:** the agent drew SockCast, a nonsense three-screen wireframe the owner asked for in
  place of a real design, on an in-memory canvas (port 3011), with the legend. The owner marked it
  up in the browser pane and sent it with the Send box; `watch --until-sent` returned the round
  once. Two review marks (red loop round S03, orange loop round S02), both bound to the screen the
  person meant: baseline 10 / 11. Pinned as `human-round-2`. The legend's approval line now shows a
  ticked example box after "Tick", asked for during the round.
- **Findings:** a tick that landed across the Send box's corner (its centre outside) was no send,
  and `changes` read it as markup on a list item 138px away while `wireframe` listed nothing. The
  person moved the Send box and the legend's example tick while trying to tick with the selection
  tool. A mark drawn after the reset was held, as designed. The owner chose the header button
  (ADR-007 option 3), to build next.
- **Open:** a round with marks on single components (KI-3 stays open); the Send button.

## 2026-11-20 (e) — T-002 and T-003 fixed: a declared `shape` is no fallback; a `progress` role
- **Why:** the owner's decisions in (c), on one consumer's report (a progress bar with no role).
- **What:** `scoreWireframe` counts a `shape` as a fallback only when the reading inferred it.
  `progress` joins `COMPONENT_ROLES`, declared only; a progress node takes its children in (a
  short painted fill would read as a button, a thin one as a divider). Both role lists in the
  skill, a recipe row (the fill under a transparent track, so the track's label shows), README,
  ROADMAP. `tests/role-progress.test.mjs` (5, red first) and the `progress-role` fixture, drawn
  live: the declared roles survived a person's move in a real tab; every other golden unchanged.
- **Rejected:** refusing a declared `shape` at the API; inferring `progress` from geometry.
- **Open:** none; PR 1's round 2 is next.
