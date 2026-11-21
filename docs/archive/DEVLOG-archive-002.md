<!-- status: archived · updated: 2026-11-18 · class: append-only -->

# DEVLOG archive 002

Rotated DEVLOG entries — moved here from `docs/DEVLOG.md` once it held more than 3, **verbatim** per cpc ADR-023 rule 13b and cpc ADR-053. Newest entry on top. Append-only; never edited.

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

## 2026-11-18 (a) — Upstream's `claude_desktop_config.json` removed
- **Why:** the owner asked how agents reach the canvas. The answer is the `npm link`ed
  `excalidraw-canvas` CLI, and no MCP server is registered. That turned up the repo-root config
  left from upstream (`110bb19`). It ran `npx -y excalidraw-mcp`, a package that is neither this
  fork nor upstream, so pasting it into a client fetched a stranger's code.
- **What:** the file is deleted and logged in FORK.md § What we removed. README § MCP clients
  already gives the right config (`node <repo>/dist/index.js`, or `excalidraw-canvas`). Upstream
  has not edited the file since its second commit, so a merge conflict is unlikely; if it comes,
  keep the file deleted.

## 2026-11-17 (m) — ADR-007 proposed: a person's markup reaches the agent when they send it
- **Why:** the owner, after PR 1's round 1: the agent read the canvas mid-round and gave its view
  before the person had finished; it should wait for the end of the markup, perhaps with a
  Claude Docs-style "send to Claude" for one comment, without becoming intrusive.
- **What:** `docs/decisions/ADR-007-markup-is-sent-not-watched.md`, proposed, to decide
  2026-11-18: seven options (etiquette in the skill, a Send box on the canvas, a Send button in
  the page, a longer quiet period, holding unsent markup back from the reading, `@claude` for one
  comment, the agent answering on the canvas). Recommended: the Send box, unsent markup held back,
  and the skill's loop rewritten around the send; the button next, `@claude` only on evidence.
  Nothing built.

## 2026-11-17 (l) — T-005 fixed: a screen is named by its largest own heading, not its topmost
- **Why:** a 20px overlay caption above a 26px title named the screen after the caption
  (doc_assistant, 2026-08-21): `deriveScreenName` took the first heading in reading order.
- **What:** it now takes the largest heading that sits directly in the screen or in its header
  bar, the first in reading order on a tie; a heading deeper in, inside a card, names the screen
  only when there is no other, as before. Conventions § 1 says so. SKILL.md now says `clear --yes`
  and add it all again is the way to redraw a generated scene, the report's second ask.
- **Checked:** none of 62 screens renamed across the corpus and five real drawings (pharma,
  UI-Wizard twice, doc_assistant, dnd_crawler). `tests/screen-name.test.mjs` (5, two red first);
  live on port 3086, the caption above "Library" no longer names the screen. 251 / 251.

## 2026-11-17 (k) — T-004 fixed, T-008 documented: a label goes where it is aligned, and needs its own colour
- **T-004:** not Excalidraw's limit, as the report supposed, but upstream's page code:
  `recenterBoundShapeTextElements` (`frontend/src/utils/scene.ts`, upstream #61) moved every bound
  label to its shape's middle, so `textAlign: "left"` was stored, read back and drawn centred, in a
  tab and in the headless PNG (which bundles the same function). It now places the label by its
  `textAlign` and `verticalAlign`, 5px from the edge, as Excalidraw does; the default is centred as
  before. `tests/label-align.test.mjs` (3, two red first); FORK.md row; seen live in a tab and a PNG
  on port 3085, the tab's load making no record. Files with left-aligned labels now draw them left.
- **T-008:** confirmed in the same PNG: a `"text"` label on a `#d7d5cc` border is drawn in that
  grey. Conventions § 4 now says to colour every label on a light border, and the secondary-button
  recipe gives `#14130f`; SKILL.md says why. The default stays upstream's.

> Entries below dated 2026-07-31 were backfilled on 2026-08-01 from the commits and the baton; they
> are short by intent, not by neglect.

## 2026-11-17 (j) — T-018 and T-019: the browser probes join the suite; the first run's waits lengthened
- **T-018:** two of the three probes kept since 2026-10-08 in an untracked folder of the upstream
  worktree are now tests with assertions in `tests/browser/`: `tab-sync-reroute.spec.mjs` (both
  bound arrows follow every API move of a shape, with no tab, an unsynced tab, after a manual sync,
  after a reload, after the tab's own sync, and after a person's drag) and `cross-origin.spec.mjs`
  (a page from another local port, and one from a file on disk, is refused a read, a write, the
  socket and a clear, and the canvas is untouched). The probe's public-website cases needed the
  internet and are left out. `cross-origin-http.mjs` is not ported: the state check *requests
  from another site are refused* sends the same raw HTTP and socket. The worktree folder can go.
- **Seen red:** with the guard switched off in the build, the cross-origin test failed on both
  pages, on the socket: Chrome's own CORS already blocks the HTTP calls, so the socket is what
  the guard holds alone. The tab-sync test pins what the fork has done since 2026-10-08; upstream's
  sync is its red (DEVLOG archive 2026-10-08 (e)).
- **T-019:** the state check's health wait is 30 s (was 5) and Playwright's `webServer` timeout
  60 s (was 15); both return as soon as the server answers. Not reproduced: after `npm ci` and a
  build, the first state check took 3 s and the first browser run 1.8 min, 35 passed. The cause
  stays unknown; the waits are the margin.
- **Browser suite:** 35 / 35 with the installed Chrome (a scratch config, not staged: this
  Playwright's own Chromium build is not on this machine), twice.

## 2026-11-17 (i) — T-017 run and fixed: `npm run dev` syncs, and the guard still refuses other sites
- **Why:** since T-015 the canvas refuses any page Origin but its own; the Vite dev flow had never
  been run under it.
- **Found** (a memory-only canvas on 3000, so port 3000's saved scene was never touched; Vite on
  5175, since 5173 was another project's dev server): the dev page read Disconnected. Its socket
  opens at the page's own host, and Vite's proxy had no socket entry, so it never reached the
  canvas. Every proxied API call, GET included, got 403. So `CANVAS_ALLOWED_ORIGINS` alone, which
  the README advised, would have fixed the API and not the socket.
- **What:** `scripts/vite-dev-proxy.mjs`, wired into upstream's `vite.config.js` (FORK.md): the
  proxy carries the socket (`^/$`, upgrades only; Vite still serves the page) and gives a request
  whose Origin is the Vite server it was sent to the canvas's Origin. Any other Origin is forwarded
  as it came. `tests/dev-proxy.test.mjs` (5, red first).
- **Verified live:** the page Connected; a rectangle drawn on it reached the canvas as one change by
  a person; through the proxy, the page's own Origin got 200 on the API and opened the socket, while
  `https://evil.example` and `http://localhost:5173` got 403 on both. Vite's hot reload still
  connects; `vite build` passes. README's dev section and 403 note rewritten.
- **Rejected:** Vite's `rewriteWsOrigin` (rewrites every Origin, which reopens T-015's hole for the
  socket); widening the guard to any localhost port (another local dev server is another site).

## 2026-11-17 (h) — T-006 and T-021 fixed: an element beside a stacked column reads as a column
- **Why:** both tickets, rank 4, four reports between them (UI-Wizard, BlackBox, doc_assistant,
  pharma-dq-validator), all with a clean score. `inReadingOrder` grew a row's band to its tallest
  member, so a full-height sidebar or two tall drop zones swallowed every row beside them, the
  main column read sorted by x and two checkboxes lost their labels.
- **What:** in `src/core/wireframe.ts`, a sibling with two or more stacked siblings beside it,
  within its height, is a column. Rows are grouped from the rest; the column reads as one block
  with what sits under it in its own width, before the rows it spans when it stands to their left,
  after them when to their right. No threshold to calibrate.
- **Rejected first:** a height-over-median ratio (it took S01's save card for a column) and
  joining a column to the row of its top edge (S07's detail card landed mid-list). Both pinned.
- **Real drawings:** the three reports read from their files (read-only) are fixed; UI-Wizard's
  legacy dashboard is T-006's own drawing, and its expected reading was regenerated (order only,
  checked). The owner's dnd scene changes in seven screens with a side column beside a list (S04,
  S17, S18, S22, S26, S28, S30): two read better as columns, five move a side card by one item;
  none worse; dnd_crawler's committed reading file will differ when next regenerated.
- **Tests:** `tests/reading-order.test.mjs` (6: the two reports seen red, four layouts that must
  not break); fixtures `sidebar-rows` and `stacked-checkboxes`; the harness checks a stated
  `readingOrder` and `checkboxLabels`. Every older golden unchanged. Live on port 3083 with a tab.
  238 / 238.
- **Opens:** BlackBox's two wrapper cards (`[s2-main]`, `[s3-main]`) can go.

## 2026-11-17 (g) — PR 1 round 2 not run: an approved scene gives nothing to mark
- **What:** the round-1 scene was reopened on port 3080 for a second round (it read clean, S01
  approved by the owner's loop since ADR-006, the tab's load made no record). The owner pointed
  out that the scene was already approved, so there was nothing they wanted changed; no mark was
  drawn and the round was stopped.
- **Lesson:** the attribution measurement needs a design under real review. Marks invented for
  the test would measure an imitation, as the agent-drawn corpus does. KI-3 now says how to close
  it: take round 2 from the next real review.

## 2026-11-17 (f) — KI-10 fixed: a ring round a whole screen is about it, and a green one approves it (ADR-006)
- **Why:** PR 1 round 1's only mark, a green loop round S01 meaning "S01 is fine", bound to a
  heading inside the screen, and nothing read S01 as approved (it had no room for a box).
- **What:** `attributeAnnotation`'s `encloses` skipped containers, against `findContainers`' own
  comment; it now targets the largest container a mark wholly rings, else the smallest component
  as before. ADR-006, the owner's call: a "fine" mark that rings a whole screen approves it, box or
  no box, and stays an annotation; `changes` adds `↳ approves screen`. Conventions § 8, SKILL.md,
  README.
- **Tests:** `tests/attribution.test.mjs` (4, two seen red), four in `tests/approval.test.mjs`
  (two seen red, two pinning what must not change); `human-round-1` flips to a hit that approves
  S01; baseline 8 / 9; no other binding moved. Live on port 3082: a green ring drawn in the tab
  round a frame reads `circles / marks [s01]` and `approves screen [s01]`. 207 / 207.
- **Rejected:** approving by a ring in any colour (a red ring round a screen means change it).

## 2026-11-17 (e) — The lint recalibrated on a real drawing: 14 false errors to none (SPEC-008)
- **Why:** on the owner's dnd_crawler wireframe, which reads with all zeros and was ruled right,
  PR 4's lint gave 14 errors and 24 advisories (DEVLOG 2026-11-17 (d)).
- **What:** `bar-short` judges rectangles only (six errors were cards' heading text);
  `row-split` needs boxes of a size, the shorter ≥ 75% of the taller (eight errors were short
  items grazing taller cards in the next column); `sibling-overlap` ignores overlaps within the
  reader's 2px slack (22 advisories were headings touching their notes by 0.6px). Conventions § 9
  says so.
- **Result:** that scene 0 errors and 2 advisories (S09's buttons, overlapping by 6px, real).
  UI-Wizard's dashboard still none; every golden unchanged; `human-round-1` loses its pinned 0.6px
  advisory. Four tests, three seen red first. 199 / 199.
- **Rejected:** dropping `row-split` (the ragged row it targets is real); a tolerance on
  `bar-short`'s span (the misfires were text, not near misses).
- **Opens:** the 0.75 rests on one scene; KI-10 is next.

## 2026-11-17 (d) — PR 1, round 1: one mark by a person, a miss; the lint misfires on a real drawing
- **Why:** the attribution measurement (ROADMAP measure 3, KI-3) needs marks a person drew.
- **What ran:** the owner's dnd_crawler_rust wireframe (29 screens, read-only from that repo)
  imported on port 3080, with the markup legend and approval boxes on the 23 screens with room;
  the owner drew in the browser pane. The tab's load made no human record. The owner drew one
  mark: a green loop round all of S01, confirmed as "S01 is fine". Intent read right; the target
  was a heading inside the screen: 0 of 1. Logged as KI-10; pinned as `human-round-1` (S01's
  geometry with neutral words, since this repository is public, and the owner's stroke as drawn).
  Baseline 7 / 9. KI-3 stays open: one mark is no measurement.
- **Also found:** the geometry lint (PR 4) gives 14 errors and 24 advisories on that scene, which
  reads with all zeros and which the owner ruled correct: `bar-short` judges text, `row-split`
  fires on a column beside a taller panel, `sibling-overlap` on a 0.6px touch. Calibration on the
  corpus missed them; fixing them is the next change (the list is in the scene's lint output).
- **Opens:** KI-10's fix (a mark round a whole screen targets it, and a `fine` one approves it);
  the lint's misfires; a round 2 with more marks.

## 2026-11-17 (c) — PR 4 built: the geometry lint (ADR-002, SPEC-008)
- **Why:** `--score` says whether the reading succeeded; nothing said whether the drawing follows
  the conventions, and on 2026-08-07 a footer 4.29px outside its frame surfaced only as "1 screen
  could not be named".
- **What:** `src/core/wireframe-lint.ts` reads the reader's own model into findings with a stable
  `ruleId`, `severity`, `elementId`, `message` and `measured` value. Five errors
  (`containment-near-miss`, `row-split`, `bar-short`, `threshold-edge`, `oversized-annotation`)
  and three advisories (`frame-overflow`, `sibling-overlap`, `small-text`). The plain reading,
  and so `describe_wireframe`, shows `### Drawing quality` when there is an error;
  `wireframe --lint` lists all; `--json` carries `lint`. Reporting only. The reader's thresholds
  moved to `src/core/reader-rules.ts`, which the lint shares.
- **Calibration:** every tolerance measured on the corpus first (SPEC-008 § Calibration). Off-grid
  coordinates, frame width and inset were rejected: the conventions' own 1px inset and the
  phone-sized fixtures make them fire on drawings that read right. Zero errors on every clean
  fixture and on UI-Wizard's 98-element dashboard.
- **Tests:** a new fixture, lint-near-misses, with the 2026-08-07 footer and one case of each
  other error; 17 unit tests; the corpus now asserts each fixture's lint. 189 / 189.
- **Also:** conventions § 4 said a header must span 90% of its edge; the reader uses 80% (70% for
  a sidebar's height), and the conventions now say so. KI-9 logged: a canvas a test boots
  sometimes dies at boot on Windows (`0xC0000409`), seen twice.
- **Opens:** a `--check` exit code once the rules have met more real drawings (ADR-002); the
  browser panel as a view over `lint`.

## 2026-11-17 (b) — ADR-005 built: an approval box in each screen (SPEC-007)
- **Why:** T-027's second half. A person who was done with a screen had to say so in chat.
- **What:** `src/core/approval.ts`: an element whose id ends `-approval` is its screen's approval
  box (by `frameId`, else the screen holding it). The reading leaves it out of the components;
  a fill or a person's mark centred inside it ticks it, and the tick is no annotation. A screen
  reads `· approved` or `· not approved yet`, under `Approved: 1 of 2 screens.`; `changes` says a
  tick `approves screen [s01] …`, and a fill taken off `withdraws approval of`. The legend gains
  a line; conventions § 8 has the box recipe; SKILL.md's loop, the README and
  `describe_wireframe`'s description say how.
- **Tests:** a new fixture, approval-boxes, the tick drawn in a real tab on port 3072; 13 unit
  tests. Each failed first. Every other golden unchanged. 157 / 157.
- **Rejected:** a tick only in green (a person who ticks in black means it too); the smallest
  holder as the box's screen in `changes` (it would name a header bar the box sits on).
- **Opens:** T-027 closes with this. Next is PR 4 (ADR-002), and ROADMAP PR 1, a person marking up
  through the loop, now has its conventions on the canvas.

## 2026-11-17 (a) — ADR-004 built: a mark's intent is its colour, and the legend says so (SPEC-006)
- **Why:** T-027. A person marking up had nothing on the canvas telling them how, and the agent
  guessed what each mark wanted from its words. ADR-004 chose intent by colour with a legend.
- **What:** `src/core/markup-intent.ts` reads a person's mark in the red, orange (Excalidraw's
  yellow), blue or green family of the editor's palette as change, remove, question or fine.
  `wireframe` tags each mark `[change]` etc.; `changes` prints `by human · change`, and
  `intent change → fine` on a recolour. A legend, an element whose id is `legend` or begins
  `legend-`, is left out with its members and whatever is drawn inside it, and the reading says
  so in one line. The skill ships it as `references/markup-legend.json`; conventions § 8,
  SKILL.md's hand-over, the README (a new differences row) and two MCP descriptions say how.
  `boxOf` and its helpers moved, unchanged, to `src/core/box.ts` so the new module and
  `changes.ts` do not import each other.
- **Tests:** annotated's marks recoloured to pin one of each intent and one untagged; a new
  fixture, markup-legend, whose two marks were drawn in a real tab on port 3072; 11 unit tests.
  Each failed first. Attribution baseline 7 / 8 (was 5 / 6), re-reviewed by hand. The other six
  goldens unchanged byte for byte. 139 / 139.
- **Rejected:** an exact-hex match (a lighter red from the shade row would carry nothing); a
  declared `role` for the legend (a new role); a CLI command to draw the legend (a file is
  enough and testable).
- **Opens:** ADR-005, the approval box, builds on this and adds its line to the legend.
