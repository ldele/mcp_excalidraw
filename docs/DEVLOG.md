<!-- status: active · updated: 2026-07-31 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: [`docs/archive/DEVLOG-archive-001.md`](archive/DEVLOG-archive-001.md). Rotation
began on 2026-10-08; the archive holds everything older than the twenty entries kept here.

## 2026-10-08 (f) — A check pins what entry (e) found: arrows follow a moved shape after a sync
- **What** (owner, 2026-10-08: *"add the check to the state script"*): one check in
  `scripts/check-state-integrity.mjs`, *bound arrows follow a shape an agent moves after a tab
  has synced*, +71 lines. Nothing in `src/` changed.
- **What it does.** Two rectangles, a routed bound arrow and a plain one. It sends the stored
  scene back to `/api/elements/sync` the way a tab does — arrows with `startBinding` /
  `endBinding` and without `start` / `end` — twice. Once unchanged, which takes the handler's
  kept-as-stored path; once with the target moved and both arrows' ends changed, as after a
  person's drag, which takes its merge path. After each sync it moves a shape through the API
  and asserts that both arrows are anchored at that shape's new edge and that the routed one
  still has four points.
- **Shown to catch what it is for, three ways.** Two defects seeded in the spare worktree, each
  rebuilt and run: the merge path forgetting the stored element (`{...existing, ...raw}` made
  `{...raw}`) exits 1 at the second assertion; the kept path replacing the stored element with
  what the tab sent exits 1 at the first. Each time the other seven checks passed, so nothing
  else covered this. And against the local build of upstream (`527500b`) it fails at its first
  assertion while the other seven pass there: it catches upstream's real behaviour, not only a
  seeded one.
- **What it is not:** a browser test. The script builds the payload itself, modelled on what
  entry (e)'s probe read back from a real tab. If the page changes what it sends, this check
  will not see it; the probe would.
- **Run:** `type-check` clean; `npm test` 66 / 66 plus wire, bind, render and state, now eight
  checks; `tests/expected/` untouched. Windows, Node 24.
- **Also:** CI on `69bf6e9` is green, run 37771956776, five jobs.
- **Docs:** SPEC-003 § Verified says "pinned"; `FORK.md` names the two checks we carry in
  upstream's script and why the second one matters at a merge.

## 2026-10-08 (e) — The fork keeps its arrows attached after a tab sync; upstream does not
- **The question** entry (d) left open, taken up on the owner's word the same day: on upstream,
  a tab's first sync strips `start` / `end` from the stored arrows, and from then on a shape
  moved through the API leaves its arrows behind. Does this fork do the same?
- **It does not.** One Playwright script, a real Chrome tab, a private port, the fork's build at
  `ac7d8dd`; the scene is two filled rectangles, one bound arrow given four points and one bound
  arrow given none. A bound shape was moved through the API seven times in six states, and both
  arrows followed every time: with no tab; with a tab attached and not yet synced; after a
  manual sync; after a reload; after the tab's own automatic sync, set off by a click on empty
  canvas; and twice after a person had dragged the bound shape in the tab. At every reading the
  stored arrows carried `start` / `end`, and from the first sync on `startBinding` /
  `endBinding` beside them.
- **Why the two differ.** Upstream's sync handler clears the store and writes what the tab sent
  (`elements.clear()`), so the agent-format refs are gone and `rerouteBoundArrows`, which
  matches on them alone, finds nothing. Ours reconciles per element: one with no canonical
  change is kept as stored, and a changed one is merged, `{...existing, ...raw}`, under a
  comment that names `start` / `end` and `rerouteBoundArrows` as the reason for merging.
- **A person's drag in the fork's tab,** which entry (d) listed as not proved: the routed arrow
  keeps its waypoints at 380, 122 and 380, 422 and its end follows the shape to 597.5, 422; the
  plain arrow follows too. A move through the API straight after re-anchors both again.
- **No ticket:** there is no defect in the fork to file. **One thing is not pinned:** no test
  syncs a scene holding a bound arrow and then moves a shape through the API —
  `tests/server-contract.test.mjs`, `scripts/check-state-integrity.mjs` and the browser suite
  were searched. The behaviour rests on that merge and its comment, in a handler that had a
  conflict hunk at the last upstream merge (SPEC-002). No test was written here: the task was
  to check.
- **Upstream** has the gap at `96d9c21`, with or without the T-009 patch (entry (d)). It was not
  reported there.
- **The script:** `tests/probe/tab-sync-reroute.spec.mjs` with `playwright.probe.config.mjs`,
  untracked in `C:\Projects\mcp_excalidraw-merge`, run with `PW_CHANNEL=chrome`. Removing that
  worktree loses it.

## 2026-10-08 (d) — The offer to upstream is held; the tab test and upstream's browser suite run; our own use counted
- **Decided** (owner, 2026-10-08): *"hold the PR"*. The steps to it, the same day: shown the two
  commands of entry (c), the owner wrote *"Don't make the PR for now. I'd like to have a look at
  the PR before doing anything. Plus did you check the issues ?"*; then asked for the tab test
  and the browser suite first, for a text that does not cite this fork, and whether so small a
  change is justified. Nothing was pushed and nothing opened: `git ls-remote --heads origin
  t009-waypoints-upstream` is empty. The fix stays in the fork.
- **CI on `ac7d8dd` is green**, run 37758104927, five jobs. The new check ran on Linux for the
  first time, in *Build + wireframe corpus* under Node 22: `ok - bound arrows keep the waypoints
  they were given`.
- **Upstream's issues, searched** (2026-10-08): 33 open, 17 closed, 6 open pull requests; ten
  terms over issues and pull requests in every state (arrow, waypoint, points, bind, binding,
  elbow, route, connector, `resolveArrowBindings`, `startElementId`). **No issue reports this or
  asks for it.** Nearest: #26 (open since 2025-09, arrows misaligned and too short, older than
  binding, answered with a prompting tip); #116 (closed by #117, where the maintainer says the
  tab re-ran arrows through Excalidraw's converter); #57 and #60 (wrote the binding code; their
  test plans never mention `points`). Open pull requests in the same function: #130 rearranges
  its callers, #74 changes one line inside it. There is no contributing guide; #126 and #127,
  the last outside pull requests merged, had no linked issue.
- **A tab and a routed bound arrow, tested.** One Playwright script, a real Chrome tab, a
  private port, against upstream with the patch (`527500b`) and upstream as it is (`96d9c21`,
  the arrow routed there by a later `update`). The table with the stored points is in SPEC-003
  § Verified. In words: the tab keeps the four points when it attaches, on a manual sync, after
  a click and a pan, and after a reload, on both builds; when a person drags the bound shape the
  tab moves that end and leaves the waypoints, on both builds; when an agent moves the shape
  through the API with no tab sync before it, the patch keeps the waypoints and unpatched
  upstream flattens the arrow to two points. **So the tab does not undo a route, and the patch
  changes two server paths only:** creation, and an API move before any tab has synced.
- **Found on the way; upstream's, not the patch's.** After a tab's first sync the stored arrows
  carry `startBinding` / `endBinding` and no `start` / `end`. `rerouteBoundArrows` matches on
  `start` / `end` alone, so from then on a shape moved through the API leaves its arrows where
  they were, routed or plain, with or without the patch. **Not checked on the fork**, whose sync
  reconciles per element; no ticket filed. A task was put to the owner for it.
- **Upstream's Playwright suite: 19 / 19** on the patched build, with the installed Chrome
  (`channel: 'chrome'`): the Chromium build that Playwright version pins is not on this machine.
- **Our own use, counted.** The saved scenes under Scribe's `docs/wireframes`, under
  `C:\Projects\*\docs\wireframes` (three other projects) and under this repository's `tests/`;
  nowhere else was searched. 21 scenes read, 8 with an arrow, 17 arrows, 16 bound at both ends
  by any of the three binding forms, **3 with more than two points, all in Scribe's
  `library.excalidraw`.** One caution about the figure: the defect was silent, so a saved scene
  cannot show a route that was asked for and dropped.
- **Why held** (the session's reasoning, given to the owner with the count; the decision is the
  owner's): in the fork the fix is justified — a silent wrong result against our own rule, one
  function, a check, no existing arrow changed. For upstream the case is marginal: three arrows
  in one drawing, nobody upstream asking, and a gain to us of not carrying 40 lines. The session
  had recommended sending before it had counted, and said so.
- **A count corrected.** Entries (b) and (c) and `FORK.md` said upstream had edited
  `resolveArrowBindings` twice. `git log -L` on the function at `96d9c21` lists four commits: #41
  wrote it; #60, #61 and `9c4be39` changed it; `9c4be39` is among the 25 commits of the last
  merge. `FORK.md` says so now.
- **Where things are.** The patch: local commit `527500b` on `t009-waypoints-upstream` in
  `C:\Projects\mcp_excalidraw-upstream`. Untracked beside it, and lost if that worktree is
  removed: `PR_BODY.md`, which now carries these results and does not name this fork, and the
  tab script, `tests/probe/t009-tab.spec.mjs` with `playwright.probe.config.mjs`.
- **Not proved:** upstream's tree on Linux; a person's drag in the *fork's* tab; whether the fork
  leaves arrows behind after a tab sync.

## 2026-10-08 (c) — T-009 fixed in the fork; the offer to upstream is decided and not yet sent
- **Decided** (owner, 2026-10-08, *"yes to all four"*, answering the four questions of the
  hand-off): the red-run fix and SPEC-003's results committed and pushed — `cfa2eae`, `265f7a9`;
  the fix for T-009 kept in the fork; and offered upstream as one small pull request. SPEC-003
  rows 4 and 5 are resolved with that.
- **CI on `265f7a9` is green**, run 37756642052, all five jobs. That is the proof entry
  2026-10-08 said was missing: the PNG-worker flush fixes the render test on Linux under Node 22
  and 24.
- **The fix, on `main`:** the change of entry (b), unchanged, moved from `6f25cb7` onto `265f7a9`.
  `resolveArrowBindings` in `src/server.ts`, +29 −11; the check *bound arrows keep the waypoints
  they were given* in `scripts/check-state-integrity.mjs`, +78. Re-run after the move, on Windows
  with Node 24: `type-check` clean; `npm test` 66 / 66 plus wire, bind, render and state;
  `tests/expected/` untouched.
- **What a drawing agent gains:** an arrow bound at both ends can be routed in the `add` that
  creates it, and stays routed when an agent moves one of its shapes. The skill's arrow section
  and conventions §7 say so now. The second pass in Scribe's `scripts/open_wireframe.py`
  (`update` with the same points) is no longer needed; it does no harm, and removing it is that
  repository's change.
- **T-009 closed** as fixed.
- **Upstream: not sent.** The patch is one local commit, `527500b` *fix: keep waypoints on bound
  arrows*, on `t009-waypoints-upstream` in `C:\Projects\mcp_excalidraw-upstream`, cut from
  `upstream/main` at `96d9c21`. The pull request's text is `PR_BODY.md` beside it, untracked.
  The session was refused the push of that branch by its own permission check — a new branch on
  a public repository — and did not route round it. The push and the pull request are the
  owner's to run, or to grant.
- **The policy this sets** is in `docs/ROADMAP.md` § Upstream; `FORK.md` § Keeping current with
  upstream names the function, since a merge may now conflict there.
- **Not proved:** the new check on Linux — the run dispatched after this push is its first there.
  Still not run: upstream's Playwright suite. Still not looked at: what a browser tab does with a
  routed bound arrow on its first sync, or when a *person* drags a bound shape.
- **Left standing:** the worktree `C:\Projects\mcp_excalidraw-merge` and its branch
  `t009-waypoints-fork`, merged and removable; the worktree `C:\Projects\mcp_excalidraw-upstream`,
  needed while the pull request is pending. The 22 advisories `npm ci` reported on the merged
  tree are still unread.

## 2026-10-08 (b) — SPEC-003: T-009 is upstream's as well; the fix is one function; the decision is the owner's
- **The question** (owner, 2026-10-08): with the fork level with upstream, is the fix for T-009 —
  a bound arrow's waypoints dropped when it is created — worth sending upstream?
- **It reproduces on upstream alone.** Clean worktree of `upstream/main` at `96d9c21`
  (`C:\Projects\mcp_excalidraw-upstream`), `npm ci`, built, its server on a private port: a
  bound arrow posted with `[[0,0],[120,0],[120,300],[340,300]]` is stored as
  `[[0,0],[412.9,247.8]]`, the fork's values to the last digit.
- **What upstream means by it.** Its skill says a bound arrow auto-routes to element edges, and
  shows waypoints only on arrows that are *not* bound. The same section then rules that an arrow
  which would pass through an unrelated shape gets a waypoint. Both cannot be had at once. No
  issue asks for it. So upstream has no bug by its own account; it has two rules that cannot both
  be followed, and a pull request has to say that.
- **The fix, in `resolveArrowBindings` only:** `src/server.ts` +29 −11. More than two points: the
  ones between the ends stay where the caller put them, and each bound end is re-anchored to its
  shape's edge facing the waypoint beside it. An unbound end of a routed arrow stays put. With
  none or two points nothing changes: three such arrows (rectangle to rectangle, ellipse to
  diamond, bound at one end) are stored identically by the fixed and unfixed builds. Because
  `rerouteBoundArrows` calls the same function, a routed arrow now keeps its waypoints when a
  shape it is bound to moves; before, it was flattened then as well.
- **The test,** one check in upstream's `scripts/check-state-integrity.mjs`, +78: fails on
  unmodified upstream at its first assertion, passes with the fix. Upstream's wire, bind and
  render scripts still pass. On the fork's code the same change gives `npm test` 66 / 66 plus the
  four scripts, `tests/expected/` untouched, and Scribe's Library scene drawn in one `add` keeps
  arrows of 5, 4, 3 and 2 points.
- **Not run:** upstream's Playwright suite; Linux; a browser tab on a routed bound arrow.
- **Where it is:** staged on two local branches, `t009-waypoints-upstream` and
  `t009-waypoints-fork`, in the two side worktrees. **Not in the main checkout:** `npm test`
  rebuilds `dist/`, the command on PATH runs from it, and an undecided change should not reach
  other projects through a test run. (The staged PNG-worker change already did, this morning, the
  same way. It changes nothing on Windows.)
- **Proposal for the owner (SPEC-003 rows 4 and 5):** keep it in the fork, whose own conventions
  ask for bound arrows routed with waypoints, and offer it upstream as one small pull request.
  If upstream declines, the fork carries 40 lines in a function upstream has edited twice.
  **Nothing has been sent, and no branch pushed.**
- **What else the fork carries in files upstream owns** (`git diff upstream/main main`, sorted by
  what the DEVLOG and the tickets say each is for, not read line by line):
  - *Plumbing for our own features, nothing to offer:* `src/server.ts` +388 −46 (revisions,
    origin, change records, the sync reconciliation, T-014's refusal of an emptying sync, the
    `replace` record), `src/types.ts` +91, `mcp-dispatch.ts` +89, `mcp-tools.ts` +74,
    `canvas-client.ts` +43, the CLI's `changes`, `scene` and `util`, `canvas-state.ts`, and the
    page's seven lines.
  - *Possibly upstream's too, each needing its own reproduction there:* the label typography on
    export (`expand-elements.ts`, T-013 — SPEC-002 reads it as partly caused by our
    `normalize.ts`); `repairOrderKeys` on `import` and `render` for scenes written before
    upstream's #117, which may bear on upstream's open #93.
  - *Upstream's already:* the PNG worker's flush, its open #131.
- **Next:** the owner's two decisions. Then T-010's re-wrap, T-001 with no tab, PR 4.

## 2026-10-08 — SPEC-002 landed on `main` (`6f25cb7`), pushed; the first CI run on it is red; fix staged
- **What, on the owner's instruction** (*"run all the steps"*, given from a Scribe session): S3
  committed on the branch as `8913747`; the staged ledger with the refreshed SPEC-002 and the new
  SPEC-003 committed on `main` as `41a3ba7`; `main` took `merge/upstream-2.1.2` as `6f25cb7`, with
  no conflict; `npm ci`, `npm run build` and `npm link` in the main checkout, with no canvas
  running; pushed; CI dispatched by hand (KI-8: the push started no run, the fifth time).
- **Checked before each commit.** In the worktree before `8913747`: `type-check`,
  `type-check:frontend`, `npm test` 66 / 66 plus wire, bind, render and state. On the merged tree in
  the main checkout before `6f25cb7`: the same, plus `npm run build`, with `tests/expected/`
  identical to the pre-merge `main`. The linked command answers as 1.3.0 and lists `render`.
- **CI run 37752960857 on `6f25cb7`: red.** Node 20 passed. The main job (Node 22), Node 24 and the
  docs gate failed.
  - *The docs gate (mine).* `docs/TICKETS.md` had been staged on 2026-10-07 with that date in its
    header and was committed on the 8th, which rule 12 reads as an edit without a date bump. The
    gate was run before the commit and passed; it was not run after.
  - *The render test (upstream's defect, found by our test).* `tests/server-contract.test.mjs`,
    *it renders offline, without a canvas server*: `render` of the legacy dashboard fails on Linux
    under Node 22 and 24 with *PNG worker exited with code 0*. `src/core/render/png-worker.ts`
    (upstream's #127) calls `process.exit()` right after `stdout.write()`; a payload larger than
    the pipe buffer, about 64 KiB, is cut off, and this scene's PNG is 198 kB. Upstream's CI is
    green because its render checks use small scenes. Every run here was on Windows, where it
    passes.
- **Staged, not committed:** upstream's open pull request #131 (`ff15e51`, one file, 14 lines
  added and 5 removed: exit from the write's flush callback, with a 10 s watchdog), taken exactly
  as it stands so that it merges without a conflict when upstream takes it; and the ledger, with
  T-011 closed, which brings its date to the 8th. With it staged, on Windows: `type-check`,
  `npm test` 66 / 66 plus the four scripts, and the dashboard renders to 197,609 bytes.
  **Not proved:** that it fixes Linux. WSL here has no Node, so only a dispatched run can say.
- **T-011, re-tested on the merged build and closed as fixed.** Scribe's
  `findings-beside-text.excalidraw`, imported with no tab, then one tab, one scroll and one click:
  97 components throughout, the heading still at 152, 130. `library.excalidraw` imported into that
  same already-clicked tab: 65 components and 4 flows. On 1.2.0 the first dropped to 47.
- **Seen in the same run, not fixed:** that click rewrote the bound arrow `f-open` as an edit by
  human (476 x 58 to 475 x 57, path reshaped), and the reading went from 1 connection to
  0 connections and 1 annotation. T-007 and T-010 stand on the merged build.
- **Not done:** `git worktree remove ../mcp_excalidraw-merge`. The worktree is clean at `8913747`.
  `npm ci` reported 22 advisories in the merged dependency tree (1 low, 12 moderate, 7 high,
  2 critical); they were not looked at.
- **What I would do differently.** Push the branch and dispatch CI on it *before* merging. A push
  starts no run here, so the first Linux run of the merged code was on `main`, after it was
  public. And run the docs gate on the commit, not on the tree before it.
- **Next:** the owner's word on the staged fix (commit, push, dispatch, read the run). Then
  SPEC-003, which he placed right after the merge on 2026-10-08.

## 2026-10-07 (b) — S3: three toolkit hazards fixed on the merged code (T-012, T-013, T-014); T-001 re-tested
- **Before this:** the merge was committed as `b8d3f39` on `merge/upstream-2.1.2` and the ledger
  (T-007 to T-011) as `497e9cd` on `main`, both on Lucas's instruction, neither pushed. One thing
  was added to the merge before it was committed: `tests/legacy/ui-wizard-dashboard.excalidraw`
  was caught by the `*.excalidraw` ignore rule and had never been staged, so the new contract test
  would have failed on a clean clone. `.gitignore` now carves `tests/legacy/` out.
- **Where the work is:** code, tests and these docs are staged in the worktree, on the branch. The
  three tickets and two notes are in the **main checkout's** `docs/TICKETS.md`, staged there: the
  ledger's last commit is on `main` only, and the branch does not touch the file, so the two merge
  without a conflict in either order.
- **T-012, the echo (`src/core/changes.ts`):** `strokeColor: '#1e1e1e'` and `fontFamily: 5` join
  `EDITOR_DEFAULTS`. A shape drawn with no stroke colour and text drawn with no font came back
  from a tab's first sync as edits by human. Both values now have one definition, in
  `src/types.ts` (`DEFAULT_STROKE_COLOR`, `DEFAULT_FONT_FAMILY`), read by the guard and by export.
  In a real tab on a two-element scene: 2 human records before, 0 after.
- **What the echo had been hiding (`src/server.ts`, the no-delta branch of the sync):** the server
  learned an unsized text element's measured box only because the guard had those two holes: the
  miscounted edit took the merge path, which stores what the page sent. With the holes closed, two
  of upstream's browser tests failed (`text … is measured with its real font`): the text stayed
  unsized. Now a text element stored without a box takes the box the page measured, on a passive
  sync, with no record and with origin and rev unchanged. A box the author gave is left as given.
- **T-013, labels (`src/core/expand-elements.ts`):** the bound text of a label is exported from the
  label's own `fontSize`, `fontFamily`, `strokeColor`, `textAlign` and `verticalAlign`, then the
  shape's, then the default. The create path moves the typography onto the label
  (`LABEL_STYLE_KEYS`), and export read the shape only, so every label left as font 1 at 16 px in
  the border colour. An unset font now exports as 5 for text and labels alike, which is what the
  canvas and the headless renderer show; it was 1. Without that, closing T-012 would have made a
  scene nobody restyled export in Virgil, because the echo no longer stores the 5.
- **T-014, the sync (`src/server.ts`, `frontend/src/App.tsx`):** a sync that carries no usable
  element against a canvas that holds some is answered **409** and deletes nothing.
  `"allowEmpty": true` clears on purpose. The page sets it only when its scene holds deleted
  elements, which is what a person deleting everything leaves and what a tab that never loaded
  cannot have. A sync that omits *some* elements still deletes them: that is how a deletion in
  the tab reaches the server, and KI-7 (two tabs) is unchanged. `tests/browser/scene-reload.spec.mjs`
  cleared the server with an empty sync in four places; its `seed` now passes the flag.
- **Tests, 10 new (7 failed before their fix; 3 guard what must keep working and passed
  throughout):** `tests/frontend-echo.test.mjs` +3 (the two observed
  payloads; a recoloured stroke and a changed font still report). `tests/server-contract.test.mjs`
  +7 (label round trip; unset font; the refused sync, the refused junk payload, the allowed clear,
  the partial delete; the measured box).
- **Verified:** `npm test` — 66 / 66 `node:test` (56 before), MCP wire 6 / 6, bind, render, state.
  `type-check:frontend`, `npm run build`. Upstream's Playwright suite 19 / 19 with the system
  Chrome, `normal select-all deletion can still autosync an empty scene` among them.
  `tests/expected/` untouched. Every server ran on a private port; `:3000` was not touched.
- **T-001, re-tested (note on the ticket):** with no tab, unchanged: unsized text is stored with no
  size, the reading drops it, `wireframe --score` gives `unnamedScreens: 1`. With a tab, after its
  first sync, the heading is 178 x 30, still `agent`, no record, and the screen is named.
- **Seen and not fixed (note on T-010):** UI-Wizard's dashboard as exported at `7828a2d`, imported,
  one tab, one click: 7 records by human, each a label the tab re-wrapped (`Dismiss` to
  `Dismis/s`), and the score went from 72 components to 69. The stored label is the bound text's
  wrapped `text`; `originalText` keeps the unwrapped one. Whether the 16 px font-1 labels of that
  old export are why they no longer fit was not checked.
- **Not verified:** the page's `allowEmpty` beyond upstream's two tests (select-all delete,
  explicit clear). One human drag = one human record still needs a person. A label with no
  `fontSize` exports at 16; what the canvas draws it at was not measured.
- **Next:** Lucas reviews and commits the staged S3 in the worktree and `docs/TICKETS.md` on
  `main`; merges the branch into `main`; with no canvas running, `npm ci && npm run build &&
  npm link` there; pushes; dispatches CI by hand (KI-8). Then T-010's re-wrap before the next
  markup round on an imported scene, then T-001's no-tab case, then PR 4.

## 2026-10-07 — Upstream 2.1.2 taken on `merge/upstream-2.1.2` (SPEC-002); staged for review, not committed
- **What:** `git merge upstream/main` at `96d9c21` — 25 commits, 2.0.0 through 2.1.2 — into a branch
  cut from `cf3617d`, in a separate worktree (`C:\Projects\mcp_excalidraw-merge`). Decided by Lucas
  on 2026-10-07, reversing the 2026-09-07 order (T-001 first): upstream now fixes defects that were
  live for us. The fork keeps its own version line, **1.3.0**; Node floor **20**.
- **Why a worktree:** the canvas Lucas was drawing on runs from the main checkout's `dist/`. A build
  in place would have swapped its frontend under an open tab. Every test server here ran on a
  private port (35xxx, 51910); `:3000` was never touched.
- **What upstream fixes for us (read from its code, then tested here):** export order keys are valid
  and ascending (`orderKey`, #117) — ours were a decimal counter, `a0 … a10 …`, which Excalidraw
  rejects; the canvas page refuses to sync a scene it did not load (`canSyncScene`, #110) — on
  2026-09-24 an unloaded page synced nothing and the server deleted 98 elements; scenes load
  through `restoreElements` with fonts preloaded (#123, #124), so free text is no longer drawn
  centred on its left edge; rendering is headless (#114) — `screenshot` no longer needs a tab, and
  `render` turns a `.excalidraw` file into PNG / SVG with no server at all.
- **Conflicts (15 files):** the four modify / delete — both Dockerfiles, `docker.yml`,
  `npm-publish.yml` — stay deleted (`FORK.md`). `src/index.ts`: upstream's, whole; our three tools
  ported to `core/mcp-tools.ts` and `core/mcp-dispatch.ts`, the change cursor to
  `core/canvas-state.ts` (a server instance is built per connection, so a cursor held on one would
  reset), and the 2026-09-07 trap handled — `prepareElementUpdate(id, updates, existing ?? undefined)`.
  `frontend/src/App.tsx`: upstream's, whole; our five lines (`rev`, `origin` stripped before
  render) moved to where upstream moved the function, `frontend/src/utils/scene.ts`.
  `src/server.ts`: four small hunks, both sides kept. `package.json`: our name, `private` and
  binary, upstream's dependencies, scripts and `engines`; the lock regenerated by `npm install`.
  `ci.yml`: ours, plus the frontend type-check and upstream's three node-side checks; 18 dropped
  from `compat`. `.gitignore`: **upstream ignores `docs/` — not taken**; this fork commits it.
  README and cheatsheet: our commands (`excalidraw-canvas`, never `npx`), upstream's headless text.
- **Found by reading what git merged silently — one defect.** Upstream's atomic `replace` in
  `POST /api/elements/batch` cleared the store without a change record, so `import --replace` and
  `snapshot restore` read in the feed as additions with nothing removed. It now records each
  delete first, as `DELETE /api/elements/clear` does. The sync handler itself came through whole:
  upstream's only change inside it since the merge base is the body parsing.
- **Old scenes — SPEC-002 work item 9 was needed.** `import` then `export` re-keyed a legacy scene
  correctly, but `render` on the file threw `invalid order key: a80`. `repairOrderKeys`
  (`core/expand-elements.ts`) drops every key when a scene's keys are not valid, unique and
  ascending in array order — Excalidraw assigns keys from array order when there are none — and
  runs on `import` and `render`. `isValidOrderKey` agrees with `fractional-indexing` on 4 000-odd
  base-62 candidates; its one deliberate difference (it checks the alphabet) is pinned by a test.
- **Tests added:** `tests/server-contract.test.mjs` — the first tests here that boot a server:
  a replace is in the feed; our MCP tools answer over stdio; UI-Wizard's dashboard scene (98
  elements, legacy keys, `tests/legacy/`) imports to exactly the reading that repo committed,
  re-exports with valid keys, renders offline, and leaves no legacy key on the server.
  `tests/order-keys.test.mjs`. One check added to upstream's `scripts/check-mcp-stdio.mjs`.
- **Verified:** `type-check` and `type-check:frontend` clean; `npm run build`; `npm test` —
  the `node:test` suite 56 / 56 (43 before the merge, 13 new) with **`tests/expected/` untouched**, MCP wire 6 / 6, local-bind, render, state.
  Upstream's Playwright suite 19 / 19, run with the system Chrome (the cached Playwright Chromium
  is build 1228, this version wants 1243) — it covers the forced case: a scene the page cannot
  load blocks manual, automatic and Mermaid sync without changing server data. In headless Chrome
  against the merged build: the legacy dashboard loads with no console error and a click plus a
  zoom leave 98 elements on the server; twelve elements stored *with* bad keys load too and stay
  twelve. `render` writes the dashboard as a 198 kB PNG with no server and no tab.
- **Not changed by the merge, measured on both builds:**
  - **T-001** stands: a sizeless text element is accepted, stored with no size, and absent from
    the reading. #107 only touches export expansion.
  - **The page's first sync still reads as a human edit** where the agent left `strokeColor` or
    `fontFamily` unset: `{strokeColor: null → "#1e1e1e"}`, `{fontFamily: null → 5}`. Identical on
    `main` (built in a second worktree and run through the same script), so not a regression —
    `EDITOR_DEFAULTS` in `core/changes.ts` lacks those two. To be filed.
  - Bound labels still export as `fontFamily: 1` at 16 px; the server's sync still deletes what a
    payload omits (KI-7's mechanism). Both ours; the next spec.
- **Not verified:** "one human drag is exactly one human record" (SPEC-002 test case 6, second
  half) — a synthetic drag did not register as a move, and the echo above would have masked it.
  It needs a person. Two early runs of the new server test failed to reach the server right after
  a fresh build (a timeout at 8 s, then an early exit with no output); the wait is now 20 s and
  the next six runs passed, three of them straight after a build — unexplained, not reproduced.
  Upstream's README sections that auto-merged were not reviewed line by line.
- **Next:** Lucas reviews `git diff --cached` in the worktree and commits the merge; then merge the
  branch to `main`, `npm run build && npm link` there (with no canvas running), push, and
  dispatch CI by hand (KI-8). Then file, with `cpc-ticket`: label typography on export; the
  absent-means-deleted sync; `EDITOR_DEFAULTS` missing `strokeColor` / `fontFamily`.

## 2026-09-07 (c) — Upstream is four commits ahead (2.0.0); merge deferred until T-001 lands (rule 2)
- **What:** `git fetch upstream` shows `0db05c4`, `6ddbe98`, `f17c886`, `ff42de9` on `upstream/main`
  past our merge base `ecf3cac`: MCP protocol revision 2026-07-28 on the SDK v2 split packages, with
  `src/index.ts` cut into `core/mcp-server.ts`, `mcp-tools.ts`, `mcp-dispatch.ts` and
  `canvas-state.ts` plus a new `npm run test:mcp` wire test (#98); the 2.0.0 release with byte-stable
  `.excalidraw.md` exports and CRLF-tolerant vault import (#99); a dependency refresh (#104); a
  hardened `npm-publish.yml` (#105). The Node floor moves to 20 — the SDK's own `engines`.
  **Decision (Lucas, 2026-09-07): defer the merge until T-001 is answered, then take it as its own
  reviewed step.**
- **Why defer:** nothing in the four touches the reading path or the other two collision-zone files —
  `src/server.ts`, `src/core/normalize.ts`, `wireframe.ts`, `changes.ts` and `tests/` are untouched —
  so, unlike 2026-08-07, there is no live bug fix in it for this fork; and T-001's fix lands in files
  upstream did not change, so the order does not alter the conflict cost. T-001 is a reported defect
  in the product's own claim; it goes first.
- **Cost, from a `git merge-tree --write-tree` dry run:** eight conflicting files. Three are
  modify/delete on files we removed on purpose (both Dockerfiles, `npm-publish.yml` — `FORK.md`):
  keep deleted. `ci.yml` (two hunks over our rewrite): keep ours, drop 18 from `compat`, add
  `test:mcp` to `check`. `package.json` two hunks, then regenerate the lock. `README.md` one hunk.
  `src/index.ts` is the whole file: take upstream's and port by hand `describe_wireframe`,
  `get_canvas_changes` and `wait_for_changes` into the tool table and dispatcher, and the
  `lastSeenRev` cursor into `canvas-state.ts` — upstream builds one server instance per connection,
  so instance-held state resets.
- **Trap for the port:** upstream's `mcp-dispatch.ts` still calls
  `prepareElementUpdate(id, updates, existing?.type)`; ours takes the whole element so a restyle
  merges into the existing label (2026-08-07). Type-check will fail on it — pass
  `existing ?? undefined`, do not revert the signature. Also bump the Node ≥ 18 line in six places
  (README ×3, `AGENTS.md`, `CONTEXT.md`, `package.json` `engines`) plus the `ci.yml` comment.
- **Rejected:** merging now (a half-day port that fixes nothing live, ahead of a reported defect);
  never merging (rule 2 exists because the diff only grows, and upstream's next work builds on the
  split files).
- **Verified today, at HEAD:** type-check clean; `docs_check --strict` and `integrity_check --strict`
  0/0; `origin/main` level with HEAD. `@modelcontextprotocol/sdk: "latest"` is lock-held at 1.29.0
  (npm latest 1.30.0), so `npm ci` stays deterministic meanwhile.
- **Opens:** the merge, after T-001 — budget half a day plus a live MCP round-trip, which needs the
  MCP server configured in a client (it is not, on this machine; the CLI path is untouched).

## 2026-09-07 (b) — Second push, still no run: the push trigger does not fire on this fork; dispatch does
- **What:** `899c365` reached `origin/main` at 08:46:52Z, an hour after the manual dispatch had
  run six jobs green, and created no workflow run — `gh run list` still shows the dispatch alone.
  The morning entry's likely cause (workflows enabled on the fork after the push) is **retracted**:
  the fork was enabled by 07:47Z and the 08:46Z push still made nothing. Logged as a known issue
  (second bite, self-found — not a ticket).
- **Facts that hold:** `actions/permissions` → `enabled: true`; the workflow's API record says
  `state: active` but carries `updated_at` 2026-07-24 — the upstream's date, not this file's;
  the commit message carries no skip token; `on: push: branches: [main, develop]` is the block
  the dispatch used, and the dispatch ran.
- **Why it matters:** a push that validates nothing is the pre-2026-09-06 state with extra steps;
  until the trigger fires, every push needs `gh workflow run ci.yml --ref main` after it.
- **Next:** the owner opens the fork's Actions tab logged in — the enable banner is shown to the
  owner only, and a logged-out view cannot exclude it — and, if the banner is absent, compares
  the workflow record's `updated_at` after a no-op edit to `ci.yml` (a re-registered workflow
  gets today's date). Until then: dispatch after each push.

## 2026-09-07 — First run of the rewritten CI: the push made none, a dispatch ran six jobs green
- **What:** the push of `49afba0` (07:42Z) created no workflow run — the fork had never had one,
  for the old `ci.yml` either. Actions enabled and the workflow `active`, so
  `gh workflow run ci.yml --ref main` was the test: run 34097250095, six jobs green in about a
  minute — `check` 55 s (corpus + bind), `docs` 7 s, and the Node 18/20/22/24 `compat` matrix at
  about 50 s each, which is the keypoint dispatch the 2026-09-06 baton asked for before the next
  `v*` tag.
- **Why:** a workflow is proven by a run. The v7 action majors and the vendored cpc gates on
  `ubuntu-latest` had only run locally.
- **Likely cause, unverified:** GitHub holds a fork's workflows until the owner enables them in
  the Actions tab, and the enable happened after the push. The next push settles it: a run
  should appear on its own.
- **Rejected:** an empty commit to test the push trigger — the next real push tests it for free.
- **Opens:** if the next push makes no run, that is a known issue here (self-found — DEVLOG,
  not a ticket).

## 2026-09-06 — CI cut to what validates the product: two jobs per push, the Node range at a keypoint
- **What:** `.github/workflows/ci.yml` rewritten. Per push and PR: `check` (Node 22 — type-check,
  build, artifact presence, `npm run test:corpus`, `npm run test:bind`) and `docs` (the vendored
  `cpc.docs_check --strict` + `cpc.integrity_check --strict`, `fetch-depth: 0`). `compat` runs the
  Node 18/20/22/24 matrix only on a `v*` tag or `workflow_dispatch`, the corpus on 22+ where
  `node --test` takes a glob. Actions on their v7 majors; `permissions: contents: read`;
  `concurrency` with tags exempt; `timeout-minutes` on every job. `.claude/NORTH_STAR.md`'s
  `updated:` bumped (2026-08-09 → today) so the strict docs gate is green on arrival, not red on
  day one.
- **Why:** the old file ran six jobs per push — a 3-way Node matrix for build, a 2-way for tests,
  and a third job repeating the type-check — while the product is a wireframe reading, not code:
  the gate that finds a regression is the fixture corpus (ADR-001, SPEC-001), and it ran in two of
  the six. Lucas asked for the standard shape (cpc §13: tier by trigger, cancel superseded runs,
  heavy work at a keypoint) and nothing more. The repo is public, so this is about signal and
  reading time, not minutes.
- **Rejected:** a diff-classifying first job (nothing heavy is left to gate); dropping the
  Node-range check (the `engines` floor is 18 and the build is what a consumer installs — worth one
  run per release); keeping the artifact upload (nothing downloads it).
- **Verified locally, the exact commands CI runs:** type-check clean; build produces `dist/index.js`,
  `dist/server.js`, `dist/bin.js`, `dist/frontend/`; corpus **43 tests, 10 suites, 43 pass, 0
  fail**; bind guard passes; `just lint` (docs + integrity, strict) 0 errors, 0 warnings — the
  NORTH_STAR warning is gone; the workflow parses. **Not verified:** an Actions run — the v7 majors
  and the `compat` gating are proven only by the first push and the first dispatch.
- **Opens:** read the first run; dispatch `compat` once by hand before the next tag.

## 2026-09-05 (b) — The cpc 1.5.0 → 1.8.0 re-vendor landed inside the ticket-ledger commit
- **What:** `bed553e` carries 34 files: this session's five (the ledger, `AGENTS.md`, the feedback
  note, DEVLOG, SESSION) **and the 29-file re-vendor of `tools/conventions/cpc/`** from 1.5.0 to
  1.8.0 that had sat staged and unwritten-up since before this session (`_VERSION` 1.5.0 → 1.8.0;
  new modules `_console.py`, `ci_budget.py`, `date_stamp.py`, `docs_rules_history.py` and more).
  Its subject also carries a stray closing quote and a pathspec.
- **Why it happened:** the suggested command was `git commit -m "…" -- <paths>`; under PowerShell
  the quote and the en dash inside the subject broke the parse, the pathspec became part of the
  message, and `git commit -m` took the whole index.
- **Why not rewrite:** the commit is on `origin/main`. An amend means a force-push; on a private
  solo fork that is allowed but is the owner's call, and this entry makes the commit legible
  without it.
- **Consequence:** the vendored cpc is 1.8.0 — still without `cpc.ticket`, so the ledger's intro
  (run the global `cpc-ticket --root .`) stands until the next re-vendor.

## 2026-09-05 — The inbound-issue ledger, and the first five tickets (cpc ADR-047)
- **What:** `docs/TICKETS.md` laid from cpc's `templates/docs/TICKETS.md` (its fleet follow-up
  item 7 names this repo). Opened **T-001–T-005** from
  `docs/feedback/2026-08-21-provenote-wireframe-session.md` §1–§5: a text element created without
  `width`/`height` is stored with a null bbox and dropped from the reading, taking every screen
  heading with it (§1); a declared `role: shape` is counted as a fallback (§2); no `progress` /
  `meter` role (§3); `textAlign` on a bound label round-trips but renders centred (§4); screen
  naming picks the topmost ≥20px heading over the largest (§5). `AGENTS.md`'s Reference line routes
  at the ledger; the feedback note carries a one-line pointer to the tickets. §6 of the note is
  praise and got no ticket.
- **Why:** the note had sat 15 days as `class: disposable` with nothing tracking whether its
  findings were answered — the DEVLOG's newest entry predates it. A ticket is what somebody
  *reported*; a known issue is what this project found in itself. Two of the five (§1, §2) are
  defects in the reading, the product's own claim.
- **Rejected:** folding them into `KNOWN_ISSUES.md` (its admission test is "twice", and a report has
  bitten once, elsewhere); running the verbs from the vendored drop — `tools/conventions/cpc/` is
  1.8.0 and predates `cpc.ticket`, so the ledger's intro says to use the global `cpc-ticket --root .`
  until the next re-vendor.
- **Verified:** `cpc-ticket --root . check` → 5 tickets, 5 open, OK. `just check` (vendored
  `docs_check --strict`) reports one warning that predates this session — `.claude/NORTH_STAR.md`'s
  `updated:` (2026-08-09) lags its last commit (2026-08-11) — and nothing about the ledger.
- **Opens:** answer them. §1 is the costly one (the documented happy path silently does nothing);
  the note's own fix order is measure text server-side, else reject at the API, at minimum name the
  cause in the "could not be named" line. `claude-skills` now ships `wireframe-first` (its
  v0.56.0), which routes every wrong reading a consumer meets to this ledger — expect tickets from
  outside.

## 2026-08-07 — Merged upstream for the first time since the fork (rule 2)
- **What:** `git merge upstream/main` — `2930519` (export fidelity) and `ecf3cac` (`.passthrough()`).
  Clean, no conflicts. Brings `src/core/expand-elements.ts` (new, 276 lines), rewrites
  `src/core/share-url.ts`, and touches `scene-io.ts`, `obsidian-md.ts`, `server.ts`. Merge commit
  `1c5925b`.
- **Why:** it fixes a live data-corruption bug in our own import path, reproduced before merging.
  Our `CreateElementSchema` had no `containerId`, `index`, `seed` or `versionNonce`, and zod strips
  unknown keys — so a scene exported with 10 bound text children came back from `import` with
  **0**. Every label detached from its shape, and the reading changed with it: `button "General"`
  became `button` plus a separate child `text "General"`, and **`input? "Project name"` became
  `card?`** — 23 components/5 inferred turned into 33/7. `wireframe --score` did **not** flag any of
  it (`fallbacks` stayed 0), so it was silent. `snapshot restore` shares the defect: restoring a
  snapshot taken while the labels were intact also returned 0 `containerId`. Both of the skill's
  documented recovery paths were corrupting drawings.
- **Rejected:** cherry-picking only the schema additions (leaves us permanently diverged on
  `share-url.ts`/`scene-io.ts`, converting a free merge into a conflicted one next time);
  reimplementing the schema fix ourselves (same outcome, all of the divergence cost, none of the
  benefit); continuing to defer (the cost only grows — every commit we add to `server.ts` widens the
  collision surface, and this was the cheapest the merge will ever be).
- **Verified:** `type-check` clean, full build, 43/43 tests, bind check. Merged schema carries
  `containerId`/`index`/`seed`/`versionNonce` on both Create and Update, `.passthrough()` on both,
  and `role: RoleSchema.optional()` still validates — so unknown props now survive without invalid
  roles slipping through. Then the decisive test, same input file as before the merge:
  **35 elements / 10 `containerId` in → 35 / 10 out**, and the reading returned to 23 components,
  5 inferred, 0 fallbacks — identical to the original drawing. `export` to both `.excalidraw` and
  Obsidian `.excalidraw.md` still work (the `expand-elements.ts` path).
- **Not tested:** `share`. It uploads the scene to excalidraw.com, and `share-url.ts` is the file
  upstream rewrote most heavily — so that is exactly the path most worth exercising and the one that
  needs a deliberate decision to publish a scene externally. Smoke-test it before relying on it.
- **Opens:** `.passthrough()` now makes `customData` viable, which is what **KI-5** (copy-paste
  destroys a declared `role`) and Phase 3 have been waiting on — the roadmap item is no longer
  blocked on upstream. Nothing else changed for our layer: upstream has never touched
  `wireframe.ts` or `changes.ts`, which is why this merged clean at 14 commits of divergence.

## 2026-08-07 — A multi-tab guard, and fixing the regression the echo fix introduced
- **What:** two changes from two failed attempts at the PR 1 markup round. (1) `multiClientWarning`
  in `src/cli/util.ts`, wired into `changes` and `watch` — warns on stderr *and* in-band in the
  report when `/health` shows more than one browser tab connected; in `watch` it fires **before** the
  wait. (2) `boundChildSupersedesLabel` in `src/core/changes.ts`, applied on the sync handler's
  no-delta path in `src/server.ts`. Seven new assertions across
  `tests/multi-client-guard.test.mjs` and `tests/frontend-echo.test.mjs`.
- **Why (1):** with two tabs open, each POSTs its whole scene and the handler reads "absent from this
  payload" as "the human deleted it", so the tabs delete each other's elements indefinitely. It wiped
  a complete round of human markup — 386 adds against 385 deletes, six annotations gone,
  unrecoverable because change records carry no geometry. `changes` reported "1 change" because the
  adds and deletes cancelled out. Logged as **KI-7**; the protocol fix is a separate ADR.
- **Why (2):** **this was a regression introduced by the same day's echo fix.** Suppressing the
  browser echo meant the first sync no longer produced a delta — which was the point — but the early
  `continue` on the no-delta path skips the merge branch that drops a shape's agent-format `label`
  once Excalidraw has expanded it into a bound text child. So every shape kept a `label` that each
  new client load re-expanded into another duplicate child: 10 shapes across 4 tab loads produced 40
  stray text elements. The comment at that branch already warned that keeping the label "would leave
  two competing sources of truth"; the fix moved the code path around it without noticing it was
  load-bearing.
- **Rejected:** reverting the echo fix (removes the regression but restores the original bug —
  phantom human writes and markup detection silently off; trades a visible problem for an invisible
  one); making the *merge* path's label-drop conditional on a bound child existing too (a real
  behaviour change to a path that is working — the new predicate is applied only where the gap was);
  hard-refusing to run with two tabs (there is no legitimate multi-tab case, but a refusal blocks
  reads that are perfectly safe, and a loud warning in both channels already makes the condition
  impossible to miss).
- **Verified:** 43/43 tests, `type-check` clean. Live, after **two** page reloads on a fresh server:
  35 elements (25 agent + exactly 10 bound labels), **0 duplicated containers**, **0 shapes carrying
  a stale label**, `origins: {"agent":25}`, `trustOrigin: true`, and `rev` still **25** — the browser
  echo is now completely inert, which is a stronger result than the morning's fix alone produced. The
  guard was confirmed silent at one client; its warning text is unit-tested, and the field it reads
  is the same `websocket_clients` that read `2` while diagnosing KI-7.
- **Opens:** **PR 1's attribution number is still untaken** — three attempts today, defeated by
  `trustOrigin`, then by KI-7, and the third round was never drawn. Everything blocking it is now
  fixed; it needs one sitting.
- **Upstream (rule 2):** this change edits `src/server.ts`, the collision zone. Upstream's two
  commits (`2930519`, `ecf3cac`) were re-checked — still no conflicts — and the merge was
  **deliberately deferred** so a bug fix and a five-file upstream merge are not reviewed together.
  The deferral is the decision rule 2 asks for, not an omission. Take the merge as its own step;
  `ecf3cac`'s `.passthrough()` remains what `customData` and KI-5 need.

## 2026-08-07 — ADR-002 accepted: the geometry lint's shape (ROADMAP PR 4)
- **What:** `docs/decisions/ADR-002-geometry-lint.md`, accepted. A `--lint` flag on `wireframe` with
  the findings also under `lint` in `wireframe --json`; two severities, only reading-affecting rules
  as errors; reporting only, no exit-code gate. No code yet.
- **Why:** the lint's central check *is* the reader's nesting computation, so it must consume
  `readWireframe`'s model rather than re-derive geometry — a lint that disagreed with the reader
  about containment would be worse than none. Carrying `lint` inside `wireframe --json` also hands
  the planned browser panel tree, score and findings in one request, against one consistent snapshot
  of a canvas someone may still be editing.
- **Rejected:** folding findings into `--score` (conflates "the reading succeeded" with "the drawing
  is well-formed", and changes a contract four consumers already assert on); a separate `lint`
  command (splits the canvas into two reads that can race); relying on Excalidraw's own grid and
  object snapping (helps only a human, only at draw time, only for position — and the 4.29px failure
  that motivated this was produced by a human dragging *with* those aids on); gating now
  (the tolerances are uncalibrated, and gating on unvalidated numbers teaches people to bypass it).
- **Opens:** two ⚠ in the ADR's Confidence block. Every numeric tolerance is currently a guess — the
  conventions state targets, not tolerances — and the error/advisory split is a judgement call in
  which only containment has been *demonstrated* to change a reading. Both need calibrating against
  the corpus before the advisory rules ship, with the chosen values and their evidence recorded in a
  SPEC alongside the code.

## 2026-08-07 — The first human markup round, and the origin bug it exposed (ROADMAP PR 1)
- **What:** ran the two-way review loop with a person at the canvas for the first time (KI-3). It
  broke before a single annotation was drawn. Fixed the load-bearing defect:
  `canonicalizeElement` now drops width/height for text elements, and `diffCanonical` compares
  through a new `fieldsEqual` that treats "unset" and the editor's own default-fill as equal
  (`EDITOR_DEFAULTS`). Eight assertions in `tests/frontend-echo.test.mjs`. Also documented `watch`'s
  240s ceiling in the skill and cheatsheet, then `npm run sync:skills`.
- **Why:** opening the canvas in a browser — which the loop *requires*; the tab is the transport —
  makes Excalidraw echo the whole scene back with every unset style property filled in
  (`fillStyle: null → "solid"`, `strokeWidth: null → 2`, …) and every text box re-measured
  (`width 400 → 177.75`). The server stamps anything arriving from the browser `human`, so all 25
  agent-drawn elements were restamped in one write. Two failures followed. `changes` offered 25
  normalization records as the human's design feedback, against a skill that says "only `by human`
  entries are feedback". And `trustOrigin` — `allElements.some(el => el.origin === 'agent')`,
  `src/core/wireframe.ts:531` — went false, so `collectMarkup` silently stopped detecting everything
  except freedraw. The headline feature of the review loop could not work in its own documented
  workflow, and no fixture could show it: the corpus reads `.excalidraw` off disk and never passes
  through a browser.
- **Rejected:** normalizing at creation time in `normalize.ts` so the echo matches (the true root
  cause, but that file is collision-zone under rule 2 with an undecided upstream merge open, and it
  would not repair elements already stored); absorbing the frontend's concrete values on a no-delta
  echo so storage becomes concrete and *later* style-only edits stay detectable (correct, and the
  better long-term shape — but it lives in `server.ts`, also collision-zone); treating unset as equal
  to *any* value (would permanently suppress "the human filled this shape red" on any property the
  agent never set — hence a per-field default map, so a non-default value still reports); a
  live-server test driving `POST /api/elements/sync` (the honest level for this, but ADR-001 keeps
  the server out of the suite deliberately, and the defect is in a pure comparison function that a
  unit test pins exactly).
- **Verified:** the tests were proved to fail before being trusted — stash the fix and 3 of 8 fail,
  and it is the right 3: the echo guards fail, the five "real edits still report" assertions pass
  either way. Then end-to-end on the live canvas: *before*, opening the tab produced 25 phantom
  `human` records and `trustOrigin: false`; *after*, the identical action produced `No changes — the
  canvas is exactly as you left it`, `origins: {"agent":25}`, `trustOrigin: true`. Full suite 36/36,
  `type-check` clean, and no golden moved — the fix does not change how any fixture reads.
- **Opens:** **PR 1's number is still unmeasured.** Markup attribution accuracy needs a person to
  draw annotations and the session pivoted to feature design before that; the blocker is gone but the
  measurement is not taken. New: KI-5 (copy-paste in the browser destroys a declared `role` —
  screen 1 read `button "General"`, its copy read `button? "General"`) and KI-6 (`changes` attributed
  a 1160x1180 duplicated screen frame as `annotates` a 540x48 input, because `looksLikeAnnotation`
  accepts any transparent rectangle at any size). Agreed next: a geometry lint — `--score` reported
  "1 screen could not be named" where the cause was a footer sitting 4.29px outside its frame; the
  lint should report the cause. Core lint first with a JSON contract, browser panel as a thin view
  over it. Needs an ADR.
- **Upstream (rule 2):** `git fetch upstream` at session start — upstream has moved for the first
  time since the fork. `2930519` (export fidelity: preserves `containerId`, `index`, `seed`,
  `versionNonce`, `updated` through import; new `src/core/expand-elements.ts`) and `ecf3cac`
  (`.passthrough()` on the create/update element schemas). Both touch `src/server.ts`;
  `git merge-tree` reports **no conflicts**. **Decision deferred** — nothing this session touched the
  collision zone, so the merge was not needed to proceed. It is directly relevant to Phase 2's
  `customData` plan (`.passthrough()` is the mechanism that would let it survive), and to KI-5.
  Decide next session.

## 2026-08-01 — `wireframe --score`, and the reading now reports its own failures (ROADMAP PR 3)
- **What:** `wireframe --score` emits the pre-flight counts as JSON and nothing else; `wireframe
  --json` carries the same object under `score`; and `formatWireframe` grew a `### Reading quality`
  block that appears **only** when `fallbacks`, `unnamedScreens` or `orphans` is non-zero. Skill,
  cheatsheet and conventions §9 updated, then `npm run sync:skills`.
- **Why:** the roadmap asked for the flag. The report block is the same counts aimed at the other
  consumer: the MCP tool `describe_wireframe` takes no arguments, so a CLI-only flag would leave an
  agent reading its own drawing back with no way to be told the reading gave up — which is exactly
  who needs telling.
- **Rejected:** always printing the quality block (a clean reading should not carry a paragraph
  saying nothing is wrong, and it would have churned every golden); making `inferred` a warning
  (`?` marks are normal — `list-detail` has 5 and reads correctly, so warning on them would train
  the reader to ignore the block); a `--check` flag that exits non-zero on a bad score (a gate is a
  bigger decision than "emit the number", and nothing asked for it yet).
- **Verified:** live CLI round-trip on both a clean and a deliberately-bad drawing — 21 components
  all zero, versus 3 fallbacks and 1 unnamed screen. The corpus caught the report change and scoped
  it exactly: 1 of 5 goldens moved, +5 lines, the other four byte-identical.
- **Opens:** nothing new. Phase 1 now hangs entirely on PR 1, the human markup round.

## 2026-08-01 — Fixture corpus + the repo's first test harness (ROADMAP PR 2)
- **What:** five `.excalidraw` fixtures drawn through the real CLI, each with a hand-authored
  expectation and a golden reading; a `node:test` harness (28 assertions) reading them off disk;
  `scoreWireframe()` exported from `src/core/wireframe.ts`; `npm test` / `test:corpus` /
  `corpus:update`; and a CI `test` job. Decision in `docs/decisions/ADR-001-fixture-corpus-harness.md`,
  the how-to in `docs/specs/SPEC-001-fixture-corpus.md`.
- **Why:** `wireframe.ts` (32 KB) and `changes.ts` (27 KB) carry the whole differentiator and had no
  regression coverage at all — CI ran `type-check` and `build` and nothing else. Every inference
  change was being validated by looking at a screenshot, which the roadmap already calls too weak.
- **Rejected:** Vitest (a dependency tree and a transform this project does not otherwise need);
  driving the canvas server inside the tests (slow, order-dependent, and it *destroys* the thing
  being tested — the server stamps `origin: "agent"`, so markup attribution becomes untestable);
  a text-golden-only corpus (regenerable in one command, so eventually regenerated unread).
- **Verified:** the harness was proved to fail before being trusted — moving
  `HEADING_MIN_FONT_SIZE` 20 → 24 broke all five golden readings (23 pass / 5 fail), then reverted.
- **Opens:** PR 3 is now just a CLI flag over `scoreWireframe()`. Markup attribution has a first
  number (4/5) and a miss worth chasing: a note binds to the input above the card it sits level
  with. The corpus does not cover the create/normalize path, since fixtures are read from disk.

> Entries below dated 2026-07-31 were backfilled on 2026-08-01 from the commits and the baton; they
> are short by intent, not by neglect.
