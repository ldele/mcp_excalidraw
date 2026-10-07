<!-- status: active · updated: 2026-07-31 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

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

