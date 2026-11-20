<!-- status: active · updated: 2026-11-20 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: [`docs/archive/DEVLOG-archive-001.md`](archive/DEVLOG-archive-001.md). Rotation
began on 2026-10-08; the archive holds everything older than the entries kept here (three since
2026-11-16).

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

## 2026-11-20 (d) — ADR-007 built: markup is held until the person sends it (SPEC-009)
- **Why:** ADR-007, accepted in (c): in PR 1's round 1 the agent read a half-finished round.
- **What:** the legend gains a "Send to Claude" box, `legend-send`. `src/core/send-box.ts` (the
  rule, pure) holds a person's edits after the round start, or after the tick once there is one;
  `src/core/send-round.ts` applies it to `changes`, `wireframe` and their MCP tools, which print
  `⏸ N edits by a person, not sent yet.`, and adds `watch --until-sent` / `untilSent`, which
  returns the round once and redraws the box. The skill's loop: hand over, wait for the send,
  read once, answer in chat. 15 new tests; live round on a real tab passed (SPEC-009 § Verified).
- **Rejected:** a server-side wait (`src/server.ts` is upstream's: the client loops over the
  existing long-poll); undoing a person's edits to existing elements in the reading (the log's
  deltas are canonical, SPEC-009 row 6).
- **Open:** a person's move or relabel of an existing element still shows before the send, counted
  but not hidden; PR 1's round 2 is the first real round with the box.
