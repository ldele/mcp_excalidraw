<!-- status: active · updated: 2026-11-20 · class: living -->

# TICKETS — issues reported against mcp_excalidraw

One section per report, newest first (cpc ADR-047). A ticket is something somebody **reported** —
a consumer running a gate, a reader of a doc, a user of the app — and it is owed an answer. Open
one with `cpc-ticket new --title "…" --from "who" --at X.Y.Z`, the version the reporter was
running (`unknown` when they cannot say); close it with
`cpc-ticket close --id N --as fixed|declined|duplicate --note "where the answer went"`.
Before working on one, `cpc-ticket triage --id N` prints what was released since that version and
whether the lines it cites are still there (cpc ADR-055). Vendored, each verb is
`python tools/conventions/run.py ticket …`. `cpc-ticket check` fails when this file stops being a
ledger.

Not a known issue: that is a weakness this project found in itself, logged the second time it bit
(`docs/KNOWN_ISSUES.md`). A ticket may become one, or a fix, or a deliberate no — the
`Resolution` line says which. Once closed, a ticket leaves this file, word for word, for
`docs/archive/TICKETS-archive-NNN.md`, and `docs/archive/TICKETS-INDEX.md` lists it with its
status (cpc ADR-071, `[tickets] archive_on_close`), so this file holds what is still open.
Nothing is rewritten or deleted; a declined ticket keeps its reason.

T-001 to T-005 are one consumer's session, filed from
`docs/feedback/2026-08-21-provenote-wireframe-session.md` (its §1–§5) the day the ledger was
created.

<!-- Tickets below, newest first. The five lines are read by cpc-ticket and cpc-digest:
     ## T-NNN — title
     - **Status:** open | triaged | fixed | declined | duplicate  · date
     - **From:** who reported it, at what version · when
     - **Symptom:** one line: what was seen, and where
     - **Reproduce:** the command, or the file and line; `path:LINE at vX.Y.Z` can be traced
     - **Note:** date — what triage changed (optional; `cpc-ticket triage --id N --note` adds it)
     - **Resolution:** — (while open) | a DEVLOG date, a CHANGELOG version, KI-N, or why not -->

## T-030 — An agent edit during a person's stroke drops the stroke
- **Status:** triaged · 2026-11-20
- **From:** owner, drawing on the canvas (1.3.0) · 2026-11-20
- **Symptom:** A pencil stroke in progress when an agent update arrives is never created (freedraw count unchanged, twice); the same stroke with no agent edit lands. The tab flips into view mode for each incoming edit.
- **Reproduce:** frontend/src/App.tsx:483 calls pauseSceneSync(), which sets sceneLoadStatus to loading, and App.tsx:1049 viewModeEnabled={sceneLoadStatus !== 'ready'}; start a stroke, then node scripts/perf-agent-edits.mjs update 3 400 <port>
- **Note:** 2026-11-20 — Reproduced twice against a control stroke that lands. Cause is the view-mode flip from pauseSceneSync on every incremental message (T-029's path). Fix with T-029; a person's in-progress element must survive an incoming agent edit.
- **Resolution:** —

## T-029 — Each agent edit rebuilds and re-measures the whole scene in the tab
- **Status:** triaged · 2026-11-20
- **From:** owner, drawing on the canvas (1.3.0) · 2026-11-20
- **Symptom:** On a 1713-element drawing every element_created/updated costs the tab ~88 ms (62 ms WebSocket handler + 26 ms React) and ~3,800 measureText calls to move one rectangle; 60 one-by-one creates in 1 s cost 5.1 s of handler time, so the canvas freezes ~4 s behind the agent.
- **Reproduce:** frontend/src/App.tsx:483 (mergeAndApplySceneElements -> applyServerScene with refreshDimensions: true over the whole scene); node scripts/perf-agent-edits.mjs create 60 10 <port> against a throwaway canvas holding a large scene
- **Note:** 2026-11-20 — Measured in a hidden browser pane with each handler timed in-process (gap probes read Chromium's background throttling as load). Scales with the drawing: ~15 ms per edit at 231 elements, 88 ms at 1713. Hand drawing is not the problem: pointer moves <0.5 ms, pointer-down 57 ms, auto-save 26 ms. Fix in frontend/ only: apply incremental edits without pauseSceneSync, refreshDimensions only for changed containers, coalesce a burst into one updateScene. Same code path as T-030; fix together.
- **Resolution:** —

## T-003 — No role for progress / meter / gauge
- **Status:** triaged · 2026-11-16
- **From:** doc_assistant agent session driving the CLI from another repo (fork at 88416c7) · 2026-08-21 · docs/feedback/2026-08-21-provenote-wireframe-session.md §3
- **Symptom:** A progress bar has no honest entry in the role vocabulary: chart reads as a graph to whoever builds it, panel loses the meaning; the consumer settled on nested panels, which reads as two boxes. ROADMAP already lists progress among candidate roles.
- **Reproduce:** docs/ROADMAP.md:106 names progress, slider, toggle, stepper, fieldset, nav as add-on-evidence roles; this is the first evidence.
- **Note:** 2026-11-16 — Rank 8, a decision. This is the first evidence ROADMAP's add-on-evidence rule asks for (docs/ROADMAP.md line 114 lists progress). Decide with T-002: the consumer declared shape because the vocabulary had no progress role. Adding a role means COMPONENT_ROLES, inference or declaration only, the two role lists in the skill (tests/role-docs.test.mjs holds them to the code) and a fixture.
- **Resolution:** —

## T-002 — role: shape is accepted by the API and then reported as a failure by the reading
- **Status:** triaged · 2026-11-16
- **From:** doc_assistant agent session driving the CLI from another repo (fork at 88416c7) · 2026-08-21 · docs/feedback/2026-08-21-provenote-wireframe-session.md §2
- **Symptom:** shape is in COMPONENT_ROLES (src/types.ts:135) so the API takes it, but wireframe warns 'N components read as shape — the fallback role' for a role that was declared on purpose (a progress bar the vocabulary cannot name).
- **Reproduce:** Declare role: shape on any element; wireframe --score counts it under fallbacks. Either reject an explicit shape or distinguish declared from inferred in the diagnostic.
- **Note:** 2026-11-16 — Rank 8, with T-003. Confirmed in code: scoreWireframe counts every node whose role is shape (src/core/wireframe.ts:868), declared or not. Fix one of two ways: count only an inferred shape, or refuse a declared shape at the API. T-016's resolution left the same question open for screen and panel. The owner chooses; both are small.
- **Resolution:** —
