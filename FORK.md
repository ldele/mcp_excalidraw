# This is a fork

Private fork of **[yctimlin/mcp_excalidraw](https://github.com/yctimlin/mcp_excalidraw)**,
kept for our own use. Not published, not intended for distribution.

| | |
|---|---|
| Fork point | `505f4c6` |
| Last upstream merge | 2026-10-07 — upstream **2.1.2** at `96d9c21` (the first was 2026-08-07) |
| Upstream now | **2.2.0** at `81720ac` (2026-11-10): 14 commits we lack, not merged — see [Upstream 2.2.0](#upstream-220-not-merged) |
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
  waypoints (T-009), the origin guard (T-015) and the scene saved per port (T-023).

Since upstream 2.1.2 the whole difference is 79 files, +13,649 −1,727 (docs, `.claude/` and
`tools/` left out), and two thirds of it is tests: 27 files, +8,709, most of them stored drawings
and their readings. `src/` is +3,132 −124 over 21 files.

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
merged cleanly in the 2.2.0 dry run. Where we touch upstream's files, and what fails if a merge
undoes it:

| Where | What | Fails if lost |
|---|---|---|
| `src/server.ts`, `POST /api/elements/sync` | reconciles per element instead of clearing and rewriting the store; refuses an empty sync against a non-empty canvas unless `allowEmpty` | state check *bound arrows follow a shape an agent moves after a tab has synced*; `tests/server-contract.test.mjs` |
| `src/server.ts`, `resolveArrowBindings` | keeps a bound arrow's waypoints (T-009, SPEC-003, +29 −11); offered upstream, held by the owner | state check *bound arrows keep the waypoints they were given* |
| `src/server.ts`, ahead of `cors()` and on `verifyClient` | the origin guard, from `src/core/origin-guard.ts` (T-015) | state check *requests from another site are refused* |
| `src/server.ts`, seven touches | the scene store, from `src/core/scene-store.ts`, loaded before `listen`, flushed on shutdown (T-023) | `tests/browser/server-restart.spec.mjs` |
| `frontend/src/App.tsx`, `frontend/src/utils/scene.ts` | `allowEmpty` in the sync body; `adoptServerScene` / `mergeAfterRestart` for a tab that outlives a restart | `tests/browser/server-restart.spec.mjs`; the `seed` helper of `scene-reload.spec.mjs` sends `allowEmpty` |
| `scripts/check-state-integrity.mjs` | upstream's file, carrying the three checks above | — |
| `package.json`, lock file | `@excalidraw/mermaid-to-excalidraw` `^2.2.2` (upstream `^1.1.3`) plus `npm audit fix`: 14 advisories where upstream has 22 | `npm audit` |

At a merge the lock file conflicts: take upstream's, then run
`npm install @excalidraw/mermaid-to-excalidraw@^2.2.2` and `npm audit fix`, and read `npm audit`
again. `README.md` is ours: keep it and carry any new upstream feature over by hand.

## Upstream 2.2.0, not merged

Fetched 2026-11-16; nothing taken. A dry merge on `main` conflicts in 14 files: 12 content
conflicts and 2 modify/delete (the Dockerfiles, which #112 edits). `src/server.ts` is the hard one,
with 11 hunks. Upstream now routes every store write through `commitCanvasMutation` for its
durable store, so our `track(...)` calls in create, update, delete, clear and batch-replace, and
the whole per-element sync handler, have to be rebuilt inside it rather than picked by side. The
other conflicts are one hunk each, apart from `package.json`, the lock file, the README and the
cheatsheet. They are in `App.tsx` (our `noteServerRev` against #142's sync hash), `canvas-client.ts`,
`scene-io.ts`, `render.ts`, `ci.yml`, `.gitignore`, the skill (29 tools against 27) and `package.json`.

What it brings:

- **#148: the MCP file tools resolve symlinks and accept only scene and image types.** This is a
  security fix that we do not have.
- **#149 `get_selection`**, as an MCP tool and as the CLI command `selection`. It brings our count
  to 30 tools.
- **#141, #142 and #143**: `?element=` links resolve after load, the idle autosync loop stops after
  one click, and the dark theme survives copying.
- **#132**: Excalidraw scenes embedded in PNG files can be imported.
- **#138**: a configurable share target.
- **#112**: `@excalidraw/excalidraw` and the Mermaid converter move to `devDependencies`.
- **#130, #133 and #140: upstream's own durable store.** It is opt-in through `EXCALIDRAW_DATA_DIR`
  and uses one directory and one `canvas-state-v1.json` for every port, behind a lock. It writes a
  checkpoint before each mutation is acknowledged. It keeps elements, image files and snapshots, but
  no change log and no revision. Ours is on by default, keeps one file per port, and holds the change
  log and the page side.

To decide at that merge: whether our store gives way to upstream's or stays. If it gives way, we
keep the per-port default, the change log and the page side on top; running both would save every
scene twice. Upstream's open pull request #74 (a token and an origin allow-list) is still open, so
the origin guard has nothing to reconcile with yet.
