<!-- status: active · updated: 2026-11-20 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: [`docs/archive/DEVLOG-archive-001.md`](archive/DEVLOG-archive-001.md). Rotation
began on 2026-10-08; the archive holds everything older than the entries kept here (three since
2026-11-16).

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

## 2026-11-19 (a) — cpc deny rules laid in `.claude/settings.json`
- **Why:** the maintainer wants every project set up before cpc ADR-080 to carry the deny rules
  newer `cpc-init` profiles lay by default, so Claude Code refuses the agent's own commit, push,
  merge and tag.
- **What:** `cpc-init --root . --add deny-rules` created `.claude/settings.json` (22 entries:
  `git commit|push|merge|tag`, the `git -C` forms, `gh pr merge`, `gh release create`, and
  `CPC_PUSH_OK`, each for Bash and PowerShell). `docs_check --strict` and `init_check` pass.
- **Open:** `.claude/CONTEXT.md` rule 1 ("or gives explicit per-commit approval") and the project
  memory `commits-land-on-main` described an agent that commits after a yes. The owner chose to
  reword to match the deny rules: CONTEXT.md rule 1 and the memory now say the owner runs each
  commit, push, merge and tag; AGENTS.md rule 1 is reworded too.
