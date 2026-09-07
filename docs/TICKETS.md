<!-- status: active · updated: 2026-09-07 · class: living -->

# TICKETS — issues reported against mcp_excalidraw

One section per report, newest first (cpc ADR-047). A ticket is something somebody **reported** —
a consumer running a gate, a reader of a doc, a user of the app — and it is owed an answer. Open
one with `cpc-ticket new --title "…" --from "who (version) · date"`; close it with
`cpc-ticket close --id N --as fixed|declined|duplicate --note "where the answer went"`.
`cpc-ticket check` fails when this file stops being a ledger; `cpc-digest` lists the open ones.

Not a known issue: that is a weakness this project found in itself, logged the second time it bit
(`.claude/KNOWN_ISSUES.md`). A ticket may become one, or a fix, or a deliberate no — the
`Resolution` line says which. Nothing here is rewritten or deleted; a declined ticket keeps its
reason.

The first five are the findings of one consumer's session, filed from
`docs/feedback/2026-08-21-provenote-wireframe-session.md` (its §1–§5) the day the ledger was
created; the vendored cpc (1.8.0) predates `cpc-ticket`, so until the next re-vendor the verbs
run from the global install: `cpc-ticket --root . …`.

<!-- Tickets below, newest first. The five lines are read by cpc-ticket and cpc-digest:
     ## T-NNN — title
     - **Status:** open | triaged | fixed | declined | duplicate  · date
     - **From:** who reported it, at what version · when
     - **Symptom:** one line: what was seen, and where
     - **Reproduce:** the command, or the file and line
     - **Resolution:** — (while open) | a DEVLOG date, a CHANGELOG version, KI-N, or why not -->

## T-005 — Screen naming picks the topmost heading, not the most screen-like one
- **Status:** open · 2026-09-05
- **From:** doc_assistant agent session driving the CLI from another repo (fork at 88416c7) · 2026-08-21 · docs/feedback/2026-08-21-provenote-wireframe-session.md §5
- **Symptom:** A 20px overlay caption above a 26px screen title named the screen after the caption ('Drop to add 12 documents'). Nearest-the-top and largest disagree more often than the conventions doc implies. Same note asks to bless clear --yes + re-add as the intended redraw loop for generated scenes.
- **Reproduce:** Two headings in one frame, the smaller one higher; wireframe names the screen after the higher one.
- **Resolution:** —

## T-004 — textAlign on a bound label round-trips but has no visual effect
- **Status:** open · 2026-09-05
- **From:** doc_assistant agent session driving the CLI from another repo (fork at 88416c7) · 2026-08-21 · docs/feedback/2026-08-21-provenote-wireframe-session.md §4
- **Symptom:** SKILL.md lists textAlign among label typography keys; it is stored and read back, but Excalidraw centres container-bound labels, so every row of a file list renders centred. The workaround (standalone text in the row) costs the reading: list-item 'filename' becomes list-item with a nested text.
- **Reproduce:** add a rectangle with label {text, textAlign: left}; screenshot shows it centred; get <id> shows textAlign: left. Ask: document the limit beside textAlign in SKILL.md § Element Format.
- **Resolution:** —

## T-003 — No role for progress / meter / gauge
- **Status:** open · 2026-09-05
- **From:** doc_assistant agent session driving the CLI from another repo (fork at 88416c7) · 2026-08-21 · docs/feedback/2026-08-21-provenote-wireframe-session.md §3
- **Symptom:** A progress bar has no honest entry in the role vocabulary: chart reads as a graph to whoever builds it, panel loses the meaning; the consumer settled on nested panels, which reads as two boxes. ROADMAP already lists progress among candidate roles.
- **Reproduce:** docs/ROADMAP.md:106 names progress, slider, toggle, stepper, fieldset, nav as add-on-evidence roles; this is the first evidence.
- **Resolution:** —

## T-002 — role: shape is accepted by the API and then reported as a failure by the reading
- **Status:** open · 2026-09-05
- **From:** doc_assistant agent session driving the CLI from another repo (fork at 88416c7) · 2026-08-21 · docs/feedback/2026-08-21-provenote-wireframe-session.md §2
- **Symptom:** shape is in COMPONENT_ROLES (src/types.ts:135) so the API takes it, but wireframe warns 'N components read as shape — the fallback role' for a role that was declared on purpose (a progress bar the vocabulary cannot name).
- **Reproduce:** Declare role: shape on any element; wireframe --score counts it under fallbacks. Either reject an explicit shape or distinguish declared from inferred in the diagnostic.
- **Resolution:** —

## T-001 — A text element without width/height silently disappears from the reading, including the screen heading
- **Status:** triaged · 2026-09-07
- **From:** doc_assistant agent session driving the CLI from another repo (fork at 88416c7) · 2026-08-21 · docs/feedback/2026-08-21-provenote-wireframe-session.md §1
- **Symptom:** The server stores width: null, height: null for a text element created without them; with no bbox it is dropped from the reading, so 26 headings vanished and 3 screens could not be named — the documented happy path (a free-standing heading names the screen) does nothing, and the diagnostic points at the symptom.
- **Reproduce:** excalidraw-canvas add a text element with no width/height, then wireframe --score: unnamedScreens counts it, get <id> shows width None. Fix order proposed: measure text server-side; else reject at the API; at minimum say so in the could-not-be-named line.
- **Triage:** 2026-09-07 — traced, not fixed. The API takes a text element with no size (`src/server.ts:279` schema, width/height optional; the create handler at `src/server.ts:426` stores it as sent; `src/core/normalize.ts:52` returns standalone text untouched — nothing measures it). The reading drops any element whose box is empty at `src/core/wireframe.ts:545` (`boxOf`, `src/core/changes.ts:287`, turns a missing size into 0×0) with no count and no diagnostic. With a tab open, Excalidraw's `convertToExcalidrawElements` (`frontend/src/App.tsx:307`) measures the text and the sync (`frontend/src/App.tsx:837`) writes the size back — width/height are not in `EDITOR_DEFAULTS` (`src/core/changes.ts:142`), so the echo counts as a change and lands as a **human** 'resized' record: a second defect, a measurement reported as feedback. So the drop bites when the reading runs with no tab, or before the tab's first sync — confirm both halves by repro first. Fix order stands as proposed: measure server-side for the known font families (which also removes the false human delta); else 400 at the API; in every case count skipped sizeless text in the could-not-be-named line at `src/core/wireframe.ts:752`. Next session: the repro pair, then the diagnostic and the 400 (cheap and honest), measurement as the real fix.
- **Resolution:** —
