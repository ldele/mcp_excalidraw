<!-- status: archived · updated: 2026-09-07 · class: append-only -->

# SESSION archive 001

Rotated baton entries — older than the newest 10 kept in `.claude/SESSION.md`, moved here **verbatim** per ADR-018 D1. Newest entry on top. Append-only; never edited.

## 2026-11-16 (h) — Claude Code — upstream 2.2.0 merged on a branch; STAGED
- **Done:** SPEC-004. Upstream 2.2.0 merged; ours stays the default store, `EXCALIDRAW_DATA_DIR`
  switches to upstream's (owner's call). Four findings, one sync fix (DEVLOG 2026-11-16 (h)).
  Entry (g) was committed as `09cd3e2` and pushed.
- **Where:** branch `merge/upstream-2.2.0`, worktree `C:\Projects\mcp_excalidraw-merge`, merge in
  progress, everything staged, nothing committed. The main checkout is untouched. No canvas left
  running; probes used 3061 and 51917.
- **Next:** the owner reviews `git diff --cached` there and commits the merge; `main` takes the
  branch; `npm ci && npm run build` in the main checkout with no canvas running; push, then
  dispatch CI (KI-8). Then build ADR-003 to ADR-005.
- **Picks up:** any session with a terminal; the ADR builds need a browser tab.

## 2026-11-16 (g) — Claude Code — ADR-003 to ADR-005 accepted; 2.2.0 merge decided; STAGED
- **Done:** the owner decided ADR-003 (frames), ADR-004 (colour intent) and ADR-005 (approval
  boxes), and decided to merge upstream 2.2.0 next. Recorded in the ADRs, the tickets, CONTEXT,
  FORK.md and DEVLOG 2026-11-16 (g). Entry (f) was committed as `d2a1045` and pushed.
- **Where:** `main`, staged, not committed. Nothing built.
- **Next:** the 2.2.0 merge as its own piece of work: a spec like SPEC-002, a branch, the store
  question settled first, and our tracking and sync rebuilt inside `commitCanvasMutation`. Then
  build ADR-003 to ADR-005, then PR 4.
- **Picks up:** any session with a terminal; the ADR builds need a browser tab for their round
  trips.

## 2026-11-16 (f) — Claude Code — T-024 fixed; STAGED
- **Done:** elbowed arrows keep their bindings through export, import and a tab (DEVLOG 2026-11-16
  (f)). T-024 is closed. Entry (e) was committed as `9c15c1f` and pushed.
- **Where:** `main`, staged, not committed. `dist/` and `dist/frontend` are rebuilt. No canvas is
  left running; the probes used port 3050.
- **Mind:** Playwright's bundled headless shell is not installed here. Run the browser suite
  against the system Chrome with a config that sets `use.channel` to `chrome`; `PW_CHANNEL` is not
  read.
- **Next:** the owner's calls on the 2.2.0 merge and ADR-003 to ADR-005; then PR 4.
- **Picks up:** any session with a terminal.

## 2026-11-16 (e) — Claude Code — T-027 and T-028 framed as ADR-003 to ADR-005; STAGED
- **Done:** three proposed ADRs in `docs/decisions/`, with pointers from both tickets and CONTEXT
  (DEVLOG 2026-11-16 (e)). Entry (d) was committed as `bd24f30` and pushed. No code changed.
- **Where:** `main`, staged, not committed.
- **Owner's calls:** one option in each of ADR-003, ADR-004 and ADR-005, and the 2.2.0 merge.
- **Next:** build what the ADRs decide; options that change the reading need rule 4's round trip.
  Then PR 4.
- **Picks up:** any session with a terminal. ADR-003's option 2 needs a browser tab to check how
  a frame's name looks when zoomed out.

## 2026-11-16 (d) — Claude Code — T-026 and T-001 fixed; STAGED
- **Done:** a tab's first sync no longer marks shapes drawn with a font key as a person's, and
  text added without a size is read with an estimated box. Both tickets are closed (DEVLOG
  2026-11-16 (d)). Entry (c) was committed and pushed; it is `d9dcbdf` since the rewrite below.
- **Where:** `main`, staged, not committed. `dist/` is rebuilt. No canvas is left running; probes
  used ports 3048 and 3049.
- **Mind:** the cpc session rewrote this repository's history on 2026-11-16 to take
  `tools/conventions/` out of every commit, and force-pushed it. The hashes named in older entries
  and the DEVLOG no longer exist; find those commits by their message.
- **Next:** the owner's call on 2.2.0; then PR 4.
- **Picks up:** any session with a terminal.

## 2026-11-16 (c) — Claude Code — T-022 and T-025 fixed; STAGED
- **Done:** `apply` deletes before it creates, and a delete takes a shape's bound label with it.
  Both tickets are closed (DEVLOG 2026-11-16 (c)). Entry (b) was committed as `e5c58ef` and pushed.
- **Where:** `main`, staged, not committed. `dist/` is rebuilt, so `excalidraw-canvas` on PATH has
  both fixes.
- **Mind:** the delete route in `src/server.ts` is one more touch for the 2.2.0 merge (`FORK.md`).
- **Next:** the owner's call on 2.2.0; T-026 and T-001; then PR 4.
- **Picks up:** any session with a terminal.

## 2026-11-16 (b) — Claude Code — cpc untracked and gitignored, rule 5; STAGED
- **Done:** `tools/conventions/` is out of git and gitignored, CI's cpc job is removed, and the
  owner's rule is `.claude/CONTEXT.md` rule 5 (DEVLOG 2026-11-16 (b)). Entry (a) was committed as
  `cf11f24`.
- **Where:** `main`, staged, not committed; nothing pushed.
- **Mind:** a fresh clone or worktree has no gates until it re-vendors from a cpc tag. Never
  `git add -f` under `tools/conventions/`.
- **Next:** unchanged from entry (a). The cpc-wide default is being worked on in its own session,
  in the cpc repository.
- **Picks up:** any session with a terminal.

## 2026-11-16 — Claude Code — cpc 1.23.0, upstream 2.2.0 measured, docs cut, tickets triaged; STAGED
- **Done:** the cpc re-vendor and its follow-ups, the README and FORK.md cut, and the triage of 17
  open tickets, each ranked (DEVLOG 2026-11-16).
- **Where:** `main`, staged, not committed. `docs/TICKETS.md` also carries T-020 to T-022 and the
  T-006 note, which another session left unstaged in October.
- **Owner's calls:** whether to merge upstream 2.2.0 (`FORK.md` § Upstream 2.2.0), and whether to
  lay cpc's deny rules (cpc ADR-080).
- **Next:** T-022 and T-025, then T-026 and T-001, then PR 4.
- **Picks up:** any session with a terminal.

## 2026-10-23 — Claude Code — T-023 fixed: the scene is saved per port, a tab outlives a restart; STAGED, not committed
- **Done, from a drawing-app session on the owner's word ("fix it in the toolkit"):** T-023 filed
  and fixed. The server saves its scene to `scene-<port>.json` beside the pidfile and loads it on
  start (`src/core/scene-store.ts`, new); a tab that reconnects to a restarted process merges and
  sends its scene back (`frontend/src/App.tsx`, `frontend/src/utils/scene.ts`). Docs: README,
  `FORK.md`, the skill and cheatsheet (synced), KI-7. DEVLOG 2026-10-23.
- **Where:** the main checkout, `main` at `060139c`, staged (`git diff --cached`). In
  `docs/TICKETS.md` only T-023 is staged: T-020 to T-022, another session's (2026-10-21), stay
  unstaged in the working tree for their own commit.
- **Verified:** `npm test` 88 / 88 plus scripts; Playwright 22 / 22 with the system Chrome; seeded
  defects caught; a live kill-and-restart round on 3021. `dist/` is built, so `excalidraw-canvas`
  on PATH carries the fix.
- **Upstream moved** (7 commits, its own opt-in store among them, 12 conflicts in a dry merge);
  not merged. What to decide at the next merge is in `FORK.md`.
- **Mind:** port 3010 waits on the owner, who is exporting a tab still open on it from before
  this build; do not start a canvas there until they say so. Port 3000 belongs to a
  pharma-dq-validator session. The house skill `wireframe-first` (claude-skills) still said "the
  canvas is memory"; its edit is staged in that repository, not here.
- **Next:** the owner reviews and commits; push; dispatch CI by hand (KI-8). Then T-001 with no
  tab, then PR 4. The pull request to upstream stays held.
- **Picks up:** any session with a terminal.

## 2026-10-09 — Claude Code — the spare worktree and three merged branches are gone; the probes moved
- **Corrects every earlier line that names `C:\Projects\mcp_excalidraw-merge`** — the "Standing,
  local only" of entries (h) and (j) of 2026-10-08, the Where of entry (i), and the older ones.
  That worktree no longer exists. It was removed on 2026-10-08, on the owner's word, with the
  local branches
  `merge/upstream-2.1.2`, `t009-waypoints-fork` and `t015-origin-guard`: all three merged into
  `main`, deleted with `git branch -d`, none of them ever on GitHub.
- **The probes were kept, not lost.** The three scripts and two Playwright configs that sat
  untracked there are in `C:\Projects\mcp_excalidraw-upstream\tests\probe-fork\`, with a
  `README.txt` that says what each one answers and how to run it. Where the DEVLOG, the entries
  (e) to (j) of 2026-10-08, or T-015's Reproduce line say `mcp_excalidraw-merge\tests\probe`,
  read that folder.
- **What is left locally:** `main`, and `t009-waypoints-upstream` in
  `C:\Projects\mcp_excalidraw-upstream`, which holds the held upstream patch (`527500b`), its
  `PR_BODY.md`, the upstream tab probe and now `tests/probe-fork/`. All of that is untracked or
  unpushed, so removing that worktree loses it.
- **Next:** unchanged from entry (k) of 2026-10-08: T-001 with no tab, then PR 4. The pull
  request to upstream stays held.
- **Picks up:** any session with a terminal. No canvas is running.

## 2026-10-08 (k) — Claude Code — T-016 fixed: the skill names `icon`, and a test holds its role lists to the code
- **Done, from a UI-Wizard session on the owner's word:** the skill's two role lists name `icon`,
  the conventions say to declare it on every glyph, and `tests/role-docs.test.mjs` fails when a
  role in `COMPONENT_ROLES` is missing from either list. T-016 closed. DEVLOG 2026-10-08 (k).
- **Where:** committed on `main` on the owner's word, after entry (j), which its own session had
  committed as `d50f8ff`. While both were uncommitted this work was kept out of the index so the
  two stayed two commits.
- **Verified:** `npm test` 85 / 85 plus wire, bind, render, state; `tests/expected/` untouched;
  `cpc-ticket check` and `docs_check --strict` on the working tree.
- **Mind:** `dist/` was rebuilt by the tests at `47b9c66`; no source changed, so the command on
  PATH behaves as entry (j) left it.
- **Next:** T-001 with no tab, then PR 4. The pull request to upstream stays held.
- **Picks up:** any session with a terminal. No canvas is running.

## 2026-10-08 (j) — Claude Code — main checkout reinstalled and rebuilt; the guard and the new dependencies are live
- **Supersedes the "Mind this first" of entry (h) and the Where and Next (1), (2) of entry (i).**
  The guard is on `main` (`23e4afc`, pushed, CI green). The main checkout was reinstalled and
  rebuilt at that commit, so `excalidraw-canvas` on PATH carries the T-015 guard, the T-009 fix
  and the new dependencies (`npm audit` 14). DEVLOG 2026-10-08 (j).
- **Verified:** `npm test` 79 / 79 plus scripts and Playwright 19 / 19 in the main checkout; with
  the command from PATH on a private port, a foreign `Origin` gets 403 and the tool works.
- **A canvas was stopped to do it** (pid 91356, 105 elements, one tab), the owner having said it
  was free. Its scene, change log and reading were saved first, outside the repository, in the
  session's temporary folder; the owner was given the path. **No canvas is running.**
- **Standing, local only:** the spare worktree `C:\Projects\mcp_excalidraw-merge` is on
  `t015-origin-guard` (merged) and holds three untracked probes and two Playwright configs; the
  branches `t009-waypoints-fork` and `t015-origin-guard` are merged. Removal is the owner's word.
  `C:\Projects\mcp_excalidraw-upstream` holds the held upstream patch.
- **Next:** T-001 with no tab, then PR 4. T-016 (filed from UI-Wizard) is open. The pull request
  to upstream stays held.
- **Picks up:** any session with a terminal.

## 2026-10-08 (i) — Claude Code — T-015's guard built; STAGED ON A BRANCH in the spare worktree, not on main
- **Where:** branch `t015-origin-guard`, cut from `main` at `438ef80`, in
  `C:\Projects\mcp_excalidraw-merge`. Everything staged (`git diff --cached` there), nothing
  committed. The main checkout is untouched: a canvas was running from it.
- **What:** `src/core/origin-guard.ts` (new, ours), +5 −2 in `src/server.ts`, one check in the
  state script, README and `FORK.md`, T-015 closed. A request from another site's page, or
  addressed to another host, gets 403 on the API and on the socket. DEVLOG 2026-10-08 (i).
- **Verified there:** `npm test` 79 / 79 plus scripts (state 9); Playwright 19 / 19; the tab
  probe; five seeded defects caught; in Chrome 154 all four page origins of the ticket blocked.
- **Not verified:** Linux; `npm run dev` with `CANVAS_ALLOWED_ORIGINS=http://localhost:5173`.
- **Next:** (1) the owner reviews and commits on the branch, then `main` takes it; push; dispatch
  CI by hand (KI-8). (2) **With no canvas running:** `npm ci && npm run build` in the main
  checkout — owed since entry (h), and needed again once the guard is on `main`. (3) T-001 with
  no tab, then PR 4. The pull request to upstream stays held.
- **Mind:** the spare worktree also holds three untracked probes and two Playwright configs
  (`tests/probe/`, `playwright.*.config.mjs`). They are not part of the change; do not `git add
  -A` there.
- **Picks up:** any session with a terminal.

## 2026-10-08 (h) — Claude Code — advisories 22 → 14 by two dependency fixes; MAIN CHECKOUT NOT REINSTALLED; T-015 filed
- **Mind this first.** `package.json` and `package-lock.json` changed, and the main checkout was
  **not** reinstalled: a canvas was running from it (pid 91356, 98 elements, one tab — entry
  (g)'s "No canvas is running" no longer held). Its `node_modules`, `dist/frontend` and
  `excalidraw-canvas` on PATH are still the old dependency set. **With no canvas running:**
  `npm ci && npm run build` in the main checkout, then `excalidraw-canvas status`. Do not stop
  that canvas to do it: it holds a drawing with a tab on it.
- **Done:** the 22 advisories read (all upstream's); `npm audit fix` and the Mermaid converter
  to `^2.2.2` take them to 14, none reachable as far as checked. Verified in the spare worktree
  on `main`'s code: tests 79 / 79 plus scripts, Playwright 19 / 19. DEVLOG 2026-10-08 (h);
  `FORK.md` says what to redo at a merge. Closes "the 22 advisories" in the Next of (d) to (g).
- **T-015 filed and committed (`9d2beff`):** any origin can read, change and wipe a running
  canvas; a write through sync is logged as a person's. Assessed and demonstrated, a guard
  proposed in the ticket, **not built** — the owner has not said.
- **Standing, local only:** the spare worktree `C:\Projects\mcp_excalidraw-merge` now holds three
  untracked probes in `tests/probe/` (tab sync, cross-origin HTTP, cross-origin browser) and two
  Playwright configs. Two test servers from this morning were still running on private ports
  34877 and 35713 (pids 23164 and 31452, no tab on either); left alone.
- **Next:** (1) the reinstall above. (2) T-015, if the owner wants the guard. (3) T-001 with no
  tab, then PR 4. The pull request to upstream stays held.
- **Picks up:** any session with a terminal.

## 2026-10-08 (g) — Claude Code — T-010 and T-007 fixed; staged, not committed
- **Supersedes the Next of (f):** its first item is done. The tab's own layout — a wrapped label,
  a shape grown to fit its label, a bound arrow given its box and default head — is no longer
  recorded as an edit by human. `src/core/changes.ts`, one branch in the sync handler of
  `src/server.ts`, 13 tests, one line in `SKILL.md`. DEVLOG 2026-10-08 (g).
- **Where:** the main checkout, `main` at `44f9d47`, everything **staged** (`git diff --cached`).
  Asked for from a UI-Wizard session; that repo's markup round on its dashboard waited on this.
- **Verified:** `npm test` 79 / 79 plus wire, bind, render, state; Playwright 19 / 19 with the
  system Chrome; `tests/expected/` untouched; `cpc-ticket check` OK. In a real tab, seven scenes:
  28 records by human on the old build across the six that were run there, 0 on this one, and
  the arrows read as flows again (table in the DEVLOG).
- **Not verified:** a person's own resize or retyping driven by hand in a tab (tests cover the
  payloads). Scribe's two scenes are not on this machine.
- **Mind:** `dist/` here, and so `excalidraw-canvas` on PATH, carries the staged fix.
- **Next:** (1) the owner reviews and commits; push; dispatch CI by hand (KI-8). (2) T-001 with no
  tab, then PR 4; the 22 advisories. The pull request to upstream stays held.
- **Picks up:** any session with a terminal. No canvas is running.

## 2026-10-08 (f) — Claude Code — the check is in the state script; entry (e)'s "not pinned" is closed
- **Closes entry (e)'s "Not pinned by a test".** On the owner's word, one check in
  `scripts/check-state-integrity.mjs`: *bound arrows follow a shape an agent moves after a tab
  has synced*. It passes here, fails on two seeded defects in the sync handler and on upstream's
  build. No change in `src/`. DEVLOG 2026-10-08 (f).
- **Its limit:** it builds the tab's payload itself. The browser probe in
  `C:\Projects\mcp_excalidraw-merge` (`tests/probe/`, untracked) is still the only thing that
  reads a real tab; entry (e)'s caution about removing that worktree stands.
- **Also:** CI on `69bf6e9` is green (run 37771956776).
- **Next:** unchanged: T-010's re-wrap, T-001 with no tab, PR 4; the 22 advisories. The pull
  request to upstream stays held.
- **Picks up:** any session with a terminal. No canvas is running.

## 2026-10-08 (e) — Claude Code — checked: the fork keeps arrows attached after a tab sync; no ticket
- **Closes entry (d)'s Open item and its Next (2).** On the fork's build a shape moved through
  the API drags its bound arrows in every state tried, a tab sync and a person's drag included.
  Upstream's sync clears and rewrites the store; ours merges, so `start` / `end` survive. DEVLOG
  2026-10-08 (e); SPEC-003 § Verified.
- **Not pinned by a test.** Nothing syncs a scene with a bound arrow and then moves a shape
  through the API. A candidate for `scripts/check-state-integrity.mjs`; not written, not
  ticketed — the owner has not asked for it.
- **Standing, local only:** the script is untracked in `C:\Projects\mcp_excalidraw-merge`
  (`tests/probe/`), so that worktree now holds something not kept elsewhere. Entry (d)'s Next
  (3) said it could be removed on the owner's word: say so before removing it.
- **Next:** entry (d)'s (1) and (4), unchanged: T-010's re-wrap, T-001 with no tab, PR 4; the
  22 advisories. The pull request to upstream stays held.
- **Picks up:** any session with a terminal. No canvas is running.

## 2026-10-08 (d) — Claude Code — the offer to upstream is HELD; tab test and browser suite run
- **Supersedes entry (c)'s "Not done — step (4)" and its Next (1) and (2).** The owner holds the
  pull request (2026-10-08, *"hold the PR"*). **Do not push `t009-waypoints-upstream`, do not
  open a pull request, and do not put the two commands to the owner again** unless the owner
  raises it. CI on `ac7d8dd` is green (run 37758104927; the new check passed on Linux).
- **Done:** the issue search on upstream, the tab test on patched and unpatched upstream, its
  Playwright suite (19 / 19), and a count of our own use (3 routed bound arrows, one drawing).
  DEVLOG 2026-10-08 (d); the table is in SPEC-003 § Verified. `docs/ROADMAP.md` § Upstream and
  `FORK.md` say "held".
- **Standing, local only:** the patch is commit `527500b` on `t009-waypoints-upstream` in
  `C:\Projects\mcp_excalidraw-upstream`; `PR_BODY.md` and the tab script (`tests/probe/`) are
  untracked there, so removing that worktree loses them.
- **Open:** after a tab's first sync, a shape moved through the API leaves its arrows behind on
  upstream. Whether this fork does the same is **not checked**; no ticket. A task was put to the
  owner.
- **Next:** (1) the order that stood before SPEC-003: T-010's re-wrap, T-001 with no tab, PR 4.
  (2) the open item above, if the owner starts it. (3) on the owner's word only: remove the
  worktree `C:\Projects\mcp_excalidraw-merge` and the branch `t009-waypoints-fork`, both merged.
  (4) unread: the 22 advisories from `npm ci`.
- **Picks up:** any session with a terminal. No canvas is running.

## 2026-10-08 (c) — Claude Code — T-009 fixed on `main`; the offer to upstream decided, not sent
- **Supersedes the Next of (b):** its steps (1) to (3) are done, on the owner's *"yes to all
  four"*. (1) and (2) are `cfa2eae` and `265f7a9`, pushed, **CI green** (run 37756642052, five
  jobs). (3) is this commit: the fix for T-009 on `main`, T-009 closed, SPEC-003 rows 4 and 5
  resolved. Detail: DEVLOG 2026-10-08 (c).
- **Not done — step (4), the pull request to upstream.** The patch is local commit `527500b` on
  `t009-waypoints-upstream` in `C:\Projects\mcp_excalidraw-upstream`; its text is `PR_BODY.md`
  beside it. The session's permission check refused the push of that branch. The owner runs, one
  after the other, `git -C C:\Projects\mcp_excalidraw-upstream push origin t009-waypoints-upstream`
  and `gh pr create --repo yctimlin/mcp_excalidraw --base main --head
  ldele:t009-waypoints-upstream --title "fix: keep waypoints on bound arrows" --body-file
  C:\Projects\mcp_excalidraw-upstream\PR_BODY.md` — or grants the session both.
- **Next:** (1) read the CI run dispatched on this commit: the new check's first run on Linux.
  (2) once the pull request exists, its link in `FORK.md`, SPEC-003 row 5 and here. (3) remove
  the worktree `C:\Projects\mcp_excalidraw-merge` and the branch `t009-waypoints-fork`; keep
  `C:\Projects\mcp_excalidraw-upstream` while the pull request is pending. (4) T-010, T-001,
  PR 4. Unread: the 22 advisories from `npm ci`.
- **Picks up:** any session with a terminal. No canvas is running.

## 2026-10-08 (b) — Claude Code — SPEC-003 run: T-009 is upstream's too; fix staged on two branches; nothing sent
- **Done:** SPEC-003, to its note. T-009 reproduces on upstream alone at `96d9c21`. The fix is
  `resolveArrowBindings` only, +29 −11, with one check in upstream's state script. Arrows without
  waypoints are stored identically with and without it. Detail and the inventory: DEVLOG
  2026-10-08 (b); results per test case: SPEC-003 § Verified.
- **Where, all staged, none committed, none pushed:** (1) the main checkout: the index holds the
  fix for the red CI run (entry below); the working tree adds SPEC-003's results, this entry,
  the DEVLOG's and T-009's triage note, **unstaged**, so the two stay separate commits.
  (2) `C:\Projects\mcp_excalidraw-upstream`, branch `t009-waypoints-upstream`: the patch for
  upstream. (3) `C:\Projects\mcp_excalidraw-merge`, now on `t009-waypoints-fork`: the same
  patch on the fork's code.
- **Open, the owner's:** SPEC-003 rows 4 and 5 — send, keep or drop; and how. Proposal there.
- **Next:** (1) commit and push the red-run fix; dispatch CI; read it. (2) commit SPEC-003's
  docs. (3) the two decisions; if "keep", merge `t009-waypoints-fork`; if "send", the push of
  `t009-waypoints-upstream` and the pull request are each on the owner's word. (4) T-010, T-001,
  PR 4.
- **Picks up:** any session with a terminal. No canvas is running.

## 2026-10-08 — Claude Code — SPEC-002 landed on `main` (`6f25cb7`), pushed; first CI run red, fix staged
- **Supersedes the Next of 2026-10-07 (b):** its steps (1) and (2) are done, on the owner's
  instruction given from a Scribe session. `8913747` (S3) on the branch, `41a3ba7` (ledger,
  SPEC-002 refreshed, SPEC-003 new) on `main`, `6f25cb7` the merge. Pushed. Built and linked: the
  command on PATH is 1.3.0.
- **CI is red on `6f25cb7`**, run 37752960857: the docs gate (the ledger's date, rule 12) and the
  render test on Linux under Node 22 and 24 (upstream's PNG worker cuts off output larger than a
  pipe buffer). Node 20 and Windows pass. Detail: DEVLOG 2026-10-08.
- **Staged, not committed, in the main checkout:** upstream's open #131 for the worker, taken as
  it stands; the ledger with T-011 closed as fixed by the merge; SPEC-002's status; this entry
  and the DEVLOG's. The fix is not proved on Linux: only a dispatched run can.
- **Not done:** the worktree `C:\Projects\mcp_excalidraw-merge` is still there, clean. No canvas
  is running.
- **Next:** (1) the owner commits and pushes the staged set; dispatch CI by hand and read the run.
  (2) SPEC-003 — whether the fix for T-009 is worth sending upstream — placed by the owner right
  after the merge, ahead of T-010's re-wrap, T-001 with no tab and PR 4.
- **Picks up:** any session with a terminal.

## 2026-10-07 (b) — Claude Code — merge committed (`b8d3f39`); S3 staged: T-012, T-013, T-014 fixed
- **Where:** two places. (1) `C:\Projects\mcp_excalidraw-merge`, branch `merge/upstream-2.1.2`: the
  merge is committed there as `b8d3f39`; S3's code, tests and docs are **staged** on top
  (`git diff --cached`). (2) The main checkout, `main` at `497e9cd` (T-007 to T-011, committed):
  `docs/TICKETS.md` is **staged** with T-012 to T-014 (filed and closed) and dated notes on T-001
  and T-010. Nothing is pushed. The branch does not contain `497e9cd` and does not touch the
  ledger, so the two merge cleanly. The canvas on `:3000` (pid 39264, 69 elements) was not touched.
- **Done:** the echo guard knows `strokeColor` and `fontFamily` (T-012); an unsized text element
  takes the page's measured box on a passive sync, with no record; export writes a label's own
  font, size and colour, and 5 for an unset font (T-013); a sync that would empty a non-empty
  canvas is refused with 409 unless it carries `allowEmpty: true` (T-014). Detail: DEVLOG
  2026-10-07 (b).
- **Verified:** `npm test` 66 / 66 plus wire, bind, render, state; frontend type-check and build;
  Playwright 19 / 19 with the system Chrome; `tests/expected/` untouched; `cpc-ticket check` OK
  (14 tickets, 11 open).
- **Not verified:** one human drag = one human record (needs a person). T-010's label re-wrap is
  seen on the merged build and not fixed: an imported scene still collects records by human on
  the first click in a tab.
- **Next:** (1) Lucas commits S3 in the worktree and `docs/TICKETS.md` on `main` (commit the
  ledger before merging: `git merge` refuses a dirty index). (2) `main` takes the branch; with
  **no canvas running**, `npm ci && npm run build && npm link` in the main checkout; push;
  dispatch CI by hand (KI-8); `git worktree remove ../mcp_excalidraw-merge`. (3) T-010 (compare
  `originalText`, not the wrapped `text`), then T-001 with no tab, then PR 4.
- **Picks up:** any session with a terminal; (2) needs the owner to stop the canvas first.

## 2026-10-07 — Claude Code — upstream 2.1.2 merged on a branch (SPEC-002); staged in a worktree, not committed
- **Where:** `C:\Projects\mcp_excalidraw-merge`, branch `merge/upstream-2.1.2`, a `git worktree` of this
  repo — the merge is **in progress and staged** there (`git diff --cached`). The main checkout is
  untouched at `cf3617d` (SPEC-002, committed on Lucas's instruction, not pushed) with his
  uncommitted `docs/TICKETS.md` (T-006, T-007). The canvas on `:3000` was running someone's drawing
  from the main checkout's `dist/` throughout and was never touched.
- **Done:** 25 upstream commits (`96d9c21`) merged, 15 conflicts resolved; our three MCP tools ported
  into the split files; one silent-merge defect fixed (a `replace` now records its deletes);
  `repairOrderKeys` so scenes exported before 2.1.1 import and render; 13 new tests. Version 1.3.0,
  Node ≥ 20. Detail, per file: DEVLOG 2026-10-07.
- **Verified:** `type-check` ×2, `npm run build`, `npm test` (56 / 56 `node:test`, MCP wire 6 / 6,
  bind, render, state), `tests/expected/` untouched, upstream's Playwright suite 19 / 19 with the
  system Chrome, the legacy dashboard loading in the merged page with the server left at 98.
  `integrity_check --strict` green. **`docs_check --strict` fails on one warning that is not this
  branch's:** `docs/TICKETS.md` was committed 2026-09-26 with `updated: 2026-09-22` (rule 12) — the
  uncommitted edit in the main checkout carries the fix, so CI's docs job is red until that lands.
- **Not verified:** one human drag = one human record (SPEC-002 case 6, second half) — needs a
  person. Two early runs of the new server test did not reach the server right after a build;
  not reproduced in six later runs.
- **Next:** (1) Lucas commits `docs/TICKETS.md` on `main`, then reviews the staged merge in the
  worktree and commits it (`git commit` there completes the merge). (2) `main` ← the branch
  (fast-forward), then `npm ci && npm run build && npm link` in the main checkout **with no canvas
  running**, push, dispatch CI by hand (KI-8), `git worktree remove ../mcp_excalidraw-merge`.
  (3) File with `cpc-ticket`: bound-label typography on export; the sync deleting what a payload
  omits (KI-7); `EDITOR_DEFAULTS` lacking `strokeColor` / `fontFamily`. Add T-001's re-test line
  (unchanged by the merge). (4) Those three, then T-001, then PR 4.
- **Picks up:** any session with a terminal; (2) needs the owner to stop the canvas first.

## 2026-09-07 (e) — Claude Code — (d) committed and pushed; CI green on `2948946` by dispatch
- **Corrects (d):** its staged set is committed as `2948946` and pushed. Run 34124916242
  (`workflow_dispatch`): six jobs green, the Node 18–24 matrix included. The push itself made no
  run — the fourth on this fork today; KI-8's symptom line now says four.
- **Uncommitted, staged:** the KI-8 count, this entry, and the rotation (rule 11b).
- **Next:** as (d), minus its (1). T-001's repro pair first — a sizeless heading read with no tab,
  then with a tab after one sync — then the diagnostic at `src/core/wireframe.ts:752` and a 400 at
  `src/server.ts:426`. Then the upstream merge (DEVLOG 2026-09-07 (c)); KI-8's owner step; KI-3;
  PR 4.
- **Picks up:** any session; the repro's second half needs a browser tab.

## 2026-09-07 (d) — Claude Code — the next two steps made explicit: T-001 triaged, the order in the canon
- **Corrects (c):** its "Uncommitted, staged" line is history — Lucas committed (c) as `ac0cede`.
  The stale CONTEXT.md phase paragraph it listed under "Not done" is now rewritten.
- **Done:** `.claude/CONTEXT.md` "Current phase" and `AGENTS.md` "State" rewritten to today's facts
  with the agreed order (T-001, then the upstream merge as its own step, then PR 4);
  `docs/ROADMAP.md` carries the same order under the PR table and a "Pending since 2026-09-07"
  paragraph under § Upstream; **T-001 triaged** in `docs/TICKETS.md` with the trace — the API takes
  a sizeless text element (`src/server.ts:426`), the reading drops an empty box silently
  (`src/core/wireframe.ts:545`), and an open tab's measurement comes back through sync as a
  **human** "resized" record, a second defect. No code changed.
- **Verified:** `docs_check --strict`, `integrity_check --strict`, `cpc-ticket check` green.
- **Uncommitted, staged:** the four docs, this entry, and the rotation (rule 11b).
- **Next:** (1) Lucas commits and pushes; dispatch CI after the push (KI-8). (2) T-001: first the
  repro pair — a sizeless text heading read with no tab, then with a tab after one sync — to
  confirm the trace; then the diagnostic at `src/core/wireframe.ts:752` and a 400 at
  `src/server.ts:426`, with server-side measurement as the real fix (the ticket's Triage line).
  (3) The upstream merge, plan in DEVLOG 2026-09-07 (c). (4) KI-8's owner step; KI-3; PR 4.
- **Picks up:** any session; (2) needs a terminal and, for the repro's second half, a browser tab.

## 2026-09-07 (c) — Claude Code — upstream is four commits ahead (2.0.0); merge deferred past T-001
- **Done:** state read (clean at `70a3329`, level with `origin/main`); upstream fetched — four
  commits, `0db05c4`..`ff42de9`, the 2.0.0 release: MCP SDK v2, `src/index.ts` split into four
  core files, Node floor 20. Dry-run merge: eight conflicting files, `src/index.ts` whole-file.
  **Decision (Lucas): defer the merge until T-001 is answered, then take it as its own reviewed
  step.** Recorded with the port plan and its trap: DEVLOG 2026-09-07 (c).
- **Verified at HEAD:** type-check clean; `docs_check --strict` and `integrity_check --strict` 0/0;
  corpus and bind covered by the 2026-09-07 dispatch (the two commits since were docs-only).
- **Not done:** no code change. `.claude/CONTEXT.md:13` still says the upstream merge is deferred —
  that was August's, which landed the same day. KI-1/KI-2 still sit as full entries over an empty
  Resolved index (the 2026-08-07 review request, item 2).
- **Committed and pushed by Lucas:** `65b6452`, the DEVLOG entry. Its push made no run either —
  the third: three pushes, zero runs; a dispatch on `899c365` at 09:34Z ran green (KI-8 holds).
- **Uncommitted, staged:** this entry, and the rotation the session-close gate asked for (rule 11b,
  11 entries > 10): the 2026-08-01 entry moved verbatim to `docs/archive/SESSION-archive-001.md`.
- **Next:** (1) Lucas commits. (2) KI-8: Lucas, logged in, opens the fork's Actions tab — an
  enable banner, or none; until the trigger fires, `gh workflow run ci.yml --ref main` after each
  push. (3) T-001: a standalone text element passes `src/core/normalize.ts:52` unmeasured and
  `src/server.ts:426` stores it with a null bbox; the ticket's fix order is measure server-side,
  else reject at the API, at minimum name the cause at `src/core/wireframe.ts:752`. (4) Then the
  upstream merge, as its own reviewed step — plan and trap in DEVLOG 2026-09-07 (c). (5)
  Pre-existing: KI-3, PR 4 (ADR-002), `share` untested since the August merge.
- **Picks up:** any session; (2) needs the owner's browser; (4) needs a terminal and, for the MCP
  round-trip, a client with the MCP server configured.

## 2026-09-07 (b) — Claude Code — the push trigger is dead on this fork; dispatch after each push
- **Done:** the second push (`899c365`, 08:46Z) made no run either; the morning's enable-after-push
  cause is retracted; logged as a known issue. Detail: DEVLOG 2026-09-07 (b).
- **Uncommitted, staged:** DEVLOG, KNOWN_ISSUES, this entry.
- **Next:** (1) Lucas, logged in, opens the fork's Actions tab: an enable banner, or none. (2) Until
  the trigger fires, `gh workflow run ci.yml --ref main` after each push. (3) T-001 first — the
  silent text-size drop. (4) KI-3, PR 4, `share` untested since the upstream merge.
- **Picks up:** any session; step (1) needs the owner's browser.

## 2026-09-07 — Claude Code — CI proven by a dispatch; the push trigger waits for the next push
- **Done:** run 34097250095 (`workflow_dispatch` on `main`) — all six jobs green, the compat
  matrix included. The push of `49afba0` made no run. Detail: DEVLOG 2026-09-07.
- **Uncommitted, staged:** DEVLOG, this entry.
- **Next:** (1) Lucas commits; on the next push, check that a run appears by itself. (2) T-001
  first — the silent text-size drop. (3) KI-3, PR 4, `share` untested since the upstream merge.
- **Picks up:** any session.

## 2026-09-06 — Claude Code — CI is two jobs per push; the Node range waits for a tag
- **Done:** `ci.yml` rewritten (6 jobs per push → 2, plus a keypoint matrix), NORTH_STAR date
  bumped, strict docs gate green, the exact CI commands run green locally (corpus 43/43). Detail:
  DEVLOG 2026-09-06.
- **Uncommitted, staged:** `ci.yml`, `.claude/NORTH_STAR.md`, DEVLOG, this entry — on top of the
  still-uncommitted (b) entries.
- **Next:** (1) Lucas commits and pushes; **read the run**. (2) `workflow_dispatch` the `compat` job
  once before the next `v*` tag. (3) T-001 first — the silent text-size drop. (4) KI-3, PR 4,
  `share` untested since the upstream merge.
- **Picks up:** any session.

## 2026-09-05 (b) — Claude Code — `npm link` done; the CLI answers from PATH
- **Corrects the entry below's "Not on this machine":** `npm link` ran from this repo;
  `excalidraw-canvas status` resolves via the npm global prefix and reports the canvas not running,
  which is the expected idle answer. Nothing in the tree changed — the link lives in npm's global
  prefix, not in git. The MCP server is still not configured in Claude Code; the CLI is the
  skill's documented default when no MCP tools are present.
- **Committed and pushed by Lucas:** `bed553e`. Its subject reads *Lay the ticket ledger; file the
  2026-08-21 feedback as T-001–T-005" -- docs/TICKETS.md …* — the suggested command's closing quote
  and pathspec were swallowed under PowerShell, so nothing limited the commit and the **older staged
  cpc 1.5.0 → 1.8.0 re-vendor (29 files) rode in** beside this session's five (34 files, +975/−23).
  Already on `origin/main`. DEVLOG 2026-09-05 (b) explains the commit so history need not be
  rewritten. **Decided by Lucas the same day: `bed553e` stays as is.** No amend, no force-push.
- **Uncommitted:** this entry and that DEVLOG entry, staged.
- **Next:** as below, minus items (1) and (3).
- **Picks up:** any session.

## 2026-09-05 — Claude Code — the ledger is laid; five tickets open; the tree still carries an older staged re-vendor
- **Done:** `docs/TICKETS.md` with T-001–T-005 from the 2026-08-21 feedback note; `AGENTS.md`
  Reference line; a pointer atop the note. Detail: DEVLOG 2026-09-05. Staged, not committed (rule 1).
- **Found in the index, not this session's:** a **staged re-vendor of cpc 1.5.0 → 1.8.0** (29 files
  under `tools/conventions/cpc/`, +755/−22) plus `b6eaa3f fix(justfile)` already committed. Nobody
  wrote it up; review it separately from this session's three files before committing either.
- **Not on this machine:** `excalidraw-canvas` is not on PATH (`npm link` never ran here) and no
  excalidraw MCP server is configured in Claude Code; `dist/bin.js` (2026-08-07) exists, so
  `node dist/bin.js` works. The `wireframe-first` skill in `claude-skills` (v0.56.0) finds the toolkit
  by that ladder and files wrong readings here.
- **Next, in order:** (1) Lucas reviews the three files and the re-vendor, and commits. (2) Answer
  T-001 first — the documented screen-heading path silently does nothing. (3) `npm link`.
  (4) Pre-existing: KI-3's attribution measurement, PR 4's geometry lint (ADR-002), `share` untested
  since the upstream merge.
- **Picks up:** any session.

## 2026-08-07 (close 3) — Claude Code — Lucas + agent
- **Done: the upstream merge** (`1c5925b`), the first since the fork, at 14 commits of divergence —
  clean, no conflicts. **Rule 2's open deferral is now closed.**
- **It was not hygiene — it fixed a live bug.** Reproduced *before* merging: our schema lacked
  `containerId`, and zod strips unknown keys, so `import` turned 10 bound text children into **0**.
  Every label detached, and the reading changed silently — `input? "Project name"` became `card?`,
  23 components/5 inferred became 33/7, with `--score` reporting `fallbacks: 0` throughout.
  `snapshot restore` had the same defect. Both documented recovery paths were corrupting drawings.
  After the merge the same file round-trips **35/10 in → 35/10 out** and the reading is identical to
  the original.
- **Unlocked:** `.passthrough()` means `customData` is finally possible — what **KI-5** and Phase 3
  were waiting on. Needs an ADR (moving `role` into `customData` changes the element contract).
- **Not tested: `share`.** It publishes the scene to excalidraw.com, and `share-url.ts` is the file
  upstream rewrote most heavily — so it is both the most-changed path and the one needing a
  deliberate choice to upload. Smoke-test before relying on it.
- **Uncommitted:** the doc updates for this merge are **staged, not committed** — rule 1. The merge
  commit itself is in (`1c5925b`); `main` is **ahead of `origin/main` by 3, unpushed**.
- **Also fixed at close:** `AGENTS.md`'s State line still read 2026-07-31 and claimed the markup leg
  "has never been exercised by a human" — wrong for a week, in the first file every agent reads.
  Nothing enforces that line; it is judgment, so it goes stale silently.
- **Next:** **PR 1 is still the open item** — three attempts on 2026-08-07, never measured. Then
  PR 4 to ADR-002 (calibrate tolerances against the corpus first), and a `customData` ADR.
- **Picks up:** any agent with a terminal; PR 1 needs Lucas at a browser tab — **exactly one tab**.

### Requested for next session: a documentation review (Lucas, 2026-08-07)

Concrete targets, strongest first — the docs grew a lot in one day (3 DEVLOG entries, 3 KIs, an ADR,
3 baton entries) and none of it has been read back critically.

1. **Rotation is switched off and nothing will ever say so.** `devlog_max_entries` and
   `session_max_entries` are both `0` (= disabled) in the cpc defaults, so `docs_check` stays silent
   while the files grow: `docs/DEVLOG.md` is at **8 entries / 223 lines**, `.claude/SESSION.md` at
   **7 / 163**, and `AGENTS.md` tells agents to read only the **newest 3** of each. Either set the
   caps and rotate to `docs/archive/` as ADR-023 describes, or decide unbounded growth is fine and
   say so — right now it is neither, just unexamined.
2. **`.claude/KNOWN_ISSUES.md` (7 entries).** KI-1 is "done for our own docs" and KI-2 is
   explicitly "descoped", yet both still sit as full entries while the Resolved index at the bottom
   holds nothing but its commented-out template line. The file documents its own process for this
   and it has never been used.
3. **Entry length.** Today's DEVLOG entries are long. They are append-only so this is not about
   editing them — it is about agreeing the right level for the next ones.
4. **`docs/ROADMAP.md`** gained a PR 4 section and rewritten measures 3 and 4; worth one read for
   coherence rather than accretion.
5. **ADR-002's two ⚠ Confidence items** are the gate on PR 4 starting — every numeric tolerance is
   currently a guess, and the error/advisory split is asserted rather than demonstrated.

## 2026-08-07 (close 2) — Claude Code — Lucas + agent
- **Correction:** the entry below says PR 1 needs "one sitting". Two further attempts were made the
  same day and **both failed**, for new reasons each time. PR 1's number is *still* untaken.
- **Attempt 2** died on **KI-7**: two browser tabs open at once, each POSTing its whole scene, deleted
  each other's elements — 386 adds against 385 deletes — and silently destroyed a complete round of
  human markup (a note, an ellipse, four scribbles). Unrecoverable; change records carry no geometry.
  Caused by my own instructions ("open the canvas", then later "open or reload"). Guarded now:
  `changes`/`watch` warn on stderr and in-band when `websocket_clients > 1`, in `watch` *before* the
  wait. The protocol fix is still open (KI-7).
- **Attempt 3** never got drawn — the tab was closed and the canvas went quiet.
- **Also fixed: a regression I introduced this morning.** Suppressing the browser echo meant the
  first sync produced no delta, which skips the branch that drops a shape's `label` once Excalidraw
  has expanded it into a bound text child. Every client load then re-expanded it: 10 shapes × 4 tab
  loads = 40 stray text elements. `boundChildSupersedesLabel` now applies on the no-delta path.
  Verified across two reloads: 0 duplicates, 0 stale labels, rev unchanged at 25.
- **Uncommitted:** the guard, the label fix, KI-7, this baton and the DEVLOG entry are **staged for
  review, not committed** — rule 1. (Commit `3c60710`, the morning's echo fix, is already in and is
  what the label regression came from.)
- **Rule 2 — read this before touching the collision zone.** This work **edited `src/server.ts`**.
  Upstream's two commits were re-checked (still no conflicts) and the merge was **deliberately
  deferred**, so a bug fix and a five-file upstream merge would not be reviewed together. That
  deferral is the decision rule 2 requires. The merge is still owed and Lucas asked for it explicitly.
- **Next, in order:** (1) the upstream merge, as its own reviewed step; (2) **PR 1** — one sitting
  with a person, everything blocking it is now fixed; (3) PR 4 to ADR-002, calibrating tolerances
  against the corpus first.
- **Picks up:** any agent with a terminal; PR 1 needs Lucas at a browser tab — **exactly one tab**.

## 2026-08-07 (close) — Claude Code — Lucas + agent
- **Correction to the entry below:** it says the fix was staged and uncommitted. Lucas reviewed and
  committed it as `3c60710` (9 files). `main` is **ahead of `origin/main` by 1 and unpushed**.
- **Also done since:** `docs/decisions/ADR-002-geometry-lint.md` written and **accepted** — PR 4's
  shape is settled (a `--lint` flag on `wireframe`, findings also in `--json`, two severities,
  reporting only). ADRs are immutable once accepted: supersede with a new one, never edit.
- **Next is unchanged in priority:** **PR 1's attribution number is still untaken** — the loop works,
  nobody has drawn an annotation through it. Then build PR 4 to ADR-002, and **calibrate the
  tolerances against the corpus first** (both ⚠ items in the ADR's Confidence block) rather than
  shipping guessed numbers.
- **Picks up:** any agent with a terminal; PR 1 additionally needs Lucas at a browser tab.

## 2026-08-07 — Claude Code — Lucas + agent
- **Done:** ran **PR 1**, the human markup round, for the first time (KI-3 — skipped four times
  before this). It broke before a single annotation was drawn, and the defect was the important
  kind: **opening the canvas in a browser restamped all 25 agent-drawn elements as `human`**, because
  Excalidraw echoes the whole scene back with unset style properties default-filled and text boxes
  re-measured, and the server stamps browser writes `human`. That collapsed
  `trustOrigin` (`src/core/wireframe.ts:531`) and **silently switched markup detection off for
  everything except freedraw** — the review loop's headline feature could not work in its own
  documented workflow. Fixed in `src/core/changes.ts` (`EDITOR_DEFAULTS` + `fieldsEqual`; text
  width/height dropped from the canonical projection), 8 new assertions in
  `tests/frontend-echo.test.mjs`. Also documented `watch`'s undocumented 240s ceiling in SKILL.md +
  cheatsheet and re-ran `npm run sync:skills`.
- **Proved it works:** stash the fix and 3 of the 8 new tests fail — and it is the right 3 (the echo
  guards; the five "real edits still report" assertions pass either way). Live end-to-end: *before*,
  opening the tab produced 25 phantom `human` records and `trustOrigin: false`; *after*, the same
  action produced `No changes`, `origins: {"agent":25}`, `trustOrigin: true`. 36/36 tests,
  `type-check` clean, no golden moved.
- **Found, not fixed:** **KI-5** — copy-pasting a component in the editor destroys its declared
  `role` (`button "General"` → `button? "General"`); real evidence for `customData` and the Phase 3
  library. **KI-6** — `changes` attributed a 1160x1180 screen frame as `annotates` a 540x48 input;
  `looksLikeAnnotation` has no size ceiling. Also: a copied footer landing **4.29px** outside its
  frame silently became a phantom third screen — the cause behind an "unnamed screen" warning, and
  the motivating case for PR 4.
- **Also:** a wireframe reading caught a mis-drawn flow arrow the screenshot hid — it looked like it
  landed on Billing, `endBinding` said Members, and Lucas confirmed Billing was intended. The
  round-trip thesis doing exactly what it claims.
- **Uncommitted:** everything above is staged for review, not committed — rule 1.
- **Next:** **PR 1 is still open** — the attribution accuracy number is *still* untaken, because the
  session pivoted to feature design once the loop was fixed. It is now genuinely unblocked and needs
  about one sitting. Then **PR 4**, the geometry lint (agreed this session: core first with a JSON
  contract, browser panel as a thin view over it) — **write the ADR before building**.
- **Picks up:** any agent, with a terminal. PR 1 needs **Lucas at a browser tab** on the canvas URL.
  `excalidraw-canvas` is still not on PATH — use `node dist/bin.js <cmd>`.
- **Watch out:** **rule 2 is live** — upstream moved for the first time since the fork (`2930519`
  export fidelity, `ecf3cac` `.passthrough()`), both touching `src/server.ts`, `merge-tree` says no
  conflicts, **decision deferred**. Decide before editing `src/server.ts` / `src/index.ts` /
  `src/core/normalize.ts`. It matters beyond hygiene: `.passthrough()` is the mechanism `customData`
  needs, which is what KI-5 and Phase 3 both want. Also: the canvas holds its scene **in memory** —
  restarting the server loses the drawing, so `export` before any restart. And `npm run sync:skills`
  warns that `.claude/skills/` is not a symlink; it simply does not exist (no stale copy), pre-dating
  this session.

## 2026-08-01 — Claude Code — Lucas + agent
- **Done:** `docs/ROADMAP.md` **PR 2** — the repo's first test harness. Five `.excalidraw` fixtures
  drawn through the real CLI (`dashboard`, `two-screen-flow`, `list-detail`, `annotated`,
  `undeclared-content`), each with a hand-authored expectation and a golden reading; 28 assertions
  on `node:test`; `scoreWireframe()` exported from `src/core/wireframe.ts`; `npm test` wired and a
  CI `test` job added (CI previously ran no tests at all). ADR-001 + SPEC-001 written. Backfilled
  the two missing DEVLOG entries — the file was still the unedited template.
- **Proved it works:** moving `HEADING_MIN_FONT_SIZE` 20 → 24 fails all five golden readings.
  Reverted. A suite that has never failed is not evidence of anything.
- **Found:** markup attribution is 4/5 — a note level with a card binds to the input above it
  (now **KI-4**). Recorded rather than tuned: fitting attribution to one agent-drawn sample of 5
  would be fitting to noise.
- **Also done: PR 3** — `wireframe --score` (pre-flight counts as JSON), `score` added to
  `--json`, and a `### Reading quality` block in the plain reading that fires only when something
  is actually wrong. Put in the report as well as behind the flag because `describe_wireframe` (MCP)
  takes no arguments, and an agent is the main consumer. Skill + cheatsheet + conventions §9
  updated and `npm run sync:skills` run.
- **Uncommitted:** everything above is staged for review, not committed — rule 1.
- **Next:** **PR 1** — the human markup round, the only Phase 1 item left and still the one leg
  never exercised (KI-3, skipped a fourth time today for lack of 20 free minutes). After that,
  Phase 2 (`link`, frames, `groupIds`, z-order, `customData`) is the next real body of work.
- **Picks up:** any agent, with a terminal. PR 1 also needs **Lucas at a browser tab** on the canvas
  URL. `excalidraw-canvas` is still not on PATH — use `node dist/bin.js <cmd>` (what this session
  did) or `npm link` first.
- **Watch out:** don't regenerate `tests/expected/*.json` — only the `.txt` goldens are generated
  (`npm run corpus:update`). `undeclared-content` scores 3 fallbacks *on purpose*. And do not use
  PowerShell `Set-Content` on `src/core/*.ts` — it re-encodes the UTF-8 box-drawing comment rules
  into mojibake; this session did that and had to `git checkout` the file.

## 2026-07-31 (close) — Claude Code — Lucas + agent
- **Correction:** the entry below says the cpc adoption was staged and uncommitted. Lucas reviewed
  and committed it. Working tree is clean and `main` is level with `origin/main`.
- **Next is unchanged:** `docs/ROADMAP.md` PR 1, the two-way markup round with a human (also KI-3).
- **Picks up:** any agent, with a terminal and a browser tab on the canvas URL. `npm link` first —
  `excalidraw-canvas` is still not on PATH here.

## 2026-07-31 — Claude Code — Lucas + agent
- **Done:** adopted the cpc standard (`cpc-init --profile standard`) and filled `AGENTS.md`,
  `.claude/CONTEXT.md`, `docs/ROADMAP.md`, `.claude/KNOWN_ISSUES.md`. Cut the 8 branches inherited
  from upstream off `origin` — each verified byte-identical to its `upstream/` counterpart first, so
  nothing became unrecoverable — and deleted the merged local `fix/wireframe-role-inference`. Only
  `main` remains.
- **Committed earlier the same day:** the fork audit (`FORK.md`, rename to
  `@ldele/mcp-excalidraw-server`, `private: true`, v1.2.0, Docker and npm-publish removal) and the
  wireframe drawing conventions (`skills/excalidraw-skill/references/wireframe-conventions.md`).
- **Uncommitted:** everything `cpc-init` laid, plus the filled docs. Staged for review, not
  committed — rule 1.
- **Next:** `docs/ROADMAP.md` PR 1 — run the two-way markup round with a human end to end. It is
  the one leg of the review loop never exercised; the markup round was skipped three times on
  2026-07-31. Then PR 2 (fixture corpus), which is what makes role-inference changes safe to touch.
- **Picks up:** any agent. Needs a terminal, and a **browser tab open on the canvas URL** for the
  markup round — screenshots, exports and Mermaid exit with code 4 without one.
- **Watch out:** `excalidraw-canvas` is not on PATH on this machine; `npm link` from the repo or the
  skill's commands will not resolve. Never `npx mcp-excalidraw-server` — that is upstream's package
  and carries none of this fork's features (`FORK.md`).
