<!-- status: active · updated: 2026-07-31 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

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
