<!-- status: active · updated: 2026-07-31 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

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
