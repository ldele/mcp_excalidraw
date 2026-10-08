<!-- status: active · updated: 2026-07-31 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

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
