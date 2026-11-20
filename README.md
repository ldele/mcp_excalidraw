# Excalidraw canvas for coding agents: CLI, MCP server and agent skill

[![CI](https://github.com/ldele/mcp_excalidraw/actions/workflows/ci.yml/badge.svg)](https://github.com/ldele/mcp_excalidraw/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **Private fork** of [yctimlin/mcp_excalidraw](https://github.com/yctimlin/mcp_excalidraw),
> adding semantic wireframe reading and a two-way canvas review loop. It is not
> published to npm, and `npx mcp-excalidraw-server` fetches **upstream's** package,
> which has neither feature. [How it differs from upstream](#how-it-differs-from-upstream)
> sums up the differences; **[FORK.md](FORK.md)** has the detail for whoever merges upstream next.

A live [Excalidraw](https://excalidraw.com) canvas an agent can draw on, look at, refine and save
into the repo, and that it can read back **as a user interface**: screens, component roles,
reading order and navigation flows. A person marks the canvas up in the browser, and the agent
reads the markup attached to the component it refers to.

One canvas, three ways to drive it:

- **Agent skill + CLI**, recommended for coding agents: `excalidraw-canvas <command>`, JSON in and
  out, and the canvas starts itself.
- **MCP server**: 30 tools over stdio. It speaks MCP `2026-07-28` and still accepts clients that
  open with `initialize`.
- **REST API**: plain HTTP on the canvas server.

There are two processes. The **canvas server** serves the Excalidraw page, the REST API and the
WebSocket sync, on `http://127.0.0.1:3000` by default. The CLI or the MCP server in front of it
starts it when nothing is listening; set `EXCALIDRAW_NO_AUTOSTART=1` to opt out. Everything runs
locally with no API key. Outbound traffic is the page loading Excalidraw's fonts from the esm.sh
CDN, and the optional `share` upload to excalidraw.com or a self-hosted instance.

## How it differs from upstream

Compared with upstream **2.2.0**, merged into this fork on 2026-11-16:

| | Upstream 2.2.0 | This fork |
|---|---|---|
| **Install** | `npx mcp-excalidraw-server` from npm, or a Docker image | Not published: `npm link` from this repository gives `excalidraw-canvas`; no Docker image |
| **Reading the canvas** | `describe`: a list of shapes | Also `wireframe`: screens, component roles, reading order, flows between screens, a person's annotations. A named frame is a screen. `wireframe --lint` checks the drawing against the conventions and names the cause of a misreading |
| **A person's edits** | No change log | Every change carries a revision and who made it, agent or person. `changes` and `watch` report them, each mark attached to the component it refers to |
| **Markup** | Whatever a person draws, read by no one | A "How to mark up" legend the agent adds from the skill; a person's mark in red, orange, blue or green reads as change, remove, question or fine, and the reading leaves the legend out. Each screen can carry an "Approved" box a person ticks, or a person rings the screen in green, and the reading says which screens are approved. The legend's "Send to Claude" box ends a round: until a person ticks it, their edits are held from `changes` and `wireframe` and only counted, and `watch --until-sent` returns the round once (ADR-007) |
| **MCP tools** | 27 | 30: adds `describe_wireframe`, `get_canvas_changes` and `wait_for_changes` |
| **After a restart** | The scene is gone, unless `EXCALIDRAW_DATA_DIR` turns on one store shared by every port | Saved per port by default, change log included. `EXCALIDRAW_NO_PERSIST=1` turns it off; `EXCALIDRAW_DATA_DIR` switches to upstream's store |
| **A request from another site's page** | Answered: CORS is open to every origin | Refused with 403, on the API and on the socket. `CANVAS_ALLOWED_ORIGINS` lists exceptions |
| **A tab's sync** | Clears the store and rewrites it | Merges element by element. An empty sync against a drawing is refused unless it says `allowEmpty` |
| **`apply`** | Create, update, then delete: a patch that re-creates an id it deletes loses it | Delete, create, then update |
| **An agent's edit in an open tab** | Re-prepares the whole drawing and turns the canvas read-only for a moment: slow on a large drawing, and a stroke being drawn is lost | Prepares only the elements the edit touches and keeps the canvas editable (T-029, T-030) |
| **Deleting a labelled shape** | Its label stays drawn | The label goes with it |
| **A label's alignment** | `textAlign` and `verticalAlign` are stored but the label is always drawn centred | Drawn where they say: left, right, top or bottom |
| **Arrows** | A bound arrow drops its waypoints when created; an elbowed arrow exports unbindable (`fixedPoint: null`); an arrow to a frame comes back unbound from a tab | All three keep what the agent gave them |
| **The agent skill** | Drawing and diagram guidance | Adds the wireframe conventions (`skills/excalidraw-skill/references/wireframe-conventions.md`) and the review loop |

Everything else is upstream's as it stands: rendering, Mermaid, `share`, snapshots, `selection`,
PNG scene import and the file tools' path checks. [FORK.md](FORK.md) lists each place this fork
changes upstream's files and the test that fails if a merge undoes it.

## Wireframes and the review loop

`wireframe` (MCP `describe_wireframe`) reads the canvas as an interface rather than a list of shapes:

- **Screens and nesting.** Each element nests under the smallest element that contains it. A
  native frame is a screen named by the frame's name ("S01 — Sign in"), which the editor shows at
  any zoom; a rectangle screen is named from its own heading or header bar.
- **Component roles** such as `button`, `input`, `card`, `checkbox`, `chart` and `table` are
  inferred from geometry, fill and wording. An uncertain guess carries a `?`. `"role": "chart"` on
  an element declares the role, and the reading takes it as given.
- **Reading order** is top to bottom, then left to right within a row (`3.`, `3.1.`). An element
  beside a stacked column, such as a full-height sidebar, reads as a column of its own, so the rows
  beside it stay rows.
- **Navigation flows**: an arrow from one screen to another reads as
  `button "Continue" → screen "Dashboard"`.
- **Drawing quality**: a block that appears only when the drawing is a few pixels from a different
  reading, naming the cause (`[ftr] is 4.29px outside [s1]`). `wireframe --lint` lists every finding,
  house style included; `--json` carries them under `lint`.
- **Annotations**: what a person drew, attached to the component it refers to, and what it asks
  for when drawn in one of four colours: red change, orange remove, blue question, green fine.
  The "How to mark up" legend that says so (`skills/excalidraw-skill/references/markup-legend.json`)
  is left out of the reading.
- **Approval**: a screen's "Approved" box (`s01-approval`) is not part of the design; when a person
  ticks it, or rings the whole screen in green, the screen reads `· approved` and `changes` says
  the mark approves it. A ring round a whole screen or card is attached to it, not to something
  inside.

`changes` (MCP `get_canvas_changes`) lists what changed since a revision and who made each change,
agent or human, in design terms (*moved down 60px*, *text "Continue" → "Log in"*). `watch` (MCP
`wait_for_changes`) blocks until a person has finished a round of markup.

Drawing rules are in `skills/excalidraw-skill/references/wireframe-conventions.md`. A wireframe is
done when `wireframe` reads it back as what you meant, not when the screenshot looks right.
`wireframe --score` counts fallbacks, unnamed screens and orphans.

## Install

Node.js ≥ 20. From this repository:

```bash
npm ci
npm run build
npm link
excalidraw-canvas status
```

`npm link` puts *this* build on PATH as `excalidraw-canvas`. Then give the agent its skill:

| For | Run |
|---|---|
| Any agent: it picks the project or global skill root | `excalidraw-canvas install-skill --dir <skills-root>` |
| Claude Code shortcut (`~/.claude/skills`) | `excalidraw-canvas install-skill` |
| Codex shortcut (`~/.codex/skills`) | `excalidraw-canvas install-skill --target codex` |

`install-skill` replaces the target directory, so re-running it upgrades in place.
`--print-source` shows where the bundled skill comes from. The skill in this repo is
`skills/excalidraw-skill/`; `npm run sync:skills` copies it to `.agents/skills/` after an edit.

## Quick start

```bash
excalidraw-canvas start                # drawing commands start it too
# open http://127.0.0.1:3000 to watch (optional)

echo '[
  {"id":"api","type":"rectangle","x":100,"y":100,"width":160,"height":80,"text":"API Server","backgroundColor":"#a5d8ff"},
  {"id":"db","type":"rectangle","x":400,"y":100,"width":160,"height":80,"text":"Database","backgroundColor":"#99e9f2"},
  {"type":"arrow","x":0,"y":0,"startElementId":"api","endElementId":"db","text":"SQL"}
]' | excalidraw-canvas add

excalidraw-canvas describe
excalidraw-canvas screenshot --out diagram.png
excalidraw-canvas export --out docs/architecture.excalidraw      # a diagram in the repo
excalidraw-canvas export --out ~/vault/architecture.excalidraw.md # or an Obsidian vault file
```

**Security.** The canvas binds `127.0.0.1` only. A request whose `Origin` is another site's page,
or whose `Host` is not a name for this machine, gets HTTP 403, on the API and on the WebSocket.
Programs that are not browsers send no `Origin`, so this is not authentication: any local program
can call the API. Exposing the server on a network (`HOST=0.0.0.0`) needs access control in front
of it.

## CLI reference

JSON on stdout, except `describe` (plain text) and raw content when `--out` is omitted (`export`
prints the scene, `screenshot --format svg` prints SVG). Diagnostics go to stderr. Exit codes: `0`
ok, `1` error, `2` usage, `3` canvas unreachable, `4` a browser tab is required. The canvas URL
comes from `EXPRESS_SERVER_URL` or `--url`. `status` only reports; explicit `start` overrides
`EXCALIDRAW_NO_AUTOSTART=1`.

| Command | Description |
|---------|-------------|
| `start` / `stop` / `status` | Manage the canvas server (`stop` checks the live server's identity through `/health` first) |
| `add [file\|-]` | Batch-create elements from a JSON array; `--one '{...}'` for one |
| `apply [file\|-]` | Multi-op patch: `{"create":[...],"update":[{"id":"a","set":{...}}],"delete":["id"]}`, run delete, then create, then update, so a patch can replace an id it deletes |
| `get <id>` / `delete <id...>` | Read / remove elements; a shape's bound label goes with it |
| `update <id> --set '{...}'` | Update an element |
| `query` | `--type`, `--bbox x0,y0,x1,y1`, `--filter k=v` (typed, nested keys), `--filter-json '{...}'` |
| `selection` | What is selected in the tab that changed its selection last: `selectedElementIds`, `count` |
| `describe` | Scene summary for an agent (plain text) |
| `wireframe [--json] [--score]` | Read the canvas as a UI |
| `changes [--since <rev>]` | What changed and who changed it (`--json` for raw records) |
| `watch [--timeout 60]` | Block until someone edits the canvas (`--since`, `--settle`, `--json`) |
| `screenshot` | Render headless: `--out f.png\|f.svg`, `--format`, `--scale 1-4`, `--dark`, `--padding N`, `--no-background`, `--ids a,b`, `--frame <id>`, `--no-embed-fonts`, `--embed-scene` (a PNG that `import` can read back); `--renderer browser` uses an open tab |
| `render [file\|-]` | Render a `.excalidraw` / `.excalidraw.md` file, or a PNG with a scene in it, offline, no canvas server; same flags |
| `export [--out f] [--format json\|obsidian]` / `import [file\|-] [--replace]` | Scene files; a `.md` path is Obsidian's `.excalidraw.md` format; `import` also reads a PNG with a scene in it |
| `mermaid [file\|-]` | Mermaid → canvas (browser tab required) |
| `snapshot save\|list\|restore <name>` | Named snapshots |
| `arrange align\|distribute\|group\|ungroup\|lock\|unlock\|duplicate` | Layout (`--ids a,b,c`, `--to left\|horizontal\|...`) |
| `share` | Encrypted upload → a link on excalidraw.com, or on your own instance (`EXCALIDRAW_SHARE_*`) |
| `clear --yes` | Wipe the canvas |
| `install-skill [--dir <skills-root>]` | Install the agent skill |

`"text"` on any shape becomes its label, and `"startElementId"` / `"endElementId"` bind an arrow.
`fontSize`, `fontFamily`, `textAlign` and `verticalAlign` next to `text` style the label. A shape's
`strokeColor` is its border, so to colour a label pass it whole:
`"label": {"text": "Save", "strokeColor": "#d03b3b"}`. For a native frame, add a `"type":"frame"`
element with a `"name"` and set `"frameId"` on its children; `wireframe` reads it as a screen
named by its `name`.

## Rendering

`screenshot`, `export_to_image` and `get_canvas_screenshot` render inside the canvas server, with
no tab. Excalidraw's own `exportToSvg` runs under Node (jsdom) and resvg rasterizes the result. An
unchanged scene renders byte-identical. Excalifont, Virgil, Cascadia Code and Liberation Sans ship
in `assets/fonts` (SIL OFL 1.1). Other scripts, such as CJK or emoji, fall back to the machine's
fonts with a warning. `EXCALIDRAW_RENDER_MAX_DIM` (default 8192) caps a PNG's largest side.

Two things still need an open tab: Mermaid conversion and `set_viewport`. The CLI exits `4` when
one is missing.

## MCP clients

Point the client at the local binary; with no arguments it runs the MCP stdio server.

```bash
claude mcp add excalidraw --scope user -- excalidraw-canvas
codex mcp add excalidraw -- excalidraw-canvas
```

For a JSON config (Claude Desktop, Cursor and others):

```json
{
  "mcpServers": {
    "excalidraw": {
      "command": "node",
      "args": ["/absolute/path/to/mcp_excalidraw/dist/index.js"],
      "env": { "EXPRESS_SERVER_URL": "http://127.0.0.1:3000" }
    }
  }
}
```

Never `npx -y mcp-excalidraw-server`, the config upstream documents: it runs upstream's package.

The canvas URL is not an MCP endpoint. The client launches the stdio process, and that process
reaches the canvas at `EXPRESS_SERVER_URL`. For a canvas on another machine, keep it on loopback
there and tunnel to it (`ssh -N -L 13000:127.0.0.1:3000 host`), then set `EXPRESS_SERVER_URL` to
`http://127.0.0.1:13000` and `EXCALIDRAW_NO_AUTOSTART=1`.

| Variable | Description | Default |
|----------|-------------|---------|
| `EXPRESS_SERVER_URL` | URL of the canvas server | `http://127.0.0.1:3000` |
| `ENABLE_CANVAS_SYNC` | Real-time canvas sync | `true` |
| `EXCALIDRAW_NO_AUTOSTART` | `1` disables canvas auto-start | (unset) |
| `EXCALIDRAW_EXPORT_DIR` | The directory MCP file tools may read and write, symlinks resolved; `.excalidraw`, `.json`, `.md`, `.png` and `.svg` files only | current working dir |
| `EXCALIDRAW_RENDER_MAX_DIM` | Largest side of a headless PNG, in pixels | `8192` |
| `EXCALIDRAW_PNG_WORKER_TIMEOUT_MS` | Timeout of the PNG rasterizer, in milliseconds | `120000` |
| `EXCALIDRAW_NO_PERSIST` | `1` keeps the scene in memory only, so a restart starts empty | (unset: saved per port) |
| `EXCALIDRAW_SCENE_DIR` | Directory of the saved scenes, one `scene-<port>.json` per port | the pidfile's: `%LOCALAPPDATA%\Excalidraw-Canvas` (Windows), `~/Library/Application Support/excalidraw-canvas` (macOS), `$XDG_STATE_HOME/excalidraw-canvas` (Linux) |
| `EXCALIDRAW_DATA_DIR` | Upstream's store instead of ours (see [Persistence](#persistence)) | (unset) |
| `EXCALIDRAW_SHARE_UPLOAD_URL` / `EXCALIDRAW_SHARE_BASE_URL` | Where `share` uploads, and the Excalidraw app its links open in | excalidraw.com |
| `PORT` / `HOST` | Canvas server bind address | `3000` / `127.0.0.1` |
| `CANVAS_ALLOWED_ORIGINS` | Other page origins allowed to call the canvas, comma-separated. `npm run dev` needs none: Vite's proxy presents its page as the canvas's own | (unset: the canvas's own page only) |
| `LOG_LEVEL` | `error`, `warn`, `info`, `debug` | `info` |
| `LOG_FILE_PATH` | Log file | `~/Library/Logs/excalidraw-mcp.log` (macOS), `$XDG_STATE_HOME/excalidraw-mcp/excalidraw.log` (Linux), `%LOCALAPPDATA%\Excalidraw-MCP\excalidraw.log` (Windows) |

### MCP tools (30)

| Category | Tools |
|---|---|
| **Element CRUD** | `create_element`, `get_element`, `update_element`, `delete_element`, `query_elements`, `batch_create_elements`, `duplicate_elements` |
| **Layout** | `align_elements`, `distribute_elements`, `group_elements`, `ungroup_elements`, `lock_elements`, `unlock_elements` |
| **Scene awareness** | `describe_scene`, `describe_wireframe`, `get_canvas_screenshot`, `get_selection` |
| **Review loop** | `get_canvas_changes`, `wait_for_changes` |
| **File I/O** | `export_scene`, `import_scene`, `export_to_image`, `export_to_excalidraw_url`, `create_from_mermaid` |
| **State** | `clear_canvas`, `snapshot_scene`, `restore_snapshot` |
| **Viewport** | `set_viewport` (`scrollToElementIds` zooms to fit several, `scrollToElementId` centres one, `viewportZoomFactor` in (0, 1]) |
| **Guide / resources** | `read_diagram_guide`, `get_resource` |

Full schemas: `tools/list`, or `skills/excalidraw-skill/references/cheatsheet.md`.

## Persistence

The canvas server saves its scene, image files, snapshots and change log to disk, one file per port,
and reads it back on start, so a restart keeps the drawing. A tab that outlives a restart gives the
server back what it lacks. The saved scene sits outside the repo, and the next drawing on that port
replaces it: a diagram's home is an exported `.excalidraw` file, which you `import` again to keep
working on it.

`EXCALIDRAW_DATA_DIR` switches to upstream's store instead, and turns ours off, so only one runs.
It keeps elements, image files and snapshots in one locked directory for every port and saves each
change before acknowledging it, but it does not keep the change log: after a restart, `changes`
starts again from revision 0. In that mode an image's file must be uploaded before the element
that uses it.

`share` encrypts the scene locally with AES-GCM before uploading. The key is in the URL fragment,
which excalidraw.com never receives; anyone holding the full link can view the diagram.

## Testing

```bash
npm test              # all of the below except the browser suite
npm run test:corpus   # node --test over tests/: stored drawings read back against known-good readings, server contract
npm run test:mcp      # MCP stdio wire protocol, both protocol eras
npm run test:bind     # loopback bind, duplicate-start refusal
npm run test:render   # headless renderer, export order keys
npm run test:state    # import, snapshot restore, sync validation, the fork's state checks
npm run test:durable  # upstream's opt-in store (EXCALIDRAW_DATA_DIR)
npm run test:share    # the share target
npm run test:paths    # MCP file tools stay inside EXCALIDRAW_EXPORT_DIR
npm run type-check && npm run type-check:frontend
```

The browser suite builds the app and starts its own server on port 51910 (`CANVAS_TEST_PORT` moves
it). It refuses to reuse a running server. Among its tests, a real tab's sync keeps an agent's
arrows bound, and a page from another local port or from a file on disk is refused by the canvas,
socket included. CI does not run it, so it guards a developer's machine only.

```bash
npx playwright install chromium
npm run test:canvas
```

A quick look by hand: `npx @modelcontextprotocol/inspector --cli node dist/index.js --method tools/list`.

## Troubleshooting

- **Exit code 3** (canvas unreachable): the server is not running for an inspecting command such as
  `status`, auto-start is off, or `EXPRESS_SERVER_URL` points at a non-loopback host. Run `start`.
- **Exit code 4** (browser required): open `http://127.0.0.1:3000` and retry, or drop
  `--renderer browser`.
- **HTTP 403, "this canvas answers its own page and local tools only"**: a page on another origin
  called the canvas, such as another port or a file opened from disk. List its origin in
  `CANVAS_ALLOWED_ORIGINS` and restart the canvas. The Vite dev page is not one: `npm run dev`
  reaches the canvas through Vite's proxy as its own page.
- **Boxes instead of CJK or emoji in a headless PNG**: install a font for that script on the
  machine running the canvas.
- **Plain fonts on the canvas page offline**: the page loads its fonts from the esm.sh CDN.
  Headless renders use the bundled fonts.
- **Anything else**: the server log, at `LOG_FILE_PATH`.

Open weaknesses are in `docs/KNOWN_ISSUES.md`, and reported defects in `docs/TICKETS.md`.

## Development

```bash
npm run type-check
npm run build
npm run cli -- status      # the CLI from the local build
npm run sync:skills        # after editing skills/excalidraw-skill
```

To work on the page with hot reload, run the canvas and Vite side by side, then open
`http://localhost:5173`:

```bash
npm run canvas
```

```bash
npm run dev
```

Vite proxies the page's API calls and its socket to the canvas on port 3000, and presents its own
page as the canvas's, so the origin guard lets it in and still refuses any other site's page
(T-017, `scripts/vite-dev-proxy.mjs`). `npm run canvas` loads port 3000's saved scene; set
`EXCALIDRAW_NO_PERSIST=1` for a throwaway one. One "WebSocket is closed before the connection is
established" warning in the console is React's development mode mounting the page twice.

Agent sessions start at [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE) © [yctimlin](https://github.com/yctimlin). Not affiliated with the Excalidraw team;
[Excalidraw](https://github.com/excalidraw/excalidraw) is its own MIT-licensed project.
