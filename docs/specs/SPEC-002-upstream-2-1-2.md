<!-- status: active · updated: 2026-10-08 · class: living -->

# SPEC-002 — take upstream 2.1.2

> The executor brief (ADR-019). Target executor: **an agent session in this repo with a terminal**;
> the last two test cases need a browser. The *why* is `docs/ROADMAP.md` § Upstream and
> `.claude/CONTEXT.md` rule 2 — read both first. This is the *how*. It extends the merge plan for
> the first four commits (`docs/DEVLOG.md` 2026-09-07 (c)), which still holds for `src/index.ts`.
> Planned from UI-Wizard on 2026-10-07 (`C:\Projects\UI-Wizard\plans\SIDE-ISSUES.md`, session S2);
> no code in this repo was changed while planning.
>
> **Refreshed 2026-10-08: executed, and not on `main` yet.** The merge is committed as `b8d3f39` on
> `merge/upstream-2.1.2`, in the worktree `C:\Projects\mcp_excalidraw-merge`. A second pass (S3:
> T-012, T-013, T-014) is staged on top of it there, uncommitted. `main` is at `497e9cd`. What
> each step and test case came to is marked below; **§ What is left** is the owner's part. The
> detail is that branch's `docs/DEVLOG.md`, entries 2026-10-07 and 2026-10-07 (b).

## Goal

Bring the fork level with `upstream/main` at `96d9c21` (2.1.2, 2026-10-05) without changing what
`wireframe` reads. Upstream fixes three defects that stopped work in UI-Wizard on 2026-09-24 and
removes the browser-tab requirement for rendering; none of that is worth a reading that drifts.

**Measured 2026-10-07** (`git fetch upstream`, merge base `ecf3cac`, 2026-08-04): fork 29 ahead,
25 behind; fork 1.2.0, upstream 2.1.2. `git merge-tree --write-tree main upstream/main` conflicts
in 15 files:

| File | Conflict | Note |
|---|---|---|
| `src/index.ts` | whole file | upstream cut it into `core/mcp-server.ts`, `mcp-tools.ts`, `mcp-dispatch.ts`, `canvas-state.ts` (2.0.0) |
| `src/server.ts` | 4 hunks (1–9 lines each) | imports, the sync handler's body parsing, the health payload — the rest auto-merges, which is the risk |
| `frontend/src/App.tsx` | 2 hunks | ours is 5 lines (`rev`, `origin` stripped before render); upstream's is +318 |
| `src/cli/run.ts` | 2 hunks | both sides added commands |
| `src/core/canvas-client.ts` | 1 hunk | both sides added calls |
| `package.json`, `package-lock.json` | 2 hunks + the lock | name / `private` / bin are ours; deps, scripts, `engines` are theirs |
| `.github/workflows/ci.yml` | 3 hunks | ours is a rewrite |
| `README.md`, `skills/…/cheatsheet.md`, `.gitignore` | 5, 3, 1 hunks | prose and lists |
| `Dockerfile`, `Dockerfile.canvas`, `docker.yml`, `npm-publish.yml` | modify / delete | we deleted them on purpose (`FORK.md`) |

What upstream's code does about the four defects, read from `upstream/main` (not from commit titles):

| Defect seen 2026-09-24 | Upstream | After this merge |
|---|---|---|
| Exported `index` keys `a0 … a10 …` are invalid (trailing 0) and mis-sorted; the canvas page throws `invalid order key` and loads nothing | `orderKey(i)` over the final array order (`src/core/expand-elements.ts:39-44, 313`, #117) | fixed for new exports; **old files still carry bad keys** — test case 3 decides whether import must repair them |
| A page that failed to load auto-syncs its empty scene and the server deletes everything | `canSyncScene()` gates sync, export and Mermaid import (`frontend/src/App.tsx:171, 727, 822`, #110) | page side fixed; the server's absent-means-deleted rule is **ours** (`src/server.ts`, the sync reconciliation) — **closed since as T-014** (S3, staged): a sync that would empty a non-empty canvas is refused with 409 unless it carries `allowEmpty: true`. SPEC-003 is now a different subject |
| Free text loads centred on its left edge; fixed widths replaced | scenes load through `restoreElements()`, fonts preloaded first (`App.tsx:196, 223, 290`, #123, #124) | fixed |
| `screenshot` needs an open browser tab | headless render inside the server (`src/core/render/`, `src/cli/commands/render.ts`, #114, #127) | fixed |
| Bound labels export as `fontFamily: 1` at 16 px | unchanged (`expand-elements.ts:157, 263`) — and caused partly by our `normalize.ts` | not fixed by the merge — **closed since as T-013** (S3, staged): export reads the label's own font, size and colour |

## Hard constraints

- **`AGENTS.md` rule 1 — stage, never commit.** Work on a branch (`merge/upstream-2.1.2`); stage and
  hand off. Commit, merge to `main` and push only on the owner's per-commit instruction.
- **`.claude/CONTEXT.md` rule 2 / § familiarity — the merge is the owner's call.** Open question 1
  must be closed by the owner before step 2.
- **`.claude/CONTEXT.md` rule 4 — the round-trip closes.** The corpus is the acceptance test:
  `tests/expected/` must not change. A fixture that would have to be regenerated is a finding to
  report, not a step to take.
- **`.claude/CONTEXT.md` rule 3 — edit `skills/`, never `.agents/`**, then `npm run sync:skills`.
- **`FORK.md` § What we removed.** The two Dockerfiles, `docker.yml` and `npm-publish.yml` stay
  deleted. The package stays `@ldele/mcp-excalidraw-server`, `"private": true`, binary
  `excalidraw-canvas`.
- **CONVENTIONS §16 (test weight).** Upstream's tests come with it; add no test dependency of our
  own. Whether its Playwright suite runs in our CI is open question 4.
- **The trap from 2026-09-07 (c).** Upstream's `mcp-dispatch.ts` calls
  `prepareElementUpdate(id, updates, existing?.type)`; ours takes the whole element so a restyle
  merges into the existing label. Pass `existing ?? undefined`; do not revert the signature.
- **KI-8.** A push to this fork starts no workflow run. Dispatch CI by hand and read the run.
- **`docs/TICKETS.md`: do not hand-edit the ledger — `cpc-ticket --root .` opens and closes.**
  When this was written it had uncommitted entries (T-006, T-007). Those are committed and pushed
  (`497e9cd`, with T-008 to T-011). As of 2026-10-08 the main checkout has T-012 to T-014 and two
  notes **staged** in it, and the branch does not touch the file.

## Open questions

- **familiarity:** fork / upstream merge policy — **high** (the owner decides; rows 1, 3, 4, 5 are
  theirs to close). MCP SDK v2 port — **medium**.

| # | Question | Status | Resolution + reason | Reopens if |
|---|----------|--------|--------------------|------------|
| 1 | The order agreed 2026-09-07 is T-001, then the merge. Merge first instead? | resolved | **Merge first** (owner, 2026-10-07). The deferral rested on "nothing in it fixes anything live" (DEVLOG 2026-09-07 (c)); that is no longer true, and #107 changes how zero-size text is expanded — T-001's own area — so fixing T-001 first risks fixing it twice. | T-001 turns out to block the merge's own tests |
| 2 | One merge of 25 commits, or two (2.0.0, then 2.1.x)? | resolved | **One, on a branch, with a timeboxed spike first** (work item 2). The 2.0.0 conflict map already exists, and a half-merged tree has no tests to stand on. | the spike ends with a tree that does not compile — then split at `ff42de9` |
| 3 | Accept upstream's new runtime dependencies — `jsdom`, `@resvg/resvg-js` (a native binary), `wawoff2`, and `esbuild` at build time? | resolved | **Yes** (owner, 2026-10-07). They are the headless renderer; without them rendering still needs a browser tab, which is the fragile path. | the native binary fails to install on the owner's Windows + Node 24 |
| 4 | Run upstream's Playwright suite (`test:canvas`) in our CI? | resolved | **Keep the script, run it locally before a merge, leave it out of CI** (owner, 2026-10-07) until a run shows it is stable here — CI stays the type-check, build and the node tests. | a regression reaches `main` that only the canvas suite would have caught |
| 5 | Which version does the fork carry — its own line (1.2.0 → 1.3.0), or upstream's (2.1.2)? | resolved | **Our own line, with the upstream base recorded in `FORK.md`** (owner, 2026-10-07) ("based on upstream 2.1.2 at `96d9c21`"). The package is private and renamed; sharing upstream's number claims an equivalence that does not hold. | the fork is ever published |
| 6 | Node floor moves to 20 (the SDK's `engines`). | resolved | **Accept.** The owner's machine runs 24.15; CI drops 18 from its matrix. Six places name the floor (2026-09-07 (c)). | — |

## Execution checklist

1. ✅ Write the test cases below — the new ones fail or do not exist yet on `main`; record which.
2. ~~Owner closes open questions 1, 3, 4, 5~~ — closed 2026-10-07. The pending `docs/TICKETS.md`
   entries (T-006, T-007) are still the owner's to commit; upstream does not touch that file, so
   they ride along uncommitted and must not be staged with the merge.
3. ✅ Cut `merge/upstream-2.1.2` from `main` **in a separate worktree** (`git worktree add`), then
   `git merge upstream/main --no-commit` there. The canvas server the owner is drawing on runs from
   the main checkout's `dist/`; a build in place would swap its frontend under an open tab. Run the
   branch's own server on another port for the tests.
4. ✅ **Spike, one hour, timeboxed:** resolve `src/index.ts` and `src/server.ts` only; run
   `npm run type-check` and `npm run test:corpus`. Success is that both *run*. If the hour ends with
   a tree that does not compile, stop, write down why in `## gaps`, and reopen question 2.
5. ✅ Resolve the rest in the order of the work items. Item 9 was needed (`repairOrderKeys`).
6. ✅ Run every test case — all but the second half of case 6, which needs a person (§ Verified).
7. ⏳ `npm run build && npm link`; run the cross-repo check (test case 7) from UI-Wizard. Built and
   tested in the worktree on private ports. The build and `npm link` in the **main checkout** wait
   for the merge to `main` and for the canvas on `:3000` to be stopped.
8. ⏳ Update the docs listed at the end; stage; hand off for review — done on the branch. After the
   owner pushes, dispatch CI by hand (KI-8) and put the run id in the baton — not yet.

## Work items

| # | Item | Files | Acceptance |
|---|------|-------|------------|
| 1 | Modify / delete conflicts: keep our deletions | `Dockerfile`, `Dockerfile.canvas`, `.github/workflows/docker.yml`, `.github/workflows/npm-publish.yml` | none of the four exists in the tree |
| 2 | Take upstream's split MCP server; port `describe_wireframe`, `get_canvas_changes`, `wait_for_changes` into the tool table and dispatcher, and the `lastSeenRev` cursor into `canvas-state.ts` (upstream builds one server per connection, so instance-held state resets) | `src/index.ts`, `src/core/mcp-tools.ts`, `src/core/mcp-dispatch.ts`, `src/core/canvas-state.ts` | test case 5; the `prepareElementUpdate` trap handled as the constraint says |
| 3 | Resolve the four `server.ts` hunks, then **read the merged sync handler end to end**: our per-element reconciliation, revisions and origin tracking against upstream's body validation (#110), order keys and geometry (#117), atomic replace (`9c4be39`) and atomic snapshot restore (#120). The hunks are small; what git merged silently is the risk | `src/server.ts` | test cases 1, 4, 6 |
| 4 | Take upstream's `App.tsx`; re-apply our five lines — `rev` and `origin` stripped before rendering — in its element-cleaning function | `frontend/src/App.tsx` | test case 6; the page shows no `rev` / `origin` warning in the console |
| 5 | Keep both sides' commands and client calls (`wireframe`, `changes`, `watch` + `render`) | `src/cli/run.ts`, `src/core/canvas-client.ts`, `src/cli/commands/scene.ts`, `src/cli/util.ts` | `excalidraw-canvas help` lists all of them; `--help` text for `screenshot` names the renderer option |
| 6 | `package.json`: our name, `private`, bin; upstream's dependencies, `engines` and scripts; `test` = our `test:corpus` plus upstream's `test:mcp`, `test:bind`, `test:render`, `test:state`. Regenerate the lock with `npm install`; do not hand-merge it | `package.json`, `package-lock.json` | `npm ci` clean on Node 24; `npm test` runs all five |
| 7 | `ci.yml`: keep our structure; add the new test scripts to `check`; drop 18 from `compat` | `.github/workflows/ci.yml` | a dispatched run is green |
| 8 | Prose and lists: union, our fork banner and `npx` warning stay on top | `README.md`, `skills/excalidraw-skill/SKILL.md`, `skills/excalidraw-skill/references/cheatsheet.md`, `.gitignore` | `npm run sync:skills` leaves `.agents/` equal to `skills/` |
| 9 | If test case 3 fails: repair invalid or mis-ordered `index` values on import (regenerate over array order) so scenes exported before this merge load | `src/core/scene-io.ts` | test case 3 |

## Test cases (write these first — checklist step 1)

| Name | Assertion | Path |
|------|-----------|------|
| 1 · corpus unchanged | `npm run test:corpus` passes and `git diff --quiet main -- tests/expected` exits 0 — no fixture touched by this branch | `tests/**/*.test.mjs` (existing) |
| 2 · export order keys | exporting a scene of ≥ 12 elements with bound labels yields `index` values that are all valid fractional keys, strictly increasing in array order, with each label directly after its container | `tests/export-order.test.mjs` (new, `node:test`) — or upstream's `scripts/check-state-integrity.mjs` if it already asserts this; say which |
| 3 · an old scene still loads | importing a scene whose keys are `a0 … a10 …` (fixture: a copy of `C:\Projects\UI-Wizard\wireframes\dashboard\dashboard.excalidraw` at UI-Wizard `ea39ce7`) then exporting it yields valid keys, and `wireframe --json` on it equals that repo's `dashboard.read.json` | `tests/fixtures/`, `tests/import-legacy-keys.test.mjs` (new) |
| 4 · empty page cannot wipe | with 98 elements on the server and a page whose load is forced to fail, a pointer-down and a zoom produce no `POST /api/elements/sync`; element count stays 98 | upstream's `tests/browser/` if it covers this, else a manual run recorded in the DEVLOG — needs a browser |
| 5 · our MCP tools survive the split | the stdio wire test lists `describe_wireframe`, `get_canvas_changes`, `wait_for_changes`, and a `describe_wireframe` call on a fixture returns the corpus reading | `scripts/check-mcp-stdio.mjs` (extend upstream's) |
| 6 · attribution holds | an agent `add`, then a page load, then `changes`: no record with `origin: human` (T-001's second defect — a measurement coming back through sync as a human "resized"); then one human drag: exactly one human record | manual, recorded in the DEVLOG — needs a browser |
| 7 · headless render | with zero browser clients, `excalidraw-canvas screenshot --out x.png` on the dashboard scene writes a PNG over 50 kB in which a label set to `fontFamily: 2` is not drawn in the hand-drawn face | `scripts/check-render.mjs` (upstream's) plus the manual look |

## Verified

On the branch, 2026-10-07. `npm test` there runs five scripts: the `node:test` suite, MCP wire,
local-bind, render and state.

| Case | Result |
|---|---|
| 1 · corpus unchanged | **Pass.** `node:test` 56 / 56 at the merge (43 before it, 13 new) and 66 / 66 with S3; `tests/expected/` untouched both times |
| 2 · export order keys | **Pass.** `tests/order-keys.test.mjs`; `isValidOrderKey` agrees with `fractional-indexing` on 4 000-odd candidates |
| 3 · an old scene still loads | **Pass, after work item 9.** `render` on the legacy file threw `invalid order key: a80`; `repairOrderKeys` now runs on `import` and `render`. UI-Wizard's dashboard (98 elements) imports to the reading that repo committed and re-exports with valid keys |
| 4 · empty page cannot wipe | **Pass.** Upstream's Playwright suite, 19 / 19 with the system Chrome, covers the forced case; in headless Chrome a click and a zoom leave 98 elements. S3 then closed the server side too (T-014) |
| 5 · our MCP tools survive the split | **Pass.** MCP wire 6 / 6; the three tools answer over stdio |
| 6 · attribution holds | **First half: failed at the merge, fixed in S3 (T-012)** — a tab's first sync reported `strokeColor` and `fontFamily` as edits by human, on `main` as well; 2 human records before, 0 after. **Second half not verified:** one human drag = exactly one human record needs a person |
| 7 · headless render | **Pass** for the render: the dashboard as a 198 kB PNG with no server and no tab. The look at a label's face is not recorded in the DEVLOG |

One defect was found by reading what git merged silently: upstream's atomic `replace` cleared the
store without a change record. It now records each delete first.

## What is left

In this order. Steps 1 to 5 are the owner's (rule 1), from that branch's baton, 2026-10-07 (b).

1. Review and commit S3 in the worktree (`git diff --cached` in `C:\Projects\mcp_excalidraw-merge`).
2. Commit what is staged in the main checkout — `docs/TICKETS.md`, and since 2026-10-08 this file
   and SPEC-003 — **before** merging: `git merge` refuses a dirty index.
3. `main` takes `merge/upstream-2.1.2`.
4. **With no canvas running**, `npm ci && npm run build && npm link` in the main checkout. The
   canvas the baton names (pid 39264, on `:3000`) is gone: `excalidraw-canvas status` said
   `running: false` on 2026-10-08. Check again before building.
5. Push; dispatch CI by hand (KI-8); `git worktree remove ../mcp_excalidraw-merge`. Upstream had
   not moved by 2026-10-08: `git ls-remote upstream` still gives `96d9c21`.
6. **Re-test T-011 on the merged build**, with its own Reproduce line. It was filed against 1.2.0
   after this spec was written and is the "free text loads centred on its left edge" row above,
   which upstream's #123 and #124 are read as fixing. Nobody has run it on the merged code. Close
   it or note it with `cpc-ticket`.
7. Then, by the owner's word of 2026-10-08, **SPEC-003**: whether T-009 is worth sending upstream.
   The baton's own order after the merge is T-010's re-wrap, T-001 with no tab, then PR 4; where
   SPEC-003 sits among those three is not decided.

Tickets filed after this spec, and what the merge did for each: **T-008** (a label in the short
form takes the border colour) not re-tested on the merged build — T-013 changed what *export*
writes for a label that has a colour of its own, and a short-form label has none; **T-009** (waypoints dropped when a bound arrow is created) untouched, the function
is identical upstream — SPEC-003; **T-010** seen again on the merged build and not fixed (DEVLOG
2026-10-07 (b)); **T-011** see step 6.

## Estimate

- **estimate:** L / 6–8 h  <!-- planner judgment, not a measurement: the spike 1 h, the MCP port 2 h,
  the sync handler read-through 1–2 h, the rest of the conflicts 1 h, tests and the browser cases 1–2 h,
  docs 1 h -->

## Out of scope

- Bound-label typography on export (`expand-elements.ts:157, 263`, `normalize.ts`) and the server's
  absent-means-deleted sync (KI-7's mechanism) — file both with `cpc-ticket` and take them as the
  next spec. *Done since, without a spec: T-013 and T-014, fixed in S3 and staged on the branch.*
- Fixing T-001. This merge only records, in test case 6 and the ticket, what #107 and #117 changed
  about it.
- PR 4, KI-3, T-002 – T-007.
- Upstream's Docker images and npm publishing.
- Rewriting history to drop `demo.gif` (KI-2).
- Re-vendoring cpc.

## Docs to touch when this lands

- `docs/DEVLOG.md` — the merge entry: what conflicted, what the sync-handler read-through found,
  the result of the two browser test cases
- `.claude/SESSION.md` — baton
- `FORK.md` — the table is stale beyond this merge (it still says "6 commits since, 0 lacking");
  rewrite fork point, counts, the upstream base and the Specs section (headless render, Node 20,
  the MCP tool count)
- `docs/ROADMAP.md` § Upstream — "Merged <date>" with the lesson, replacing "Pending since 2026-09-07"
- `.claude/CONTEXT.md` "Current phase", `AGENTS.md` "State" — the order after the merge
- `README.md` ×3, `AGENTS.md`, `.claude/CONTEXT.md`, `package.json` — Node ≥ 20
- `docs/TICKETS.md` — T-001's re-test line (through `cpc-ticket`)
- `C:\Projects\UI-Wizard\wireframes\README.md` § "Two toolkit hazards" — rewritten by UI-Wizard's
  session S6, not here; note it in the baton so it is not forgotten
