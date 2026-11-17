<!-- status: active · updated: 2026-11-17 · class: living -->

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

## T-008 — A label given as text on a shape takes the shape's stroke colour, so it is nearly invisible on a white shape with a light border
- **Status:** triaged · 2026-11-16
- **From:** Scribe agent session driving the CLI (excalidraw-canvas 1.2.0, fork at 7c0ddbe) · 2026-10-07
- **Symptom:** A rectangle with backgroundColor #ffffff, strokeColor #e2e2e2 and "text": "Short form" draws its label in #e2e2e2 (the bound text element's strokeColor is #e2e2e2). The same shape with "label": {"text": ..., "strokeColor": "#1a1a1a"} draws it in #1a1a1a. wireframe-conventions section 4 recommends white secondary buttons with a #d7d5cc border, which gives exactly this; nothing in the skill mentions the label object or its colour.
- **Reproduce:** excalidraw-canvas add the two rectangles above; open one tab and pan once so the labels become elements; excalidraw-canvas query --type text and compare each label's strokeColor, or excalidraw-canvas screenshot. Met while drawing Scribe docs/wireframes/library.excalidraw (2026-10-05) and worked around with the label object.
- **Note:** 2026-11-16 — Rank 7, documentation. Part of the report does not hold: SKILL.md has said how to colour a label (the label object with its own strokeColor) since 505e8fe, 2026-07-30, and the cheatsheet and README say it too. What stands: wireframe-conventions section 4 recipes a white secondary button with a #d7d5cc border and never mentions the label's colour, so following it with the text shorthand gives a near-invisible label (src/core/expand-elements.ts:276, a label with no strokeColor takes the shape's). Fix: one line in that recipe; changing the default is upstream's code and the owner's call.
- **Resolution:** —

## T-005 — Screen naming picks the topmost heading, not the most screen-like one
- **Status:** triaged · 2026-11-16
- **From:** doc_assistant agent session driving the CLI from another repo (fork at 88416c7) · 2026-08-21 · docs/feedback/2026-08-21-provenote-wireframe-session.md §5
- **Symptom:** A 20px overlay caption above a 26px screen title named the screen after the caption ('Drop to add 12 documents'). Nearest-the-top and largest disagree more often than the conventions doc implies. Same note asks to bless clear --yes + re-add as the intended redraw loop for generated scenes.
- **Reproduce:** Two headings in one frame, the smaller one higher; wireframe names the screen after the higher one.
- **Note:** 2026-11-16 — Rank 8. Still open. Picking the largest heading near the top, rather than the topmost, is a change in wireframe.ts under rule 4. The second ask, saying clear --yes and re-add is the redraw loop for generated scenes, is one line in SKILL.md.
- **Resolution:** —

## T-004 — textAlign on a bound label round-trips but has no visual effect
- **Status:** triaged · 2026-11-16
- **From:** doc_assistant agent session driving the CLI from another repo (fork at 88416c7) · 2026-08-21 · docs/feedback/2026-08-21-provenote-wireframe-session.md §4
- **Symptom:** SKILL.md lists textAlign among label typography keys; it is stored and read back, but Excalidraw centres container-bound labels, so every row of a file list renders centred. The workaround (standalone text in the row) costs the reading: list-item 'filename' becomes list-item with a nested text.
- **Reproduce:** add a rectangle with label {text, textAlign: left}; screenshot shows it centred; get <id> shows textAlign: left. Ask: document the limit beside textAlign in SKILL.md § Element Format.
- **Note:** 2026-11-16 — Rank 7, documentation, to check first: SKILL.md line 62 still lists textAlign with the label keys and no limit. Excalidraw's editor offers left, centre and right for a container's text, so the centring may come from this toolkit's path (normalize or the renderer) rather than from Excalidraw. Try it in a tab before writing a limit into the skill.
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
