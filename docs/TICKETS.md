<!-- status: active · updated: 2026-10-07 · class: living -->

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

## T-011 — A tab that is panned or clicked rewrites an imported scene: every free-standing text moves by half its size and the reading loses half its components
- **Status:** open · 2026-10-07
- **From:** Scribe agent session driving the CLI (excalidraw-canvas 1.2.0, fork at 7c0ddbe) · 2026-10-07
- **Symptom:** After import of a scene this tool exported, the first pan or click in an open tab makes the tab write the scene back with every free-standing text element moved up and left by half its re-measured size (a heading: x 152 to 48.06, y 130 to 117.5, width 520 to 207.87, height 26 to 25). wireframe --score goes from 97 components to 47 and all three screens lose their names. If the tab was panned or clicked before the import, it happens within 5 s with no further interaction, with or without --replace. The same scene drawn with add is not affected: after the same pan and click it still reads 97. The file is untouched, but an export after this overwrites it with the shifted scene. SKILL.md says re-import, edit and export is how a diagram lives in a repo, and that round trips are safe. A likely cause: every free-standing text in an exported scene carries textAlign center, verticalAlign middle and autoResize true, though it was created with none of them, and the moved box is exactly the re-measured text centred on the old top-left corner. Worked around in Scribe by redrawing a saved scene with add instead of importing it (scripts/open_wireframe.py there): redrawn, both scenes read line for line as saved.
- **Reproduce:** With no tab: excalidraw-canvas import docs/wireframes/findings-beside-text.excalidraw --replace (pylvir-labs/Writing-App at 34eb574; library.excalidraw does the same); excalidraw-canvas wireframe --score gives 97 components. Open one tab, wait 6 s: still 97. Scroll the canvas once and click empty canvas, wait 5 s: wireframe --score gives 47, unnamedScreens 3; excalidraw-canvas get w-title shows the moved box.
- **Resolution:** —

## T-010 — changes reports the tab's own label-fitting resize as an edit by human, and the write-back has a trigger: the first pan or click
- **Status:** open · 2026-10-07
- **From:** Scribe agent session driving the CLI (excalidraw-canvas 1.2.0, fork at 7c0ddbe) · 2026-10-07
- **Symptom:** A rectangle added at 36x20 with "label": {"text": "3", "fontSize": 11} comes back from changes as Edited, by human: resized 36x20 to 36x23, with the bound arrow in the same scene reported beside it as in T-007. No element was touched. Ten such shapes made 10 of 11 by-human changes on a wireframe a person had only looked at. Nothing is written back until the tab is panned or clicked once: a tab left alone for 6 s, hovered, or screenshotted wrote nothing. That may be the trigger T-007 could not name. Found the same day, and worse than the wrong attribution: the reading treats a written-back arrow as a person's markup (collectMarkup in src/core/wireframe.ts: origin human and looksLikeAnnotation, which is true of every arrow), so after one pan or click a flow arrow leaves Navigation and is listed under Annotations. A wireframe that read 1 connection, 0 annotations reads 0 connections, 1 annotation. The drawing is unchanged.
- **Reproduce:** excalidraw-canvas add the rectangle above and a bound arrow; open one tab; note the rev from excalidraw-canvas changes; scroll the canvas once and click empty canvas; excalidraw-canvas changes --since <rev> lists both as by human. Same family as T-007; filed apart because the symptom differs and the trigger is new.
- **Resolution:** —

## T-009 — A bound arrow's waypoints are dropped when it is created; update keeps them
- **Status:** open · 2026-10-07
- **From:** Scribe agent session driving the CLI (excalidraw-canvas 1.2.0, fork at 7c0ddbe) · 2026-10-07
- **Symptom:** add of an arrow with startElementId, endElementId and "points": [[0,0],[120,0],[120,300],[340,300]] stores two points, a straight line between the two shapes: [[0,0],[412.9,247.8]]. No tab is attached, so the server does it. update of the same arrow with the same four points keeps all four.
- **Reproduce:** With no tab: excalidraw-canvas add two rectangles and an arrow bound to both with the four points above; excalidraw-canvas get <arrow id> shows two points. Then excalidraw-canvas update <arrow id> with the same points; get shows four. Wireframe-conventions section 7 says to route around intervening screens with waypoints, which a created arrow cannot do.
- **Resolution:** —

## T-008 — A label given as text on a shape takes the shape's stroke colour, so it is nearly invisible on a white shape with a light border
- **Status:** open · 2026-10-07
- **From:** Scribe agent session driving the CLI (excalidraw-canvas 1.2.0, fork at 7c0ddbe) · 2026-10-07
- **Symptom:** A rectangle with backgroundColor #ffffff, strokeColor #e2e2e2 and "text": "Short form" draws its label in #e2e2e2 (the bound text element's strokeColor is #e2e2e2). The same shape with "label": {"text": ..., "strokeColor": "#1a1a1a"} draws it in #1a1a1a. wireframe-conventions section 4 recommends white secondary buttons with a #d7d5cc border, which gives exactly this; nothing in the skill mentions the label object or its colour.
- **Reproduce:** excalidraw-canvas add the two rectangles above; open one tab and pan once so the labels become elements; excalidraw-canvas query --type text and compare each label's strokeColor, or excalidraw-canvas screenshot. Met while drawing Scribe docs/wireframes/library.excalidraw (2026-10-05) and worked around with the label object.
- **Resolution:** —

## T-007 — changes reports the first routing of a bound arrow as an edit by human
- **Status:** open · 2026-10-03
- **From:** BlackBox (unknown) · 2026-10-03
- **Symptom:** Three arrows the agent added with startElementId/endElementId at x 0, y 0 came back from changes --since 452 as Edited, by human: resized 0x0 to 224x36, path reshaped, arrowheads changed. No person had touched the canvas; the one open tab had written back the routed geometry. The skill says such reroutes are reported as by agent. **The consequence is in `wireframe`, not only in `changes`:** read straight after `add`, the scene gives `3 connections, 0 annotations` with a Navigation block; read again after the write-back (rev 764 → 770, nothing else changed) it gives `0 connections, 3 annotations` and the three flows are listed as human markup pointing at their target screens. The score stays clean (fallbacks 0, unnamedScreens 0, orphans 0), so the gate does not catch it, and the exported `.excalidraw` carries the second state.
- **Reproduce:** excalidraw-canvas add a scene with a bound arrow given no size, open one tab, then: excalidraw-canvas changes --since <rev after add>. Seen on arrows f-open, f-col and f-grants of BlackBox docs/wireframes/WF-04-source-page-and-table-screen.elements.json.
- **Resolution:** —

## T-006 — A corner-to-corner sidebar merges every sibling into one row, so the reading order goes column-major
- **Status:** open · 2026-09-22
- **From:** UI-Wizard agent session driving the CLI (excalidraw-canvas 1.2.0, fork at 7828a2d) · 2026-09-22
- **Symptom:** wireframe-conventions §4 requires the sidebar pinned corner to corner; with it, a sidebar-layout screen's main column reads column-major (every x=400 item top to bottom, then the x=896 column, then x=1144) — [tour] button 'Take the tour' is numbered 15, after [invoices-table], and the bento's right-hand tiles follow the table. Shortening [sidebar] to 400px restores row order, so the full-height band is what merges the rows. Score stays clean (fallbacks 0, orphans 0), so the gate does not catch it. **Seen again 2026-10-03, BlackBox WF-04:** screen `[s2]`, 23 main-column components numbered by x. That drawing now wraps its main column in one transparent `card` (`[s2-main]`, `[s3-main]`), which restores row order and is a workaround for this ticket: remove the two containers when this is fixed.
- **Reproduce:** excalidraw-canvas import C:/Projects/UI-Wizard/wireframes/dashboard/dashboard.excalidraw --replace; excalidraw-canvas wireframe (main column numbered 3–16 column-major); excalidraw-canvas update sidebar --set '{"height":400}'; excalidraw-canvas wireframe (row order). Ask: leave edge-pinned sidebar/header bands out of row grouping for their siblings.
- **Resolution:** —

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
