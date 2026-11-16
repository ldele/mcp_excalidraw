<!-- status: active · updated: 2026-11-16 · class: living -->

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

## T-028 — Screens on a large canvas are hard to tell apart and to name in a message
- **Status:** triaged · 2026-11-16
- **From:** dnd_crawler_rust session (1.3.0) · 2026-11-16
- **Symptom:** A 25-screen scene (ADR-0057 + S23/S24): a person reviewing by message must find and name a screen; screen ids live only in the reading. Asked for: something on the canvas that identifies each window at a glance (a visible id badge or number per screen frame, matching the reading's [id]) so 'S23, the doll' can be said and found.
- **Reproduce:** excalidraw-canvas wireframe on the dnd_crawler_rust ADR-0057 scene: ids like [s23] appear in the reading but not on the canvas
- **Note:** 2026-11-16 — Rank 3, with T-027. A design question tied to an open question in .claude/CONTEXT.md: whether Excalidraw's own frames should replace the plain rectangle a screen is drawn as today (wireframe-conventions line 46). A native frame shows its name on the canvas, which is the badge asked for. The cheaper path is a small id text drawn in each screen's corner, which the reading would then have to leave out of the screen's heading and components. Decide with T-027's ADR or one of its own.
- **Resolution:** —

## T-027 — A person marking up a wireframe has no convention to follow, so markup falls back to chat messages
- **Status:** triaged · 2026-11-16
- **From:** dnd_crawler_rust session (1.3.0) · 2026-11-16
- **Symptom:** Character screens S23/S24 (dnd_crawler_rust, ADR-0057 scene): the owner reviewed on the canvas but gave the changes by message; the skill names four gestures (arrow, circle, scribble, note) only for the agent, nothing on the canvas tells the human what to do or how to say 'done'. Asked for: a markup process with a convention a person can follow (e.g. a legend panel or palette for 'change / remove / question / approve', and a way to sign off a screen).
- **Reproduce:** excalidraw-canvas import docs/engine/wireframes/adr-0057-screens.excalidraw (dnd_crawler_rust) then hand the URL to a person: nothing on the canvas explains how to mark up
- **Note:** 2026-11-16 — Rank 3, with T-028: both are from one review and both stand between this project and ROADMAP PR 1, a person marking up through the loop (KI-3). This is a design question, not a defect. A legend frame the agent draws beside each scene changes only the skill and the conventions, but the reading must then leave it out. A palette read by changes.ts (for example, a note's colour for change, remove, question or approve) changes code. Sign-off per screen needs one of the two. Decide before building, with an ADR.
- **Resolution:** —

## T-026 — A tab connecting re-marks agent shapes as human, and the reading then reorders a row and reads an icon as markup
- **Status:** triaged · 2026-11-16
- **From:** BlackBox session (1.3.0) · 2026-11-15
- **Symptom:** WF-07 read clean at rev 3941 (4 screens, 216 components, 0 annotations). After one tab connected (rev 4887), 22 unlabelled agent shapes were reported 'text styling changed, by human' and stored origin:human; the reading then numbered [s1-k1..k3] 21/23/25 though they share [s1-k0]'s y (reading order broken), and [s2-close] (declared role icon, 26x26) left the components (216 to 215) and appears as '(rectangle markup) annotates [s2-p-src] (8px away)'.
- **Reproduce:** Draw BlackBox docs/wireframes/WF-07-home-and-quality-per-source.elements.json with add; wireframe --score; open one tab at http://127.0.0.1:3000; wireframe again and changes --since <rev before the tab>.
- **Note:** 2026-11-16 — Rank 2, with T-001. The review loop's claim, who made a change, is wrong again, and a declared component leaves the reading. Not reproduced today: WF-07 is in BlackBox. Lead, not checked: changes.ts says text styling changed when fontFamily or textAlign differs (src/core/changes.ts:601). An unlabelled shape stored with a font key that the editor drops would give exactly 22 such records, and T-012's EDITOR_DEFAULTS covers values the editor fills in, not keys it removes. The rest follows from origin human: collectMarkup takes a human rectangle near a component as markup ([s2-close]), and the reordered KPI row may be the same shapes changing row. First step: the reproduce line, then get on one of the 22 before and after the tab.
- **Resolution:** —

## T-024 — A tab opening the canvas drops the bindings of an elbowed arrow made through the API, so the reading loses its flows
- **Status:** triaged · 2026-11-16
- **From:** drawing-app session (1.3.0) · 2026-10-29
- **Symptom:** Three arrows created with elbowed: true, startElementId and endElementId (and points, later restored with update) were bound and wireframe listed 3 flows. When the owner's tab connected, changes reported each as 're-bound: s1-start -> s2 => nothing — by human' (rev 89 -> 94); get f-start then shows startBinding null and endBinding null, and wireframe prints no Navigation section. The score stays clean (it does not count flows), so only the reading shows it. The same arrows recreated without elbowed kept their bindings through the tab's sync (0 human changes, 3 flows).
- **Reproduce:** excalidraw-canvas add two rectangles and an arrow {elbowed: true, startElementId, endElementId, points with waypoints}; wireframe lists the flow; open the canvas in one tab; changes reports the re-bound edits by human and wireframe has no flow.
- **Note:** 2026-11-16 — Rank 3. Not reproduced today. Lead: the server stores an elbowed arrow's bindings with fixedPoint null (src/core/expand-elements.ts:211-220), and Excalidraw 0.18 binds an elbowed arrow by fixedPoint, so the tab likely unbinds it on load and syncs it back, which the change log records as a person's edit. Next: the ticket's steps on 1.3.0 and on upstream 2.2.0 (expand-elements.ts is upstream's), then either compute fixedPoint from the bound shape or refuse elbowed with bindings at the API. The reading's loss (no Navigation) is what makes it worth doing.
- **Resolution:** —

## T-021 — A tall sibling merges a stacked checkbox column into one row, so each checkbox loses its label
- **Status:** triaged · 2026-11-16
- **From:** pharma-dq-validator session driving the CLI (1.3.0) · 2026-10-21
- **Symptom:** Screen 1 [u-screen]: two 24px checkboxes stacked at x=986 (y=300, y=352), each with its label 8px to the right, beside two 262x120 drop zones (y=290-410). The drop zones overlap both checkbox rows, so inReadingOrder groups all four into the inputs' row and sorts by x: checkbox, checkbox, text, text. absorbControlLabels needs the label to be the next child, so [u-profile] and [u-ml] read as unlabelled checkboxes and their labels as separate texts (items 6-9). Score stays clean (fallbacks 0, inferred 0, orphans 0), so the gate does not catch it. Same root cause as T-006 (a tall element merges rows), but no edge-pinned band is involved, so T-006's ask would not fix it.
- **Reproduce:** excalidraw-canvas import C:/Projects/pharma-dq-validator/docs/wireframes/upload-and-report.excalidraw --replace; excalidraw-canvas wireframe (Screen 1, items 6-9). Moving the two drop zones to height 52 attaches both labels. Ask: absorb a tickbox label by geometry (nearest text to the right on the tickbox's own row) rather than by reading-order adjacency, or group rows before tall siblings swallow a stacked column.
- **Note:** 2026-11-16 — Rank 4, with T-006. Same family: inReadingOrder (src/core/wireframe.ts:244) puts any sibling that overlaps a row into it, so a tall element merges the rows beside it. One change to row grouping (a sibling taller than the row does not join it) may answer both; the ask here, to attach a tickbox label by geometry instead of by adjacency in absorbControlLabels (l.442), is separate and smaller. Not reproduced today: the drawing is in pharma-dq-validator. Rule 4 applies; make both reports fixtures.
- **Resolution:** —

## T-019 — The first test run after an install or a build does not start: the server is not ready within the wait
- **Status:** triaged · 2026-11-16
- **From:** Scribe agent session, closing its 2026-10-08 work (1.3.0) · 2026-10-09
- **Symptom:** On Windows with Node 24, straight after npm ci or npm run build, the first run of scripts/check-state-integrity.mjs (5 s health wait) or of Playwright (webServer, 15 s) times out or is slow: the browser suite took 1.4 to 1.8 min where a second run takes 35 s, and once reported Timed out waiting 15000ms from config.webServer. A second run is normal. Seen on 2026-10-07 (upstream's test:state, twice) and five times on 2026-10-08 (DEVLOG entries b, h, i, j and the dependency trial), on changed and unchanged code alike. Not explained. A guess, not checked: the antivirus scanning freshly written files. CI on Linux has not shown it.
- **Reproduce:** npm ci, npm run build, then at once npx playwright test with the installed Chrome (channel chrome): slow or the webServer timeout. Run it again: 19 passed in about 35 s. Either find the cause or lengthen the two waits; today the workaround is to run twice, which every script written on 2026-10-08 does by hand.
- **Note:** 2026-11-16 — Rank 6, test infrastructure. Not seen since 2026-10-08 as far as the DEVLOG says. Cheap way out without finding the cause: lengthen the two waits, the 5 s health wait in scripts/check-state-integrity.mjs (l.36) and the 15 s webServer timeout in the Playwright config. Close when a fresh install's first run passes.
- **Resolution:** —

## T-018 — The browser probes for tab sync and for cross-origin access live outside the repository
- **Status:** triaged · 2026-11-16
- **From:** Scribe agent session, closing its 2026-10-08 work (1.3.0) · 2026-10-09
- **Symptom:** Three scripts written on 2026-10-08 sit untracked in C:/Projects/mcp_excalidraw-upstream/tests/probe-fork, with a README.txt: tab-sync-reroute.spec.mjs (a shape moved through the API still drags its arrows after a tab syncs and after a person's drag), cross-origin-browser.spec.mjs and cross-origin-http.mjs (T-015 from four page origins in Chrome). The two checks in scripts/check-state-integrity.mjs that pin the same behaviour build the tab's payload and the browser's headers themselves, so if the page changes what it syncs, or Chrome what it sends, nothing in the repository notices. tests/browser has no test for either, and removing that worktree loses the scripts.
- **Reproduce:** ls tests/browser shows fixtures.mjs and scene-reload.spec.mjs only. To run a probe: copy it and playwright.probe.config.mjs into a fork checkout as the README.txt says, build, then PW_CHANNEL=chrome npx playwright test --config playwright.probe.config.mjs. Open question for whoever takes this: CI does not run the browser suite at all, so a test added to tests/browser runs only on a developer's machine.
- **Note:** 2026-11-16 — Rank 6, test infrastructure. The probes are still only in C:/Projects/mcp_excalidraw-upstream/tests/probe-fork (README.txt and five files, checked 2026-11-16). Moving tab-sync-reroute.spec.mjs and the two cross-origin probes into tests/browser is small; CI still runs no browser suite, so they would guard a developer's machine only. Do it before that worktree is removed.
- **Resolution:** —

## T-017 — npm run dev was never run under the T-015 guard: the Vite page on port 5173 is another origin
- **Status:** triaged · 2026-11-16
- **From:** Scribe agent session, closing its 2026-10-08 work (1.3.0) · 2026-10-09
- **Symptom:** Since 23e4afc the server refuses a request whose Origin is not its own page. In the dev flow the page is served by Vite on http://localhost:5173 and reaches the API and the socket through Vite's proxy, so it should get 403 on every write and on the socket unless CANVAS_ALLOWED_ORIGINS lists that origin. The README says so; nobody ran it, with the setting or without. Not known: whether the proxy forwards the Origin on the socket upgrade, and whether the setting alone is enough.
- **Reproduce:** npm run canvas in one terminal and npx vite in another; open http://localhost:5173, draw a shape, watch the network tab for 403. Stop the canvas, set CANVAS_ALLOWED_ORIGINS=http://localhost:5173, start it again, repeat. If the setting is not enough, the fix is in vite.config.js or in src/core/origin-guard.ts.
- **Note:** 2026-11-16 — Rank 5. Still never run. It needs two terminals and a browser, about 15 minutes, and its answer decides whether vite.config.js or src/core/origin-guard.ts changes. Nothing else waits on it unless someone uses npm run dev.
- **Resolution:** —

## T-008 — A label given as text on a shape takes the shape's stroke colour, so it is nearly invisible on a white shape with a light border
- **Status:** triaged · 2026-11-16
- **From:** Scribe agent session driving the CLI (excalidraw-canvas 1.2.0, fork at 7c0ddbe) · 2026-10-07
- **Symptom:** A rectangle with backgroundColor #ffffff, strokeColor #e2e2e2 and "text": "Short form" draws its label in #e2e2e2 (the bound text element's strokeColor is #e2e2e2). The same shape with "label": {"text": ..., "strokeColor": "#1a1a1a"} draws it in #1a1a1a. wireframe-conventions section 4 recommends white secondary buttons with a #d7d5cc border, which gives exactly this; nothing in the skill mentions the label object or its colour.
- **Reproduce:** excalidraw-canvas add the two rectangles above; open one tab and pan once so the labels become elements; excalidraw-canvas query --type text and compare each label's strokeColor, or excalidraw-canvas screenshot. Met while drawing Scribe docs/wireframes/library.excalidraw (2026-10-05) and worked around with the label object.
- **Note:** 2026-11-16 — Rank 7, documentation. Part of the report does not hold: SKILL.md has said how to colour a label (the label object with its own strokeColor) since 505e8fe, 2026-07-30, and the cheatsheet and README say it too. What stands: wireframe-conventions section 4 recipes a white secondary button with a #d7d5cc border and never mentions the label's colour, so following it with the text shorthand gives a near-invisible label (src/core/expand-elements.ts:276, a label with no strokeColor takes the shape's). Fix: one line in that recipe; changing the default is upstream's code and the owner's call.
- **Resolution:** —

## T-006 — A corner-to-corner sidebar merges every sibling into one row, so the reading order goes column-major
- **Status:** triaged · 2026-11-16
- **From:** UI-Wizard agent session driving the CLI (excalidraw-canvas 1.2.0, fork at 7828a2d) · 2026-09-22
- **Symptom:** wireframe-conventions §4 requires the sidebar pinned corner to corner; with it, a sidebar-layout screen's main column reads column-major (every x=400 item top to bottom, then the x=896 column, then x=1144) — [tour] button 'Take the tour' is numbered 15, after [invoices-table], and the bento's right-hand tiles follow the table. Shortening [sidebar] to 400px restores row order, so the full-height band is what merges the rows. Score stays clean (fallbacks 0, orphans 0), so the gate does not catch it. **Seen again 2026-10-03, BlackBox WF-04:** screen `[s2]`, 23 main-column components numbered by x. That drawing now wraps its main column in one transparent `card` (`[s2-main]`, `[s3-main]`), which restores row order and is a workaround for this ticket: remove the two containers when this is fixed. **Seen again 2026-11-05, doc_assistant `docs/wireframes/library-summary.excalidraw` (1.3.0):** screens `[s1]` and `[s2]`, four KPI tiles on one `y` numbered 5, 15, 16, 19 and the title row's `[s1-recount]` last; drawn without a workaround. A 9-element scene (frame, sidebar, title, four tiles in a row, one full-width row, two cards) gives tiles 3, 6, 7, 9 with the sidebar and 2-5 without it.
- **Reproduce:** excalidraw-canvas import C:/Projects/UI-Wizard/wireframes/dashboard/dashboard.excalidraw --replace; excalidraw-canvas wireframe (main column numbered 3–16 column-major); excalidraw-canvas update sidebar --set '{"height":400}'; excalidraw-canvas wireframe (row order). Ask: leave edge-pinned sidebar/header bands out of row grouping for their siblings.
- **Note:** 2026-11-16 — Rank 4, with T-021: three reports now (UI-Wizard, BlackBox, doc_assistant 2026-11-05), all with a clean score. One change to row grouping in inReadingOrder may answer both; see T-021's note. BlackBox's two wrapper cards are to be removed once it lands.
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

## T-001 — A text element without width/height silently disappears from the reading, including the screen heading
- **Status:** triaged · 2026-11-16
- **From:** doc_assistant agent session driving the CLI from another repo (fork at 88416c7) · 2026-08-21 · docs/feedback/2026-08-21-provenote-wireframe-session.md §1
- **Symptom:** The server stores width: null, height: null for a text element created without them; with no bbox it is dropped from the reading, so 26 headings vanished and 3 screens could not be named — the documented happy path (a free-standing heading names the screen) does nothing, and the diagnostic points at the symptom.
- **Reproduce:** excalidraw-canvas add a text element with no width/height, then wireframe --score: unnamedScreens counts it, get <id> shows width None. Fix order proposed: measure text server-side; else reject at the API; at minimum say so in the could-not-be-named line.
- **Triage:** 2026-09-07 — traced, not fixed. The API takes a text element with no size (`src/server.ts:279` schema, width/height optional; the create handler at `src/server.ts:426` stores it as sent; `src/core/normalize.ts:52` returns standalone text untouched — nothing measures it). The reading drops any element whose box is empty at `src/core/wireframe.ts:545` (`boxOf`, `src/core/changes.ts:287`, turns a missing size into 0×0) with no count and no diagnostic. With a tab open, Excalidraw's `convertToExcalidrawElements` (`frontend/src/App.tsx:307`) measures the text and the sync (`frontend/src/App.tsx:837`) writes the size back — width/height are not in `EDITOR_DEFAULTS` (`src/core/changes.ts:142`), so the echo counts as a change and lands as a **human** 'resized' record: a second defect, a measurement reported as feedback. So the drop bites when the reading runs with no tab, or before the tab's first sync — confirm both halves by repro first. Fix order stands as proposed: measure server-side for the known font families (which also removes the false human delta); else 400 at the API; in every case count skipped sizeless text in the could-not-be-named line at `src/core/wireframe.ts:752`. Next session: the repro pair, then the diagnostic and the 400 (cheap and honest), measurement as the real fix.
- **Note:** 2026-10-07 — Re-tested on the 2.1.2 merge plus S3 (branch merge/upstream-2.1.2). With no tab: unchanged. A text element added without width/height is stored with none, the reading drops it and wireframe --score gives unnamedScreens 1. With a tab, after its first sync: the text takes the measured box (178x30 for a 26 px heading), keeps origin agent, leaves no change record, and the screen is named. Before S3 that happened only when the text also lacked a stroke colour or a font, and then as an edit by human (T-012). Still open: the no-tab case. The server measures nothing and the reading does not say what it dropped.
- **Note:** 2026-11-16 — Rank 2, after T-022 and T-025, which lose work; unchanged since the 2026-10-07 note: with no tab a text element added without a size is still stored without one and dropped from the reading. The fix order in the 2026-09-07 triage stands.
- **Resolution:** —
