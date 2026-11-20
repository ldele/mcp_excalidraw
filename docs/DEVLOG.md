<!-- status: active · updated: 2026-11-20 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: [`docs/archive/DEVLOG-archive-001.md`](archive/DEVLOG-archive-001.md). Rotation
began on 2026-10-08; the archive holds everything older than the entries kept here (three since
2026-11-16).

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

## 2026-11-20 (a) — Canvas lag measured; T-029 and T-030 filed
- **Why:** the owner saw lag drawing on the canvas and asked for a measurement before any fix.
- **What:** a throwaway in-memory canvas (port 3011) seeded with a copy of the real 231-element
  drawing, then ×5 (1713 elements). In the tab, every WebSocket handler, React scheduler task and
  pointer handler was timed in-process. Agent edits are the cost: 88 ms each at 1713 elements,
  ~3,800 `measureText` calls to move one rectangle; 60 one-by-one creates in 1 s cost 5.1 s
  (T-029). An agent edit during a stroke drops the stroke (T-030). Hand drawing and scrolling are
  Excalidraw's own and fine. `scripts/perf-agent-edits.mjs` sends the agent bursts.
- **Rejected:** frame-gap and MessageChannel-gap probes. The pane was hidden, and Chromium's
  background throttling read as 36% load on an idle page.
- **Open:** the fix (frontend only, both tickets on one path) awaits the owner.
