<!-- status: active · updated: 2026-11-16 · class: living -->

# SPEC-004 — take upstream 2.2.0

> The executor brief (cpc ADR-019). Target executor: **an agent session in this repo with a terminal
> and a browser** (the browser suite and the review-loop round-trip need a real tab). The *why* is
> `FORK.md` § Upstream 2.2.0 and `docs/ROADMAP.md` § Upstream; the plan this follows is
> SPEC-002, the 2.1.2 merge. Written 2026-11-16 by the session the owner gave the merge to.
>
> **Staged 2026-11-16** on `merge/upstream-2.2.0` in `C:\Projects\mcp_excalidraw-merge`, not
> committed. Every test case below ran; § Verified gives each result. Work items 12 and 13 were
> added during the work.

## Reader and what changes
- **Reader:** the session doing the merge, then the owner reviewing the staged branch.
- **What changes for them:** they know which store runs, where every change of ours goes inside
  upstream's `commitCanvasMutation`, and which check proves each one survived, so the review is a
  read of a list, not a re-derivation of the merge.

## Goal

Bring the fork level with `upstream/main` at `81720ac` (2.2.0, 2026-11-10, 14 commits past our
merge base `96d9c21`) without changing what `wireframe` reads or how the review loop attributes a
change. Two things in it matter to us now: #148, a security fix to the MCP file tools, and #142,
which stops the idle autosync loop a tab click starts (10 syncs for one click, seen 2026-11-16).

Measured 2026-11-16 (`git merge-tree --write-tree 09cd3e2 upstream/main`): 14 conflicting files,
12 content and 2 modify/delete.

| File | Conflict | Note |
|---|---|---|
| `src/server.ts` | 11 hunks | upstream wraps every store write in `commitCanvasMutation` (#130, #133); our change log, the T-025 label cascade and the per-element sync have to be rebuilt inside it |
| `frontend/src/App.tsx` | 1 hunk | our `noteServerRev` against #142's scene hash |
| `src/core/canvas-client.ts`, `src/core/scene-io.ts`, `src/cli/commands/render.ts` | 1 hunk each | both sides added |
| `package.json`, `package-lock.json` | hunks + the lock | #112 moves the frontend packages to `devDependencies`; our mermaid converter is `^2.2.2` |
| `.github/workflows/ci.yml`, `.gitignore` | 1 hunk each | ours is a rewrite; upstream added its new checks |
| `README.md`, `skills/…/SKILL.md`, `skills/…/cheatsheet.md` | prose | tool count 29 (ours) against 27 (theirs); 30 after the merge |
| `Dockerfile`, `Dockerfile.canvas` | modify / delete | we deleted them (`FORK.md` § What we removed); they stay deleted |

## Hard constraints

- **`AGENTS.md` rule 1: stage, never commit.** Work on `merge/upstream-2.2.0`, cut from `main` at
  `09cd3e2` in a separate worktree (`C:\Projects\mcp_excalidraw-merge`), as SPEC-002 did: the
  main checkout is shared and an owner's canvas may run from its `dist/`. Commit, merge to `main`
  and push only on the owner's per-commit yes.
- **Rule 2: the collision zone.** `src/server.ts`, `src/index.ts`, `src/core/normalize.ts`.
  `normalize.ts` merged cleanly; read it anyway.
- **Rule 3: edit `skills/`, never `.agents/`**, then `npm run sync:skills`.
- **Rule 4: the round-trip closes.** `tests/expected/` must not change.
- **Rule 5: never stage `tools/conventions/`.** The worktree has a copy for the gates; it is
  gitignored.
- **ROADMAP § Upstream, the 2.1.2 lesson:** the one real defect last time came from a file git
  merged without a conflict. Read every path that writes the element store, conflicted or not.
- **`FORK.md` § What we removed.** The Dockerfiles stay deleted; the package stays
  `@ldele/mcp-excalidraw-server`, private, binary `excalidraw-canvas`, version on our own line.
- **Private ports only.** 3000 and 3010 may be the owner's canvases.
- **CONVENTIONS §16, test weight.** Upstream's new checks come with it; add no test dependency.

## Open questions
- **familiarity:** fork / upstream merge policy — **high** (the owner decides).

| # | Question | Status | Resolution + reason | Reopens if |
|---|----------|--------|--------------------|------------|
| 1 | Which store runs: ours (`scene-store.ts`, on by default, a file per port, holds the change log and the page side) or upstream's (`canvas-persistence.ts`, opt-in through `EXCALIDRAW_DATA_DIR`, one locked directory, a checkpoint before each acknowledgement, no change log)? | resolved | **Ours stays the default; upstream's is opt-in** (owner, 2026-11-16). Upstream's module and its `commitCanvasMutation` wrapping are taken as written: they do nothing unless `EXCALIDRAW_DATA_DIR` is set. Setting it turns ours off for that process, so one store runs at a time; in that mode the change log does not survive a restart. Upstream's durable-state check runs as written. | the review loop needs the change log in durable mode |
| 2 | Upstream's map rollback (a failed checkpoint restores elements, files and snapshots) does not know our change log. Where do our `track(...)` calls go? | resolved | **Inside the mutation, with the change log rolled back alongside the maps** when the durable store is on and the checkpoint was not published (work item 3). Records are built while the element is still in the store (a delete names what it removed), which rules out moving them after the commit. | upstream exports a hook for extra state |
| 3 | Where does a tab that outlives a restart in durable mode land? The scene comes back from upstream's store, but the page-side scene id is new. | resolved | **Read, not run live:** `adoptServerScene` (`frontend/src/App.tsx`) keys a restart on the instance id, which every new process changes. The tab then keeps its scene and sends back the union with the server's (`mergeAfterRestart`, `sameScene: false`), so nothing either side holds is left out. Durable mode is opt-in and off in every flow the fork uses. | the owner turns durable mode on for real use |

## Execution checklist
1. Write the test cases below; mark which exist already.
2. Cut the branch in the worktree; `git merge upstream/main --no-commit`.
3. Keep the Dockerfiles deleted (work item 1).
4. Resolve `src/server.ts` (work items 2 to 4), then read every store write in the merged file
   end to end.
5. Resolve the rest in the order of the work items.
6. Lock file, `npm audit` (work item 8).
7. Run every test case; the browser ones with the system Chrome.
8. Update the docs listed at the end; stage; hand off.

## Work items

| # | Item | Files | Acceptance |
|---|------|-------|------------|
| 1 | Modify / delete: keep our deletions | `Dockerfile`, `Dockerfile.canvas` | neither exists in the tree |
| 2 | Take upstream's `commitCanvasMutation` wrapping in every route; inside it rebuild our `track(...)` calls in create, update (with the rerouted arrows' deltas), clear, delete and batch-replace, the T-025 bound-label cascade in the delete route, and the whole per-element sync handler (reconciliation, the empty-sync refusal, origin tracking) | `src/server.ts` | test cases 2, 3, 4 |
| 3 | A fork helper around `commitCanvasMutation` that restores the change log when upstream restores the maps (durable mode on, checkpoint not published) | `src/server.ts` | test case 6 |
| 4 | Keep the origin guard, the scene-store middleware and start-up, the kept waypoints (T-009), `canvasIdentity` in `/health`; take upstream's selection socket handler, `/api/selection`, the lock acquire / release, `embedScene` | `src/server.ts` | test cases 4, 9; `/health` still carries `instanceId`, `sceneId`, `rev` |
| 5 | Ours off when `EXCALIDRAW_DATA_DIR` is set, said once at start-up | `src/core/scene-store.ts`, `src/server.ts` | test case 5 |
| 6 | `App.tsx`: our `noteServerRev` and `adoptServerScene` kept; #142's scene hash, #141's element link, #143's theme, #149's selection report taken | `frontend/src/App.tsx` | test case 8; `type-check:frontend` |
| 7 | Both sides' client calls and options: `canvas-client.ts`, `scene-io.ts` (PNG scenes, #132), `render.ts` | `src/core/…`, `src/cli/commands/render.ts` | `excalidraw-canvas help` lists `selection`; type-check |
| 8 | `package.json`: our name, `private`, bin and version; upstream's dependency split (#112) and checks (`test:durable`, `test:share`, `test:paths`) added to our `test`. Lock: take upstream's, `npm install -D @excalidraw/mermaid-to-excalidraw@^2.2.2`, `npm audit fix`, read `npm audit` | `package.json`, `package-lock.json` | `npm ci` clean; advisory count recorded |
| 9 | `ci.yml`, `.gitignore`: ours, plus upstream's new checks and ignores | `.github/workflows/ci.yml`, `.gitignore` | the CI `check` job names every script in `npm test` |
| 10 | Prose: ours, with `get_selection` / `selection` carried over and 30 tools | `README.md`, `skills/excalidraw-skill/SKILL.md`, `skills/…/references/cheatsheet.md` | `npm run sync:skills` leaves `.agents/` equal to `skills/` |
| 11 | Upstream's scripts that start a server keep the fork's store out of their way (`EXCALIDRAW_NO_PERSIST=1`), as `check-state-integrity.mjs` already does | `scripts/check-durable-state.mjs`, `scripts/check-selection.mjs` | test case 7 |
| 12 | *Added during the work.* An untouched shape takes the reference to the label the tab expanded, with no record. Upstream's new embedded-PNG browser test caught the gap; the sync handler had it before the merge | `src/server.ts` | test case 11; test case 8 |
| 13 | *Added during the work.* Upstream's durable check skips its three lock-released assertions on Windows, where `child.kill('SIGTERM')` ends the process outright; upstream's own copy fails there too | `scripts/check-durable-state.mjs` | test case 7 on Windows |

## Test cases (write these first — checklist step 1)

| Name | Assertion | Path |
|------|-----------|------|
| 1 · corpus unchanged | `npm run test:corpus` passes and `git diff --quiet 09cd3e2 -- tests/expected` exits 0 | `tests/**/*.test.mjs` (existing) |
| 2 · every write is still recorded | create, update, delete, clear and batch-replace each leave their records in `changes`, with the agent as origin | `tests/server-contract.test.mjs` (existing) |
| 3 · a delete takes its label (T-025) | `DELETE /api/elements/:id` on a labelled shape removes the label and returns both ids | `tests/server-contract.test.mjs` (existing) |
| 4 · per-element sync and the empty-sync refusal | a tab's sync reconciles per element; an empty sync against a non-empty canvas is refused without `allowEmpty`; bound arrows follow a shape moved after a sync; waypoints kept; another site refused | `scripts/check-state-integrity.mjs` (existing, the fork's three checks) |
| 5 · one store at a time | with `EXCALIDRAW_DATA_DIR` set, no `scene-<port>.json` is written and `/health` names no scene file; unset, no `canvas-state-v1.json` is written | `tests/server-contract.test.mjs` (new) |
| 6 · the change log rolls back with the maps | in durable mode, an image element whose file was never uploaded is refused (409) and `changes` gains no record and no revision | `tests/server-contract.test.mjs` (new) |
| 7 · upstream's new checks pass on our server | `test:durable`, `test:share`, `test:paths` (#148) pass | upstream's scripts |
| 8 · one click, one sync at most (#142) | in a real tab, a click on empty canvas and a selection make no sync or one; the browser suite passes | `tests/browser/` (upstream's #142 spec if it has one) + the live round-trip |
| 9 · 30 tools | the stdio wire test lists 30 tools, including `describe_wireframe`, `get_canvas_changes`, `wait_for_changes`, `get_selection` | `scripts/check-mcp-stdio.mjs` |
| 10 · the review loop still attributes | live, private port, real tab: an agent `add`, a page load, then `changes` shows no human record; one human edit in the tab shows as one human record on the right element; `wireframe` reads zero `shape` fallbacks | manual, recorded in the DEVLOG |
| 11 · a labelled shape names its label after a sync | an agent's shape with a shorthand `label`, then the sync a tab sends after expanding it: no record, the shape stays the agent's, and it lists the bound text in `boundElements` | `tests/server-contract.test.mjs` (new) |

## Verified

On the branch, 2026-11-16, Windows 11, Node 24.15.

| Case | Result |
|---|---|
| 1 · corpus unchanged | **Pass.** `node:test` 100 / 100 (97 before the merge, 3 new); `git diff --quiet 09cd3e2 -- tests/expected` exits 0 |
| 2 · every write is still recorded | **Pass**, in the corpus run |
| 3 · a delete takes its label | **Pass**, in the corpus run |
| 4 · per-element sync, the empty-sync refusal | **Pass.** `test:state`, the fork's three checks included |
| 5 · one store at a time | **Pass** (new test) |
| 6 · the change log rolls back | **Pass** (new test). With `commitTracked`'s rollback taken out of `dist/`, it fails: *no revision was spent* |
| 7 · upstream's new checks | **Pass** for `test:share`, `test:paths` and `check-selection.mjs`. `test:durable` **failed** on its first lock-released assertion, and upstream's untouched 2.2.0 copy, built in a scratch worktree, fails on the same line here. With the three Windows-impossible assertions skipped (work item 13) it passes in full |
| 8 · one click, one sync at most | **Pass.** Live: a page load sent no sync, a click on empty canvas sent none (10 before #142, DEVLOG archive 2026-11-16 (d)), each human edit sent one. Playwright 32 / 32 with the system Chrome, #142's two tests included. One run of three had a canvas crash at boot (`0xC0000409`) in a restart test; that spec then passed 3 runs of 3 and the whole suite passed again |
| 9 · 30 tools | **Pass.** MCP wire 6 / 6 |
| 10 · the review loop attributes | **Pass.** Live on port 3061: 9 agent records, none from the page load; a person's note was one human record "annotates [go] rectangle "Continue" (45px away)" and the reading listed it under that button; a drag was one human record on `[email]`; 0 fallbacks before and after |
| 11 · a labelled shape names its label | **Pass** (new test); fails with the fix taken out of `dist/`. Live, the button listed `go-label` after the tab's first sync |

`npm audit`: 16 advisories after `npm audit fix` (2 low, 3 moderate, 11 high). `main`'s lock read 19
the same day. What is left has no fix (`katex`, `lodash-es`, `nanoid`, through the Mermaid
converter), or only a breaking one (`zod` 4, `@modelcontextprotocol/server`), or waits on
`express` (`qs`).

## Estimate
- **estimate:** L / 5–7 h  <!-- planner judgment: server.ts 2 h, the rest of the conflicts 1 h,
  the lock and audit 0.5 h, tests and the browser 1.5–2 h, docs 1 h -->

## Out of scope
- Building ADR-003 to ADR-005; PR 4.
- Making upstream's durable store carry the change log, or the fork's scene store giving way.
- Offering T-009 or T-025 upstream.
- Upstream's Docker images and npm publishing.
- Removing the worktree; the owner's call once the branch lands.

## Docs to touch when this lands
- this SPEC: § Verified with each case's result
- `FORK.md`: the header table, § Keeping current (the new rows), § Upstream 2.2.0 → merged
- `docs/ROADMAP.md` § Upstream: "Merged 2026-11-16" with the lesson
- `docs/DEVLOG.md`, `.claude/SESSION.md`, `.claude/CONTEXT.md` current phase, `AGENTS.md` state
- `README.md`, the skill: 30 tools, `get_selection`, `EXCALIDRAW_DATA_DIR` against our store
