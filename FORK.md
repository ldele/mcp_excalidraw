# This is a fork

Private fork of **[yctimlin/mcp_excalidraw](https://github.com/yctimlin/mcp_excalidraw)**,
kept for our own use. Not published, not intended for distribution.

| | |
|---|---|
| Fork point | `505f4c6` |
| Our commits since | 6 |
| Upstream commits we lack | 0 (we are strictly ahead) |
| Package name | `@ldele/mcp-excalidraw-server`, `"private": true` |
| Binary | `excalidraw-canvas` |
| `@excalidraw/excalidraw` | `^0.18.0`, resolving to **0.18.1**, which is current |

## Do not run `npx mcp-excalidraw-server`

The unscoped name on npm is **upstream's package**, published by yctimlin, and it
sits at version 1.1.0 — the same number this fork used to carry. Upstream has no
`wireframe` command, no `changes` command and no `src/core/wireframe.ts`, so
`npx` fetches a build missing every feature we added, and does it silently.

The skill used to instruct exactly that. It no longer does. Use the local binary:

```bash
npm ci && npm run build && npm link   # once
excalidraw-canvas status
```

The package is renamed and marked private so a stray `npm publish` fails loudly
instead of colliding with someone else's package.

## What this fork adds

Two features, both absent upstream:

**Semantic wireframe reading** (`src/core/wireframe.ts`, 799 lines). Reads the
canvas as a user interface instead of a list of shapes: screens, containment
nesting, component roles (`button`, `input`, `chart`, `table`, …), reading order,
navigation flows between screens, and live annotations. Roles are inferred from
geometry, fill and wording, with `?` marking low confidence, and `"role": "chart"`
on an element overrides the guess. Surfaces as `excalidraw-canvas wireframe` and
the `describe_wireframe` MCP tool.

**A two-way review loop** (`src/core/changes.ts`, 712 lines). Every mutation
bumps a canvas revision and records whether an agent or a human made it. Sticky
notes, circles, scribbles and arrows a person draws are attributed to the element
they refer to, so feedback arrives attached to its subject. Surfaces as
`changes` / `watch` and the `get_canvas_changes` / `wait_for_changes` MCP tools.

**Drawing conventions** (`skills/excalidraw-skill/references/wireframe-conventions.md`,
366 lines). The other half of the contract: layout grid, the palette split that
makes role inference work, component geometry recipes, when to declare a role.
Its premise is that a wireframe is finished when `wireframe` reads it back as
what you meant, not when the screenshot looks right.

### Full diff against the fork point

```
 src/core/wireframe.ts                      +799   new
 src/core/changes.ts                        +712   new
 skills/.../wireframe-conventions.md        +366   new
 src/cli/commands/changes.ts                 +75   new
 src/server.ts                              +397   sync reconciliation, revisions, wireframe/changes routes
 skills/excalidraw-skill/SKILL.md           +168   wireframe + review-loop workflows
 src/index.ts                               +163   MCP tools for wireframe and changes
 src/core/normalize.ts                       +92   label typography, declared roles
 src/types.ts                                +86   role vocabulary, change records
 src/core/canvas-client.ts                   +44
 src/cli/commands/scene.ts                   +37   wireframe command
 skills/.../cheatsheet.md                    +34
 src/cli/commands/elements.ts                +15
 frontend/src/App.tsx                         +5
 src/cli/run.ts                               +4
```

The load-bearing server change: `POST /api/elements/sync` now **reconciles per
element** rather than clearing and rewriting the store. Without that, any hand
edit made the whole scene look new and human changes were undetectable.

## What we removed

Upstream ships as a public npm package and Docker image. We do neither, so:

- `demo.gif` (2.8 MB), `canvas_roundtrip.png` — upstream marketing and a stale
  validation artifact
- `EXCALIDRAW-MCP-VALIDATION.md` — unreferenced scratch notes
- `Dockerfile`, `Dockerfile.canvas`, `docker-compose.yml`, `.dockerignore`
- `.github/workflows/docker.yml` — pushed images to a registry we do not use
- `.github/workflows/npm-publish.yml` — would publish under a name we do not own

`ci.yml` stays: type-check and build on push is worth keeping.

Deleting `demo.gif` shrinks the working tree, not the history. The 2.8 MB blob is
still in `.git`, and getting it out would mean rewriting history, which is not
worth it for a repo this size.

## Keeping current with upstream

```bash
git fetch upstream && git log --oneline HEAD..upstream/main
```

Upstream has not moved since the fork point. If it does, our changes concentrate
in `src/core/` (two new files), `src/server.ts` and `src/index.ts`, so conflicts
would land mostly in the latter two.

## Specs

- **Node** with TypeScript, ESM (`"type": "module"`), built by `tsc` to `dist/`
- **Frontend** is React 18 + Vite, wrapping `@excalidraw/excalidraw`, served from
  `http://127.0.0.1:3000`
- **Three interfaces over one canvas**: the `excalidraw-canvas` CLI, an MCP
  server (29 tools), and a REST API. The CLI auto-starts the canvas server;
  screenshots, image export and Mermaid conversion additionally need an open
  browser tab, and exit code 4 says so
- **State is in memory** in the Express server, with named snapshots. Nothing
  persists across a restart except what you `export`
- **The skill** (`skills/excalidraw-skill/`) is the source of truth and is copied
  to `.agents/skills/` by `npm run sync:skills`. Both the sync script and
  `install-skill` copy recursively, so new reference files need no registration
