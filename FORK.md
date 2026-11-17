# This is a fork

Private fork of **[yctimlin/mcp_excalidraw](https://github.com/yctimlin/mcp_excalidraw)**,
kept for our own use. Not published, not intended for distribution.

| | |
|---|---|
| Fork point | `505f4c6` |
| Last upstream merge | 2026-11-16 — upstream **2.2.0** at `81720ac` (SPEC-004); before it 2026-10-07 (2.1.2) and 2026-08-07 |
| Upstream now | **2.2.0** at `81720ac` (2026-11-10), nothing we lack (fetched 2026-11-16) — see [Upstream 2.2.0](#upstream-220-merged-2026-11-16) |
| Our version | **1.3.0**, our own line: the package is private and renamed, so it does not borrow upstream's number |
| Package name | `@ldele/mcp-excalidraw-server`, `"private": true` |
| Binary | `excalidraw-canvas` |
| `@excalidraw/excalidraw` | `^0.18.0`, resolving to **0.18.1**, the latest on npm (2026-11-16) |

## Do not run `npx mcp-excalidraw-server`

The unscoped name on npm is **upstream's package**. It has no `wireframe` or `changes` command, so
`npx` fetches a build missing every feature below, and does it silently (KI-1). Use the local
binary; with no arguments it is the MCP stdio server, with a subcommand the CLI:

```bash
npm ci && npm run build && npm link   # once
excalidraw-canvas status
```

The package is renamed and marked private so a stray `npm publish` fails loudly.

## What this fork adds

- **Semantic wireframe reading** (`src/core/wireframe.ts`): the canvas read as a user interface —
  screens, nesting, component roles, reading order, navigation flows, live annotations. CLI
  `wireframe`, MCP `describe_wireframe`.
- **The two-way review loop** (`src/core/changes.ts`): a revision on every mutation, each change
  attributed to agent or human, and a person's markup attached to the element it refers to. CLI
  `changes` / `watch`, MCP `get_canvas_changes` / `wait_for_changes`.
- **Drawing conventions** (`skills/excalidraw-skill/references/wireframe-conventions.md`): the grid,
  the palette split role inference relies on, component recipes. A wireframe is finished when
  `wireframe` reads it back as meant, not when the screenshot looks right.
- **Fixes and guards in upstream's files**, listed with their checks under
  [Keeping current](#keeping-current-with-upstream): per-element sync, the empty-sync refusal, kept
  waypoints (T-009), the origin guard (T-015), the scene saved per port (T-023), and a change log
  that stays in step with upstream's opt-in store (SPEC-004).

Against upstream 2.2.0 the whole difference is 83 files, +14,240 −2,419 (docs, `.claude/` and
`tools/` left out), and most of it is tests: 28 files, +8,974, most of them stored drawings and
their readings. `src/` is +3,340 −140 over 22 files.

## What we removed

Upstream ships as a public npm package and Docker image; we do neither. Gone: `demo.gif`,
`canvas_roundtrip.png`, `EXCALIDRAW-MCP-VALIDATION.md`, `Dockerfile`, `Dockerfile.canvas`,
`docker-compose.yml`, `.dockerignore`, `.github/workflows/docker.yml` and `npm-publish.yml`.
`ci.yml` stays. The 2.8 MB `demo.gif` is still in `.git` history (KI-2).

## Keeping current with upstream

```bash
git fetch upstream && git log --oneline HEAD..upstream/main
```

What each merge cost and taught is in `docs/ROADMAP.md` § Upstream. Our own layer is in files
upstream does not edit (`wireframe.ts`, `changes.ts`, `scene-store.ts`, `origin-guard.ts`), apart
from our three MCP tools, which sit in upstream's `mcp-tools.ts` and `mcp-dispatch.ts`; both
merged cleanly in 2.2.0. Where we touch upstream's files, and what fails if a merge undoes it:

| Where | What | Fails if lost |
|---|---|---|
| `src/server.ts`, every route that writes elements | records its changes inside upstream's `commitCanvasMutation`, through `commitTracked`, which puts the change log back whenever upstream puts the store back (SPEC-004) | `tests/server-contract.test.mjs`, *a write the checkpoint refuses leaves no change record* |
| `src/core/scene-store.ts`, `startServer` in `src/server.ts` | our store is off when `EXCALIDRAW_DATA_DIR` turns upstream's on, so only one runs (SPEC-004) | `tests/server-contract.test.mjs`, *with EXCALIDRAW_DATA_DIR set, upstream keeps the scene…* |
| `src/server.ts`, `POST /api/elements/sync` | reconciles per element, in one commit, instead of clearing and rewriting the store; refuses an empty sync against a non-empty canvas unless `allowEmpty`; an untouched shape takes the reference to the label the tab expanded, without a record (SPEC-004) | state check *bound arrows follow a shape an agent moves after a tab has synced*; `tests/server-contract.test.mjs`; upstream's *browser PNG export embeds native editable metadata* |
| `src/server.ts`, `resolveArrowBindings` | keeps a bound arrow's waypoints (T-009, SPEC-003, +29 −11); offered upstream, held by the owner | state check *bound arrows keep the waypoints they were given* |
| `src/server.ts`, ahead of `cors()` and on `verifyClient` | the origin guard, from `src/core/origin-guard.ts` (T-015) | state check *requests from another site are refused* |
| `src/server.ts`, seven touches | the scene store, from `src/core/scene-store.ts`, loaded before `listen`, flushed on shutdown (T-023) | `tests/browser/server-restart.spec.mjs` |
| `src/server.ts`, `DELETE /api/elements/:id` | takes the element's bound labels with it, in the same commit, from `src/core/bound-text.ts`, and returns every id it removed (T-025); upstream 2.2.0's route still leaves them | `tests/server-contract.test.mjs` |
| `src/core/expand-elements.ts` (export) and `prepareServerScene` in `frontend/src/utils/scene.ts` | give an elbowed arrow's bindings the fixed point Excalidraw requires, from `src/core/elbow-binding.ts` (T-024); upstream 2.2.0's export still writes `fixedPoint: null` | `tests/elbow-binding.test.mjs` |
| `prepareServerScene` in `frontend/src/utils/scene.ts`, `bindArrowsToFrames` | binds an arrow whose `start` or `end` names a frame to that frame, on both sides, as the export does: upstream keeps frames out of the skeleton converter (#110), so an agent's arrow to a frame came back unbound and the tab's first sync reported it as a person's edit, which the reading then took for markup (SPEC-005); upstream 2.2.0 still drops it | `tests/frame-screens.test.mjs`, *a tab's load keeps an agent's arrow bound to the frame it names* |
| `scripts/check-durable-state.mjs`, `scripts/check-selection.mjs` | `EXCALIDRAW_NO_PERSIST=1` on the canvases they start: their "memory only" is upstream's, which forgets a scene on restart | `npm run test:durable` |
| `src/cli/commands/elements.ts`, `apply` and `delete` | `apply` deletes before it creates, so a patch can replace an id it deletes (T-022); both skip a label the server already removed | `tests/server-contract.test.mjs` |
| `frontend/src/App.tsx`, `frontend/src/utils/scene.ts` | `allowEmpty` in the sync body; `adoptServerScene` / `mergeAfterRestart` for a tab that outlives a restart | `tests/browser/server-restart.spec.mjs`; the `seed` helper of `scene-reload.spec.mjs` sends `allowEmpty` |
| `scripts/check-state-integrity.mjs` | upstream's file, carrying the three checks above | — |
| `vite.config.js`, `server.proxy` | `canvasProxy` from `scripts/vite-dev-proxy.mjs`: proxies the page's socket as well as `/api` and `/health`, and gives the dev page's own requests the canvas's Origin, so `npm run dev` passes the origin guard and another site's page still does not (T-017). Upstream's proxy has no socket entry, so its dev page never syncs | `tests/dev-proxy.test.mjs` |
| `package.json`, lock file | `@excalidraw/mermaid-to-excalidraw` `^2.2.2` (upstream `^1.1.3`), a dev dependency since #112, plus `npm audit fix`: 16 advisories on 2026-11-16, where `main`'s lock before the merge read 19 that day | `npm audit` |

At a merge the lock file conflicts: take upstream's, then run
`npm install -D @excalidraw/mermaid-to-excalidraw@^2.2.2` and `npm audit fix`, and read `npm audit`
again. `README.md` is ours: keep it and carry any new upstream feature over by hand. Its
[How it differs from upstream](README.md#how-it-differs-from-upstream) table is the reader's summary
of this file. Keep it current as the fork changes, not only at merges: a change a user would
notice (a ticket fix, an ADR built, a default or a tool count changed) updates its row, or adds
one, in the same commit. At every merge, also bring its upstream column and version up to date.

## Upstream 2.2.0, merged 2026-11-16

Taken on `merge/upstream-2.2.0` (SPEC-004) and landed on `main` as `c800fa8`, all 14 commits
from `96d9c21` to `81720ac`. It conflicted
in 14 files: 12 content conflicts and the two Dockerfiles, which #112 edits and we keep deleted.
`src/server.ts` was the hard one, with 11 hunks, because upstream now routes every store write
through `commitCanvasMutation` for its durable store. Our change log, the T-025 label cascade and the
per-element sync were rebuilt inside it rather than picked by side.

**Which store runs** (the owner, 2026-11-16): ours stays the default; upstream's is the opt-in.
Setting `EXCALIDRAW_DATA_DIR` turns upstream's on and ours off for that process, so a scene is never
saved twice. In that mode the change log does not survive a restart, and `changes` then starts again
from revision 0. Upstream's module is taken as written: without the variable its wrapper only runs
the mutation.

What it brought:

- **#148: the MCP file tools resolve symlinks and accept only scene and image types.** The CLI reads
  its files itself, so `import` and `render` are not restricted.
- **#149 `get_selection`**, as an MCP tool and as the CLI command `selection`: 30 tools now.
- **#141, #142 and #143**: `?element=` links resolve after load, the idle autosync loop stops after
  one click, and the dark theme survives copying.
- **#132**: Excalidraw scenes embedded in PNG files can be imported and rendered.
- **#138**: a configurable share target.
- **#112**: `@excalidraw/excalidraw`, the Mermaid converter and React move to `devDependencies`.
- **#130, #133 and #140: upstream's durable store**, now our opt-in: one directory and one
  `canvas-state-v1.json` for every port, behind a lock, with a checkpoint written before each
  mutation is acknowledged. It keeps elements, image files and snapshots.

What the merge found:

- **Upstream's rollback did not know our change log.** When its checkpoint refuses a write, it puts
  elements, files and snapshots back; our records of that write would have stayed. `commitTracked`
  in `src/server.ts` puts the log back with them. A test fails without it.
- **A shape the agent labelled did not name its label after a tab's sync.** Upstream's new
  embedded-PNG test caught it; the fork's sync had always done this. The tab expands the shorthand
  `label` into a bound text, and the sync kept the stored shape, which is right for authorship, but
  without the tab's reference to that text. Editors repair it on load; the store and a headless
  export did not carry it. The untouched shape now takes the reference, with no record.
- **Upstream's durable check cannot pass on Windows**, its own copy included: `child.kill('SIGTERM')`
  ends the process outright there, so no canvas releases its lock. Its three lock-released
  assertions are skipped on Windows only.
- **Upstream's memory-only checks assumed a canvas forgets its scene on restart.** Ours saves it by
  default, so the two scripts that start a canvas set `EXCALIDRAW_NO_PERSIST=1`.

Upstream's open pull request #74 (a token and an origin allow-list) is still open, so the origin
guard has nothing to reconcile with yet.
