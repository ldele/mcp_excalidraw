<!-- status: active · updated: 2026-11-20 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: [`docs/archive/DEVLOG-archive-001.md`](archive/DEVLOG-archive-001.md). Rotation
began on 2026-10-08; the archive holds everything older than the entries kept here (three since
2026-11-16).

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

## 2026-11-20 (c) — ADR-007 accepted; T-002 and T-003 decided
- **Why:** the three owner decisions pending since 2026-11-17, ahead of PR 1's round 2.
- **What:** ADR-007 accepted as recommended, options 2 + 5 + 1: a "Send to Claude" box in the
  legend, a person's edits after the last send held back from `changes` and `wireframe`,
  `watch --until-sent`, and the skill's loop rewritten around the send. T-002: only an inferred
  `shape` counts as a fallback; a declared one is deliberate. T-003: one declared-only `progress`
  role for progress bars, meters and gauges. Recorded in the ADR and the tickets' notes; nothing
  built.
- **Rejected:** the header button now (ADR-007 option 3, after the box is tried); refusing a
  declared `shape` at the API; inferring `progress` from geometry.
- **Open:** build ADR-007, then T-002 with T-003; PR 1's round 2 is the first round with the box.

## 2026-11-20 (b) — T-029 and T-030 fixed: an agent's edit prepares only what it touches
- **Why:** entry (a): each agent edit re-prepared the whole drawing in the tab, and its read-only
  flip dropped a stroke being drawn.
- **What:** `prepareSceneUpdate` (`frontend/src/utils/scene.ts`) prepares the changed elements and
  their neighbours, with the neighbours' neighbours as context, and returns every other element as
  the tab's own object. `applyServerUpdate` (`App.tsx`) uses it for created, updated, deleted and
  batch messages, without `pauseSceneSync`; the whole-scene path is the fallback, and a failed
  apply reloads the scene (T-014). Same measurement, about 1,710 elements: 20 updates 1,234 ms →
  26 ms of handler time, 60 creates 5,141 ms → 67 ms, zero `measureText` calls for an unlabelled edit. Two strokes with
  agent edits arriving mid-stroke both landed, with no view-mode flip. A resized box's label re-flows as before.
  `tests/scene-update.test.mjs` (6 tests) holds it to the whole-scene result and to identity.
- **Rejected:** coalescing bursts into one redraw. After the fix a burst of 60 costs 136 ms in all,
  so there is nothing left for it to save.
- **Open:** the font `loadingdone` re-measure still re-prepares the whole scene; not measured as a cost.
