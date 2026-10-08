# Excalidraw MCP Server, CLI & Agent Skill

[![CI](https://github.com/ldele/mcp_excalidraw/actions/workflows/ci.yml/badge.svg)](https://github.com/ldele/mcp_excalidraw/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **Private fork** of [yctimlin/mcp_excalidraw](https://github.com/yctimlin/mcp_excalidraw),
> adding semantic wireframe reading and a two-way canvas review loop. It is not
> published to npm, and `npx mcp-excalidraw-server` fetches **upstream's** package,
> which has neither feature. Read **[FORK.md](FORK.md)** first: what we added, what
> we removed, and how to install the `excalidraw-canvas` binary.

This gives AI agents a live [Excalidraw](https://excalidraw.com) canvas they can draw on, look at, refine, and save into your repo. Your agent creates architecture diagrams and flowcharts programmatically, **sees its own work via screenshots**, fixes layout problems, and exports `.excalidraw` files you can commit next to your code.

One canvas, three ways to drive it:

- **Agent Skill + CLI** — recommended for coding agents (Claude Code, Codex CLI, Cursor, OpenCode): `excalidraw-canvas <command>` after `npm link`. Auto-starts the canvas, composable JSON in/out.
- **MCP Server** — 29 tools over stdio for any Model Context Protocol client (Claude Desktop, Cursor, Codex CLI, Antigravity, ...). Speaks MCP `2026-07-28` (`server/discover`, per-request `_meta` envelope, tool calls without a handshake) and stays compatible with 2025-era clients that open with `initialize`.
- **REST API** — plain HTTP for LangChain and custom frameworks.

Core drawing runs locally (Node ≥ 20, MIT licensed) — no API keys or accounts. Mermaid conversion runs in the local browser canvas; `share` is optional and uploads an encrypted scene to excalidraw.com. The canvas page loads Excalidraw's fonts from the esm.sh CDN.

## Table of Contents

- [Demo](#demo)
- [What It Is](#what-it-is)
- [How We Differ from the Official Excalidraw MCP](#how-we-differ-from-the-official-excalidraw-mcp)
- [What's New](#whats-new)
- [Installation](#installation)
- [Agent Skill](#agent-skill)
- [CLI Reference](#cli-reference)
- [Headless Rendering](#headless-rendering)
- [Configure MCP Clients](#configure-mcp-clients)
  - [Claude Desktop](#claude-desktop)
  - [Claude Code](#claude-code)
  - [Cursor](#cursor)
  - [Codex CLI](#codex-cli)
  - [OpenCode](#opencode)
  - [Antigravity (Google)](#antigravity-google)
- [MCP Tools (29 Total)](#mcp-tools-29-total)
- [Quick Start (From Source)](#quick-start-from-source)
- [Testing](#testing)
- [FAQ](#faq)
- [Troubleshooting](#troubleshooting)
- [Known Issues / TODO](#known-issues--todo)
- [Development](#development)
- [License](#license)

## What It Is

Ask your agent to *"draw the architecture of this service"* and it produces a real, editable Excalidraw diagram — not a one-shot image. Because the agent can query, screenshot, and update individual elements, it iterates until labels fit, nothing overlaps, and arrows route cleanly; then it exports the result as a `.excalidraw` file that lives in your repo and gets updated when the code changes.

Under the hood there are two processes, one product:

- **Canvas server**: Excalidraw web UI + REST API + WebSocket real-time sync (default `http://127.0.0.1:3000`)
- **A thin front-end of your choice**: the CLI, the MCP stdio server, or raw HTTP — all drive the same canvas

Since v1.1 the canvas server starts itself: canvas-driving CLI commands (and the MCP server on launch) auto-spawn it if nothing is listening. `status` only inspects the current server state. Set `EXCALIDRAW_NO_AUTOSTART=1` to opt out.

## How We Differ from the Official Excalidraw MCP

Excalidraw has an [official MCP](https://github.com/excalidraw/excalidraw-mcp) — a chat widget that streams a diagram inline from a single prompt (the model gets two tools: a format reference and `create_view`). It's great for "draw me a cat" in Claude or ChatGPT. We solve a different problem: giving *coding agents* a persistent canvas workbench.

| | Official Excalidraw MCP | This Project |
|---|---|---|
| **Approach** | Prompt in, diagram out (one-shot widget) | Programmatic element-level control (CLI + 29 MCP tools) |
| **State** | Checkpoints inside the chat widget | Persistent live canvas with real-time sync |
| **Element CRUD** | Declarative re-send with delete markers | Full create / read / update / delete per element |
| **AI sees the canvas** | No | `describe` (structured text) + `screenshot` (image) |
| **Iterative refinement** | Regenerate from checkpoint | Draw → look → adjust → look again, element by element |
| **Layout tools** | No | align, distribute, group / ungroup, lock, duplicate |
| **File I/O** | No model-facing export | `.excalidraw` export/import — diagrams as repo artifacts |
| **Snapshot & rollback** | Widget-side checkpoints | Named server-side snapshots |
| **Mermaid conversion** | No | `mermaid` / `create_from_mermaid` |
| **Shareable URLs** | Widget-only | `share` / `export_to_excalidraw_url` |
| **Viewport control** | Camera animations | `set_viewport` (zoom-to-fit all or selected elements, center on one element, manual zoom) |
| **Works without MCP** | No | Yes — CLI + agent skill + REST API |
| **Multi-agent** | Single chat | Multiple agents on the same canvas concurrently |

**TL;DR** — The official MCP shows Excalidraw diagrams in your chat. This project gives your coding agent a full Excalidraw workbench: a canvas it can draw on, inspect, refine, and commit to your repo.

## What's New

Current package version: **2.1.2**. The current release line is **v2.1 — Headless Rendering**.

### v2.1.2 — Fixes

- Snapshot restore no longer wipes the canvas; frames restore and import. (#101, thanks @sanjayy0612; #120)
- One label per shape, even across updates and renames. (#121, thanks @sdrshn-nmbr)
- Dropped images survive reload and show up in exports. (#122, thanks @appdesigngeeks)
- Text is no longer clipped when the font loads late. (#123, #124)

### v2.1.1 — Fixes

- Large exports no longer fail with `invalid order key`. (#115, thanks @fernandovmacedo)
- Text and arrows no longer drift on each canvas sync. (#116, thanks @hidinginabunker)
- Library installs work and persist; labels re-wrap on resize. (#113, thanks @lukemariano)

### v2.1 — Headless Rendering

- **Screenshots and image exports no longer need a browser tab.** `screenshot`, `export_to_image` and `get_canvas_screenshot` render inside the canvas server: Excalidraw's own SVG exporter runs under Node (jsdom) and resvg rasterizes to PNG with bundled Excalifont/Virgil/Cascadia/Liberation fonts. Same output as the tab, deterministic (byte-identical for an unchanged scene), a few milliseconds per render, works in CI and Docker. See [Headless Rendering](#headless-rendering).
- **New render options** on the CLI, REST and MCP: `dark`, `scale` (1–4), `padding`, `elementIds` (render a subset), `frameId` (render one frame), `embedFonts`. `--renderer browser` keeps the old tab path.
- **New `render` command**: `excalidraw-canvas render docs/arch.excalidraw --out docs/arch.png` renders a committed file offline — no canvas server at all.
- Shapes created without `width`/`height` now default to 100×100 in exports and renders (matching the canvas) instead of collapsing to 0×0.
- Text stored with `width: 0, height: 0` (scenes from pre-2.0 servers) is re-measured on export instead of exporting invisible. (#107)

### v2.0 — Interchange-Grade Exports & MCP 2026-07-28

- **Breaking: Node >= 20 required** (was 18) — the MCP TypeScript SDK v2 sets the floor. Everything else is backward compatible, including existing MCP client configs.
- **MCP protocol revision 2026-07-28**: modern clients can call tools statelessly without an initialization handshake (`server/discover`, per-request `_meta` envelopes); legacy initialization-based clients keep working unchanged. (#98, thanks @anxkhn)
- **Exports render everywhere now**: `.excalidraw` / `.excalidraw.md` files contain real Excalidraw elements — shape and arrow labels as bound text, live arrow bindings — so they open correctly on excalidraw.com and in the Obsidian Excalidraw plugin instead of losing labels (or being re-saved empty by the plugin). (#93, #95)
- **Byte-stable exports**: deterministic ids, seeds, and key order — re-exporting an unchanged scene is byte-identical, so committed diagrams and vault files never produce phantom git diffs, and Obsidian block references survive re-exports.
- **Obsidian vault fixes**: Windows/CRLF `.excalidraw.md` files import correctly (#94, thanks @cason-miles); `## Text Elements` block references now cover shape labels too.
- **Element fields are never silently dropped**: unknown Excalidraw properties (`containerId`, `textAlign`, `originalText`, ...) pass through the server intact — fixes browser-edited text vanishing after sync. (#92, thanks @junuxyz)
- **Mermaid conversion merges** into the existing canvas instead of replacing it, and each browser tab holds exactly one WebSocket connection (no more doubled labels). (#91)
- **Viewport control**: `set_viewport` gains `scrollToElementIds` (multi-element zoom-to-fit) and `viewportZoomFactor`, with strict single-mode validation and real error reporting. (#86, thanks @acercyc)
- **Dark mode**: the canvas page chrome follows the editor theme and persists it across reloads. (#89, thanks @danielsvane)

### Unreleased — Two-Way Wireframing

The canvas stops being a one-way output and becomes a shared design surface: the agent draws a UI, a person marks it up in the browser, and the agent reads both the markup and the resulting interface back.

**Semantic wireframe reading** — `wireframe` / `describe_wireframe` reads the canvas as a user interface rather than as a list of shapes:

- **Screens and nesting** — elements are nested under the smallest element containing them, so a card inside a screen comes out as a tree. Screens are named from their own heading or header bar.
- **Component roles** — `button`, `input`, `heading`, `header`, `footer`, `sidebar`, `card`, `checkbox`, `list-item`, `divider`, `avatar`, `chart`, `table`, … inferred from geometry, fill and wording. Inference is marked `?` when uncertain and every entry carries its raw type and size, so the reading can always be overridden.
- **Declared roles** — set `"role": "chart"` on a shape and the reader takes your word for it, unmarked. Inference reads a label that says what a thing *is* ("Revenue chart", "12 rows"), but a dashboard usually labels a plot with what it *shows* ("PSI per feature · 0.25 line") — no general word list can recover that, so declare it.
- **Reading order** — children numbered top-to-bottom, left-to-right within a row (`3.`, `3.1.`), which is both how a person reads the screen and the order to generate markup in.
- **Navigation flows** — arrows crossing from one screen to another become `button "Continue" [submit] → screen "Dashboard" [s2]`.
- **Live annotations** — human markup currently on the canvas, each attached to the component it refers to.
- Reading a flowchart this way is detected and flagged rather than silently mislabelled.

**The review loop**

- **Change tracking**: every mutation bumps a canvas revision and records who made it (`agent` or `human`). `POST /api/elements/sync` now *reconciles* per element instead of clearing and rewriting the store, so a person's edits are detectable at all — previously any hand edit made the whole scene look brand new. A sync that carries no elements against a canvas that holds some is refused (409) unless it sends `"allowEmpty": true`: the handler deletes whatever a payload leaves out, and a page that had failed to load once deleted a whole drawing that way.
- **`changes` / `get_canvas_changes`**: what changed since a given revision, phrased in design terms — *moved down 60px*, *resized 360x52 → 360x64*, *text "Continue" → "Log in"*.
- **Markup attribution**: sticky notes, circled shapes, scribbles and arrows a person adds are attributed to the element they refer to, so feedback arrives attached to its subject rather than as an orphan text element at some coordinate. Background panels are treated as structure and never absorb a nearby note.
- **`watch` / `wait_for_changes`**: long-poll that blocks until someone edits the canvas, with a settle window so a whole round of markup returns as one batch.
- Diffing runs over a canonical projection of each element, so Excalidraw's own renormalization (a shape's label becoming a bound text child, `seed`/`versionNonce` churn) never surfaces as a phantom human edit.

**Added** — **drawing conventions** (`skills/excalidraw-skill/references/wireframe-conventions.md`): the other half of the contract. Reading rules were documented; drawing rules were re-derived from scratch every session, which is why the two dashboards above were drawn with 12+ undeclared placeholders. The doc pins the layout grid (1160 frame, 32 inset, 1096 content, 16 gutter — so columns are 540/354/262 and always add up), the palette split that makes inference work (structure neutral, interactive coloured — colour a card and it becomes a `button`; leave a button white and it becomes an `input`), per-component geometry recipes, and the rule that every chart/table/image placeholder gets a declared role. Its premise: **a wireframe is done when `wireframe` reads it back as what you meant**, not when the screenshot looks right — those are different bars, and the reading is the one that gets generated from.

**Added** — **`chart` and `table` roles, and declared roles**: dashboard content used to collapse into the generic `shape` role — 12+ plot and table placeholders across two real dashboards read as bare `shape ... rectangle 912x190`. Labels mentioning a chart or a table ("Revenue chart", "12 rows of orders") are now inferred, and `"role": "chart"` on any shape is taken verbatim for the far more common case where a plot is labelled with what it shows rather than what it is. A declared role survives a human editing the canvas.

**Fixed** — **a wide table read as a text field**: any bordered, control-height box became `input?`, so a 512x56 table of column headers was reported as somewhere to type. A field is prompted tersely or not at all, so a caption longer than four words now vetoes the reading — chosen over a width or aspect-ratio ceiling, either of which would have demoted a legitimate full-bleed search bar.

**Fixed** — **styleable shape labels**: `fontSize` / `fontFamily` / `textAlign` / `verticalAlign` passed alongside a shape's `text` were dropped on the way to Excalidraw, so every label rendered in the default font while the element still reported the size that was asked for. They now follow the text into the label, on create and on update, and relabelling a shape keeps the styling it already had.

### v1.1 — CLI-First

- **First-class CLI**: every capability is now a composable command — `excalidraw-canvas add|query|describe|screenshot|export|import|mermaid|snapshot|arrange|share|...` — JSON on stdout, meaningful exit codes. Also installed as the `excalidraw-canvas` alias.
- **Zero-setup**: canvas-driving CLI commands and the MCP server **auto-start the canvas server** if it isn't running (closes #66). Opt out with `EXCALIDRAW_NO_AUTOSTART=1`.
- **`apply`**: multi-op patches (`{"create":[...],"update":[{"id":"a","set":{...}}],"delete":[...]}`) in a single invocation.
- **`install-skill`**: `excalidraw-canvas install-skill --dir <skills-root>` copies the portable agent skill into the directory your agent chooses (project or global), cleanly replacing older versions.
- **Skill is now CLI-first** and no longer needs a cloned repo or configured MCP server to work.
- **Typed queries**: `query --filter locked=true --filter label.text=API` — booleans, numbers, and nested keys work.
- **Internals**: shared core library (`src/core/`) behind both the CLI and MCP server; canvas `groupIds` are the source of truth for grouping (ungroup now works across restarts); `node-fetch` dropped; MCP version metadata derived from `package.json`; canvas server writes a pidfile and shuts down cleanly.

## Installation

The only prerequisite is **Node.js ≥ 20**.

### Easiest: let your agent install it

Copy this into your coding agent — it installs the portable skill into the project/global skill directory that agent already knows how to use, then verifies it by drawing a test diagram:

```text
Install the Excalidraw canvas toolkit so you can draw diagrams for me:

1. Choose the right skill directory for this agent and scope (project or global).
2. Run: excalidraw-canvas install-skill --dir <that-skills-directory>
3. Read the installed excalidraw-skill/SKILL.md so you know the drawing workflow.
4. Start the canvas with: excalidraw-canvas start
   then tell me I can open http://127.0.0.1:3000 to watch you draw (optional).
5. Draw a small test diagram — two labeled boxes connected by an arrow — take a
   screenshot, and show me the result to confirm everything works.
```

### Manual install

| You are... | Install with | Then |
|---|---|---|
| **Modern coding agent** | `excalidraw-canvas install-skill --dir <skills-root>` | Let the agent choose project/global scope and its skill root |
| **Claude Code shortcut** | `excalidraw-canvas install-skill` | Installs to `~/.claude/skills` for backward compatibility |
| **Codex shortcut** | `excalidraw-canvas install-skill --target codex` | Installs to `~/.codex/skills` for backward compatibility |
| **MCP client user** (Claude Desktop, Cursor, ...) | Add the npx config below | See [Configure MCP Clients](#configure-mcp-clients) |
| **CLI user / scripting** | Nothing — `excalidraw-canvas <command>` | See [CLI Reference](#cli-reference) |
| **Contributor / from source** | `git clone` + `npm ci` + `npm run build` | See [Quick Start (From Source)](#quick-start-from-source) |

There is no separate server setup: any drawing command auto-starts the local canvas server on `http://127.0.0.1:3000`.

### 60-Second Quick Start (CLI)

No clone, no config:

```bash
# start the canvas (drawing commands auto-start it too) and open it
excalidraw-canvas start
open http://127.0.0.1:3000   # optional: watch live (only mermaid needs the tab)

# draw something
echo '[
  {"id":"api","type":"rectangle","x":100,"y":100,"width":160,"height":80,"text":"API Server","backgroundColor":"#a5d8ff"},
  {"id":"db","type":"rectangle","x":400,"y":100,"width":160,"height":80,"text":"Database","backgroundColor":"#99e9f2"},
  {"type":"arrow","x":0,"y":0,"startElementId":"api","endElementId":"db","text":"SQL"}
]' | excalidraw-canvas add

# let your agent see its work
excalidraw-canvas describe
excalidraw-canvas screenshot --out diagram.png

# diagrams as repo artifacts
mkdir -p docs
excalidraw-canvas export --out docs/architecture.excalidraw

# or straight into an Obsidian vault (.md extension → Obsidian Excalidraw plugin format)
excalidraw-canvas export --out ~/vault/diagrams/architecture.excalidraw.md
```

Give your agent the full playbook:

```bash
excalidraw-canvas install-skill --dir <skills-root>
excalidraw-canvas install-skill --print-source  # inspect bundled source path
```

> **Security note:** The canvas server binds `127.0.0.1` only by default. If you expose it on a network interface (`HOST=0.0.0.0`), put network-level access controls in front — the API has no built-in authentication.
>
> In this fork the server answers its own page and local tools only: a request whose `Origin` is another site's page, or whose `Host` is not a name for this machine, gets HTTP 403, on the API and on the WebSocket. Programs that are not browsers send no `Origin` and are not affected, so this is not authentication: any local program can still call the API.

## Agent Skill

The skill at `skills/excalidraw-skill/` teaches agents the full workflow — layout planning, the screenshot-verify-fix quality loop, arrow routing, anti-patterns, snapshots, and file I/O. It works through the CLI (preferred, zero setup), MCP tools (if configured), or raw REST — in that order.

```bash
excalidraw-canvas install-skill --dir <skills-root>
```

The command copies the bundled `excalidraw-skill/` directory into `<skills-root>/excalidraw-skill`. Let your agent choose whether that root should be project-level or global. Re-running `install-skill` upgrades in place — it replaces the target directory, so files removed upstream don't linger.

Where the skill shines:

- **Diagrams as code artifacts**: export `.excalidraw` files into the repo, commit them, re-import + refine when the architecture changes.
- **Obsidian vaults**: export with a `.excalidraw.md` extension and the file opens natively in the [Obsidian Excalidraw plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin) — no compatibility-mode warning, block references and sync work; `import` reads both plain and lz-string-compressed vault files back.
- **Self-verifying diagrams**: the agent screenshots its own work and fixes truncation/overlap before calling it done.
- **No-MCP environments**: CI jobs, plain shells, and frameworks get the same capabilities through the CLI.

## CLI Reference

`excalidraw-canvas <command>` or (after `npm link   # from this repo`) `excalidraw-canvas <command>`.

Conventions: JSON results on stdout — except `describe` (plain text by design) and raw-content output when `--out` is omitted (`export` prints the scene JSON, `screenshot --format svg` prints SVG). Diagnostics on stderr. Exit codes: `0` ok, `1` error, `2` usage, `3` canvas unreachable, `4` browser tab required (only `mermaid` and `screenshot --renderer browser`). Canvas URL from `EXPRESS_SERVER_URL` or `--url`. Canvas-driving commands auto-start the server; `status` only reports current state. Explicit `start` overrides the `EXCALIDRAW_NO_AUTOSTART=1` opt-out (it's user intent, not auto-start).

| Command | Description |
|---------|-------------|
| `start` / `stop` / `status` | Manage the canvas server (detached; `stop` identity-checks the live server via `/health` before signaling) |
| `add [file\|-]` | Batch-create elements from a JSON array (file or stdin); `--one '{...}'` for a single element |
| `apply [file\|-]` | One-call multi-op patch: `{"create":[...],"update":[{"id":"a","set":{...}}],"delete":["id"]}` |
| `get <id>` / `delete <id...>` | Read / remove elements |
| `update <id> --set '{...}'` | Update an element |
| `query` | `--type`, `--bbox x0,y0,x1,y1`, `--filter k=v` (typed, nested keys), `--filter-json '{...}'` |
| `describe` | AI-readable scene summary (plain text) |
| `wireframe [--json]` | Read the canvas as a UI: screens, nesting, component roles, reading order, navigation flows, annotations |
| `changes [--since <rev>]` | What changed on the canvas and who changed it, in design terms (plain text; `--json` for raw records) |
| `watch [--timeout 60]` | Block until someone edits the canvas, then report (`--since`, `--settle`, `--json`) |
| `screenshot` | Render the canvas headless (no browser tab): `--out f.png\|f.svg`, `--format png\|svg`, `--scale 1-4`, `--dark`, `--padding N`, `--no-background`, `--ids a,b`, `--frame <id>`, `--no-embed-fonts`; `--renderer browser` uses an open tab instead |
| `render [file\|-]` | Render a `.excalidraw` / `.excalidraw.md` file to PNG/SVG offline — no canvas server, same flags as `screenshot` |
| `export [--out f.excalidraw] [--format json\|obsidian]` / `import [file\|-] [--replace]` | Scene file I/O — a `.md` out path writes Obsidian's `.excalidraw.md` format; `import` reads it back |
| `mermaid [file\|-]` | Mermaid → canvas (browser tab required) |
| `snapshot save\|list\|restore <name>` | Named snapshots |
| `arrange align\|distribute\|group\|ungroup\|lock\|unlock\|duplicate` | Layout ops (`--ids a,b,c`, `--to left\|horizontal\|...`) |
| `share` | Encrypted upload → shareable excalidraw.com URL |
| `clear --yes` | Wipe the canvas |
| `install-skill [--dir <skills-root>]` | Install the portable agent skill |

Labels and arrow bindings use the agent-friendly format everywhere in the CLI: `"text"` on any shape, `"startElementId"`/`"endElementId"` on arrows — normalization is automatic. Label typography (`fontSize`, `fontFamily`, `textAlign`, `verticalAlign`) passed next to `text` follows the text into the label; for label colour pass the label explicitly (`"label": {"text": "Save", "strokeColor": "#d03b3b"}`), since a shape's own `strokeColor` paints its border. For a native frame, add a `"type":"frame"` element with a `"name"` and set `"frameId"` on its children.

## Headless Rendering

Since v2.1, `screenshot`, `export_to_image` and `get_canvas_screenshot` render without a browser. Inside the canvas server, the scene is prepared with the canvas tab's own code (label sizing, wrapping and centering, defaults) and Excalidraw's own `exportToSvg` draws it under Node (a small jsdom shim supplies the DOM it expects, and text is measured with the bundled fonts' real glyph widths); [resvg](https://github.com/thx/resvg-js) rasterizes the SVG to PNG. The output is what the Excalidraw canvas draws — same SVG structure as a browser export, text within half a pixel — and it is deterministic: an unchanged scene renders to byte-identical SVG and PNG, so committed images stay diff-clean.

- **Fonts**: Excalifont, Virgil, Cascadia Code and Liberation Sans ship as TTFs in `assets/fonts` (all SIL OFL 1.1; see `assets/fonts/LICENSES.md`). SVGs embed the faces they use, so they look right in browsers, GitHub and editors. Nunito, Lilita One and Comic Shanns render with the closest bundled face for now. Text in other scripts (CJK, emoji) falls back to the machine's fonts, with a warning.
- **Options** (CLI flags / REST body / MCP params): `background`, `dark`, `scale` 1–4 (PNG), `padding`, `elementIds` or `frameId` to render a subset, `embedFonts`. `EXCALIDRAW_RENDER_MAX_DIM` (default 8192) caps the PNG's largest side.
- **`--renderer browser`** asks an open canvas tab to render instead (the pre-2.1 path). Useful for a second opinion; it is slower and the tab's unsynced edits are discarded first.
- **Offline**: `render docs/arch.excalidraw --out docs/arch.png` needs no canvas server at all — a natural fit for CI jobs that keep images next to committed diagrams.
- **Still browser-bound**: Mermaid conversion (`mermaid`, `create_from_mermaid`) and `set_viewport`.

The renderer bundle is built by `npm run build:server` (`dist/render/excalidraw-node.mjs`); `npm run test:render` exercises it without a browser.

## Configure MCP Clients

The MCP server runs over stdio. Since v1.1 the simplest config is `npx` — no clone, no absolute paths, and the canvas auto-starts:

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EXPRESS_SERVER_URL` | URL of the canvas server | `http://127.0.0.1:3000` |
| `ENABLE_CANVAS_SYNC` | Enable real-time canvas sync | `true` |
| `EXCALIDRAW_NO_AUTOSTART` | Set `1` to disable canvas auto-start | (unset) |
| `EXCALIDRAW_EXPORT_DIR` | Base directory MCP file exports may write to | current working dir |
| `EXCALIDRAW_RENDER_MAX_DIM` | Largest side of a headless PNG, in pixels | `8192` |
| `PORT` / `HOST` | Canvas server bind address | `3000` / `127.0.0.1` |
| `CANVAS_ALLOWED_ORIGINS` | Other page origins allowed to call the canvas, comma-separated (for example `http://localhost:5173` for `npm run dev`) | (unset: the canvas's own page only) |
| `LOG_LEVEL` | Log verbosity (`error`, `warn`, `info`, `debug`) | `info` |
| `LOG_FILE_PATH` | Log file location | `~/Library/Logs/excalidraw-mcp.log` (macOS), `$XDG_STATE_HOME/excalidraw-mcp/excalidraw.log` (Linux), `%LOCALAPPDATA%\Excalidraw-MCP\excalidraw.log` (Windows) |

---

### Claude Desktop

Config location:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**npx (recommended)**
```json
{
  "mcpServers": {
    "excalidraw": {
      "command": "npx",
      "args": ["-y", "mcp-excalidraw-server"]
    }
  }
}
```

**Local (node)**
```json
{
  "mcpServers": {
    "excalidraw": {
      "command": "node",
      "args": ["/absolute/path/to/mcp_excalidraw/dist/index.js"],
      "env": {
        "EXPRESS_SERVER_URL": "http://127.0.0.1:3000",
        "ENABLE_CANVAS_SYNC": "true"
      }
    }
  }
}
```


---

### Claude Code

**npx (recommended)**
```bash
claude mcp add excalidraw --scope user -- excalidraw-canvas
```

> Tip: for coding agents, the skill + CLI often beats MCP config entirely — let the agent pick its skill root, then run `excalidraw-canvas install-skill --dir <skills-root>`.

**Local (node)** - User-level (available across all projects):
```bash
claude mcp add excalidraw --scope user \
  -e EXPRESS_SERVER_URL=http://127.0.0.1:3000 \
  -e ENABLE_CANVAS_SYNC=true \
  -- node /absolute/path/to/mcp_excalidraw/dist/index.js
```


**Manage servers:**
```bash
claude mcp list              # List configured servers
claude mcp remove excalidraw # Remove a server
```

---

### Cursor

Config location: `.cursor/mcp.json` in your project root (or `~/.cursor/mcp.json` for global config)

**npx (recommended)**
```json
{
  "mcpServers": {
    "excalidraw": {
      "command": "npx",
      "args": ["-y", "mcp-excalidraw-server"]
    }
  }
}
```


---

### Codex CLI

**npx (recommended)**
```bash
codex mcp add excalidraw -- excalidraw-canvas
```


**Manage servers:**
```bash
codex mcp list              # List configured servers
codex mcp remove excalidraw # Remove a server
```

---

### OpenCode

Config location: `~/.config/opencode/opencode.json` or project-level `opencode.json`

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "excalidraw": {
      "type": "local",
      "command": ["npx", "-y", "mcp-excalidraw-server"],
      "enabled": true
    }
  }
}
```

---

### Antigravity (Google)

Config location: `~/.gemini/antigravity/mcp_config.json`

```json
{
  "mcpServers": {
    "excalidraw": {
      "command": "npx",
      "args": ["-y", "mcp-excalidraw-server"]
    }
  }
}
```

---

### Notes

- **In-memory storage**: The canvas server stores elements in memory. Restarting the server clears all elements — use `export` / `snapshot` for persistence.

## MCP Tools (29 Total)

| Category | Tools |
|---|---|
| **Element CRUD** | `create_element`, `get_element`, `update_element`, `delete_element`, `query_elements`, `batch_create_elements`, `duplicate_elements` |
| **Layout** | `align_elements`, `distribute_elements`, `group_elements`, `ungroup_elements`, `lock_elements`, `unlock_elements` |
| **Scene Awareness** | `describe_scene`, `describe_wireframe`, `get_canvas_screenshot` |
| **Review Loop** | `get_canvas_changes`, `wait_for_changes` |
| **File I/O** | `export_scene`, `import_scene`, `export_to_image`, `export_to_excalidraw_url`, `create_from_mermaid` |
| **State Management** | `clear_canvas`, `snapshot_scene`, `restore_snapshot` |
| **Viewport** | `set_viewport` |
| **Design Guide** | `read_diagram_guide` |
| **Resources** | `get_resource` |

Full schemas are discoverable via `tools/list` or in `skills/excalidraw-skill/references/cheatsheet.md`.

Viewport group focus can tune framing with `viewportZoomFactor`:

```json
{
  "scrollToElementIds": ["id1", "id2", "id3"],
  "viewportZoomFactor": 0.85
}
```

`scrollToElementIds` zooms to fit every requested element, while `scrollToElementId` centers one element without changing the current zoom. Specify only one viewport mode per request. `viewportZoomFactor` accepts values greater than 0 and at most 1.

## Quick Start (From Source)

From source (Node >= 20):

```bash
npm ci
npm run build
PORT=3000 npm run canvas          # canvas server (terminal 1)
node dist/index.js                # MCP server over stdio (terminal 2, usually launched by your MCP client)
node dist/bin.js status           # or drive the CLI straight from the build
```

To put `excalidraw-canvas` on your PATH so the agent skill's commands resolve to
*this* build rather than upstream's npm package:

```bash
npm link
excalidraw-canvas status
```

Docker images are not published for this fork; see [FORK.md](FORK.md).

## Testing

### CLI Smoke Test

```bash
excalidraw-canvas start
excalidraw-canvas status
excalidraw-canvas add --one '{"type":"rectangle","x":100,"y":100,"width":300,"height":200}'
excalidraw-canvas describe
```

### Canvas Smoke Test (HTTP)

```bash
curl http://127.0.0.1:3000/health
```

### Regression Checks

`npm test` builds the server and runs four suites, each also available on its own:

```bash
npm test
npm run test:mcp      # MCP stdio wire protocol (see below)
npm run test:bind     # default loopback bind, duplicate-start refusal
npm run test:render   # headless renderer, export order keys, scene-prep stability
npm run test:state    # atomic import and snapshot restore, sync validation
```

### Canvas Browser Regression Tests

These Chromium tests build the app and start an isolated localhost server. They
cover frame reload/reconnect, mixed scenes, failed-load sync protection, stale
responses, clearing/deletion, Mermaid imports, SVG export, dropped images, and
text measurement after fonts load. They refuse to reuse an existing server; set
`CANVAS_TEST_PORT` if port 51910 is occupied.

```bash
npx playwright install chromium
npm run type-check:frontend
npm run test:canvas
```

### MCP Stdio Wire Test

Drives `dist/index.js` with raw JSON-RPC frames and checks both protocol eras:
`server/discover`, tool calls sent without any handshake, refusal of unsupported
protocol revisions and malformed `_meta` envelopes, and the legacy `initialize`
path.

```bash
npm run test:mcp
```

### MCP Smoke Test (MCP Inspector)

List tools:
```bash
npx @modelcontextprotocol/inspector --cli \
  -e EXPRESS_SERVER_URL=http://127.0.0.1:3000 \
  -e ENABLE_CANVAS_SYNC=true -- \
  node dist/index.js --method tools/list
```

Create a rectangle:
```bash
npx @modelcontextprotocol/inspector --cli \
  -e EXPRESS_SERVER_URL=http://127.0.0.1:3000 \
  -e ENABLE_CANVAS_SYNC=true -- \
  node dist/index.js --method tools/call --tool-name create_element \
  --tool-arg type=rectangle --tool-arg x=100 --tool-arg y=100 \
  --tool-arg width=300 --tool-arg height=200
```

### Frontend Screenshots (agent-browser)

If you use `agent-browser` for UI checks:
```bash
agent-browser install
agent-browser open http://127.0.0.1:3000
agent-browser wait --load networkidle
agent-browser screenshot /tmp/canvas.png
```

## FAQ

### How is this different from the official Excalidraw MCP?

The [official Excalidraw MCP](https://github.com/excalidraw/excalidraw-mcp) is a chat widget: you prompt, it streams a diagram into the conversation (the model gets two tools). This project is a **workbench for coding agents**: a persistent local canvas with element-level create/read/update/delete, layout tools, screenshots the model can see, snapshots, and `.excalidraw` file I/O — driveable via CLI, MCP, or REST. See the [full comparison table](#how-we-differ-from-the-official-excalidraw-mcp).

### Which AI tools does it work with?

Claude Code, Claude Desktop, Cursor, Codex CLI, OpenCode, and Google Antigravity are documented below — but any agent that can run shell commands can use the CLI, any MCP client can use the MCP server, and anything else (LangChain, custom apps) can use the REST API.

### Can the AI actually see the diagram it drew?

Yes — that's the core feature. `describe` returns a structured text summary (ids, positions, labels, connections) and `screenshot` returns a rendered PNG. Agents use both to catch truncated labels, overlaps, and bad arrow routing, then fix them element by element.

### Do I need a browser open?

No. Screenshots and PNG/SVG exports render headless inside the canvas server (see [Headless Rendering](#headless-rendering)), and everything else — creating, querying, updating elements, `.excalidraw` files — never needed one. Only two things still need an open tab: Mermaid conversion (it lays out in the browser) and viewport control (it moves a camera). The CLI exits with code `4` and tells you when that is the case. Opening the URL is still the way for a human to watch the agent draw.

### Are my diagrams persistent?

The canvas is in-memory by design (restart = blank canvas). Persist by exporting `.excalidraw` files into your repo (`export --out docs/architecture.excalidraw`) or with named `snapshot`s while working. Re-`import` a file to keep refining it later.

### Are excalidraw.com share links private?

`share` encrypts the scene locally with AES-GCM before uploading; the decryption key is only in the URL fragment, which excalidraw.com's server never sees. Anyone you give the full link to can view the diagram.

### Does it need an API key or cloud service?

No API key is required. Core drawing runs locally under MIT license. Outbound traffic is limited to the canvas page loading Excalidraw's fonts from the esm.sh CDN and the optional `share` upload to excalidraw.com. The CLI, MCP server and headless renderer make no other network calls.

### Can I use it without configuring MCP?

Yes — that's the recommended path for coding agents: `excalidraw-canvas install-skill --dir <skills-root>` and the agent drives everything through the CLI. MCP configuration is only needed for chat clients like Claude Desktop.

## Troubleshooting

- **CLI exit code 3** (canvas unreachable): the server is not running for an inspecting command such as `status`, auto-start is disabled (`EXCALIDRAW_NO_AUTOSTART=1`), or `EXPRESS_SERVER_URL` points at a non-loopback host. Run `start` explicitly or fix the env.
- **CLI exit code 4** (browser required): only `mermaid` and `screenshot --renderer browser` need an open tab — open `http://127.0.0.1:3000` in a browser and retry, or drop `--renderer browser` to render headless.
- **Headless PNG shows boxes instead of CJK/emoji text**: the bundled fonts cover Latin scripts; for other scripts resvg falls back to the machine's fonts (a warning is printed). Install a CJK font on the machine running the canvas server.
- **Canvas not updating**: confirm `EXPRESS_SERVER_URL` points at the running canvas server (`status` shows the URL in use).
- **HTTP 403, "this canvas answers its own page and local tools only"**: a page on another origin called the canvas — another port, a file opened from disk, or the Vite dev server. List that origin in `CANVAS_ALLOWED_ORIGINS` and restart the canvas.
- **Canvas page shows plain fonts offline**: the page loads Excalidraw's hand-drawn fonts from the esm.sh CDN, so without internet access it falls back to system fonts. Headless screenshots and `render` use the bundled fonts and are unaffected.
- **Something else looks wrong**: the server log has the details; its location is in [Environment Variables](#environment-variables) (`LOG_FILE_PATH`).

## Known Issues / TODO

- [ ] **Persistent storage**: Elements are stored in-memory — restarting the server clears everything. Use `export` / snapshots as a workaround.
- [ ] **Mermaid conversion requires a browser**: `mermaid` / `create_from_mermaid` lay out the diagram in the frontend. Image export and screenshots are headless since v2.1.
- [ ] **Canvas page fonts come from a CDN**: serving them from the canvas server would make the page work fully offline.

Contributions welcome!

## Development

```bash
npm run type-check
npm run build
npm run cli -- status      # run the CLI from the local build
npm run sync:skills        # after editing skills/excalidraw-skill, sync the repo-local agent copy
```

Bug reports and pull requests are welcome on [GitHub issues](https://github.com/yctimlin/mcp_excalidraw/issues). If this project helps you, a ⭐ helps others find it.

## License

[MIT](LICENSE) © [yctimlin](https://github.com/yctimlin) — not affiliated with the Excalidraw team. [Excalidraw](https://github.com/excalidraw/excalidraw) is its own MIT-licensed project; this toolkit builds on it with love.

**Links:** [npm package](https://www.npmjs.com/package/mcp-excalidraw-server) · [GitHub](https://github.com/yctimlin/mcp_excalidraw) · [Issues](https://github.com/yctimlin/mcp_excalidraw/issues) · [Demo video](https://youtu.be/ufW78Amq5qA)

If you're interested in what comes next, follow me on X: [@ycalintim](https://x.com/ycalintim).
