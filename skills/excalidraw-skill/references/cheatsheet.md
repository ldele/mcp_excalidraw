# Excalidraw Skill Cheatsheet

## Defaults

- Canvas base URL: `EXPRESS_SERVER_URL` (default `http://127.0.0.1:3000`); CLI also accepts `--url <canvasUrl>`
- Canvas health: `GET /health` or `excalidraw-canvas status`
- Auto-start: any canvas-touching CLI command starts the server if it's down (opt out with `EXCALIDRAW_NO_AUTOSTART=1`)

## CLI Reference

`excalidraw-canvas <command>` (available after `npm link` in the repo). Not on npm: see FORK.md.
JSON results on stdout — except `describe` (plain text) and raw-content output when `--out` is omitted (`export` scene JSON, `screenshot --format svg`). Diagnostics on stderr. Exit codes: 0 ok, 1 error, 2 usage, 3 canvas unreachable, 4 browser tab required. Explicit `start` overrides `EXCALIDRAW_NO_AUTOSTART=1`.

### Server

| Command | Description |
|---------|-------------|
| `start` | Start the canvas server (detached); prints URL + pid |
| `stop` | Stop the canvas server (identity-checked via `/health` — never signals foreign services) |
| `status` | Health, element count, connected browser tabs |

### Elements

| Command | Description |
|---------|-------------|
| `add [file\|-]` | Batch create from a JSON array (file, `-`, or piped stdin); `--one '{...}'` for a single element |
| `apply [file\|-]` | Multi-op patch `{"create":[...],"update":[{"id":"a","set":{...}}],"delete":["id",...]}` in one call |
| `get <id>` | Get one element |
| `query` | `--type rectangle` `--bbox x0,y0,x1,y1` `--filter locked=true` (typed; nested keys like `label.text=API` work) `--filter-json '{...}'` |
| `update <id> --set '{...}'` | Update one element |
| `delete <id> [...]` | Delete elements |

### Scene

| Command | Description |
|---------|-------------|
| `describe` | AI-readable scene summary (ids, positions, labels, connections) — plain text |
| `wireframe [--json] [--score]` | Read the canvas as a UI: screens, nesting, component roles, reading order, navigation flows, annotations — plain text. `--score` emits only the pre-flight counts as JSON (`fallbacks`, `inferred`, `unnamedScreens`, `orphans`); `--json` carries them under `score` |
| `screenshot` | PNG/SVG capture; `--out f.png`, `--format png\|svg`, `--no-background`; PNG without `--out` → temp file path in JSON, SVG without `--out` → raw SVG (**browser tab required**) |
| `export [--out f.excalidraw] [--format json\|obsidian]` | Scene as .excalidraw JSON (stdout without `--out`); a `.md` out path writes Obsidian's .excalidraw.md format |
| `import [file\|-] [--replace]` | Import .excalidraw JSON or Obsidian .excalidraw.md (merge by default) |
| `mermaid [file\|-]` | Render Mermaid onto the canvas (**browser tab required**) |
| `share` | Encrypted upload → shareable excalidraw.com URL |
| `clear --yes` | Wipe the canvas |
| `snapshot save\|list\|restore [name]` | Named canvas snapshots |

### Review Loop (two-way)

| Command | Description |
|---------|-------------|
| `changes [--since <rev>] [--json]` | What changed and who changed it, in design terms — plain text (defaults to everything since the server started) |
| `watch [--since <rev>] [--timeout 60] [--settle 1.5] [--json]` | Block until someone edits the canvas, then print the same report (defaults to waiting for what happens *next*) |

Every mutation bumps a canvas **revision**; each report ends with `Cursor: rev N`.
Pass that back as `--since N` to see only what is newer. `--timeout` caps at 240s.

### Arrange

| Command | Description |
|---------|-------------|
| `arrange align --ids a,b,c --to left\|center\|right\|top\|middle\|bottom` | Align (≥2 ids) |
| `arrange distribute --ids a,b,c --to horizontal\|vertical` | Even spacing (≥3 ids) |
| `arrange group --ids a,b` / `arrange ungroup --group <groupId>` | Group membership lives on element `groupIds` |
| `arrange lock\|unlock --ids a,b` | Toggle edit lock |
| `arrange duplicate --ids a,b [--offset 20,20]` | Clone with offset |

### Meta

| Command | Description |
|---------|-------------|
| `install-skill --dir <skills-root>` | Install this skill into an agent-chosen project/global skills root (replaces any existing copy) |
| `help [command]`, `--version` | Usage and version |

## MCP Tools (29 total)

### Element CRUD

| Tool | Description | Required params |
|------|-------------|-----------------|
| `create_element` | Create shape/text/arrow/line | `type`, `x`, `y` |
| `get_element` | Get single element by ID | `id` |
| `update_element` | Update element properties | `id` |
| `delete_element` | Delete element | `id` |
| `query_elements` | Query by type/filters | (optional) `type`, `filter`, `bbox` |
| `batch_create_elements` | Create many at once | `elements[]` |
| `duplicate_elements` | Clone with offset | `elementIds[]`, (optional) `offsetX`, `offsetY` |

### Layout & Organization

| Tool | Description | Required params |
|------|-------------|-----------------|
| `align_elements` | Align to left/center/right/top/middle/bottom | `elementIds[]`, `alignment` |
| `distribute_elements` | Even spacing horizontal/vertical | `elementIds[]`, `direction` |
| `group_elements` | Group elements | `elementIds[]` |
| `ungroup_elements` | Ungroup | `groupId` |
| `lock_elements` | Lock elements | `elementIds[]` |
| `unlock_elements` | Unlock elements | `elementIds[]` |

### Scene Awareness (Iterative Refinement)

| Tool | Description | Required params |
|------|-------------|-----------------|
| `describe_scene` | AI-readable scene description (types, positions, labels, connections, bounding box) — best for diagrams | (none) |
| `describe_wireframe` | Read the canvas as a UI: screens, containment tree, inferred component roles (`?` = low confidence), reading order, navigation flows, live annotations | (none) |
| `get_canvas_screenshot` | Returns PNG image of canvas for visual verification | (optional) `background` |
| `get_resource` | Get scene/library/theme/elements | `resource` |
| `get_canvas_changes` | What changed since you last looked, incl. human edits; attributes markup to the element it refers to | (optional) `since` |
| `wait_for_changes` | Block until a human edits the canvas, then return the same report | (optional) `since`, `timeoutSeconds`, `settleSeconds` |

### File I/O & Export

| Tool | Description | Required params |
|------|-------------|-----------------|
| `export_scene` | Export to .excalidraw JSON (a `.md` filePath → Obsidian .excalidraw.md) | (optional) `filePath` |
| `import_scene` | Import from .excalidraw JSON or Obsidian .excalidraw.md | `mode` ("replace"\|"merge"), `filePath` or `data` |
| `export_to_image` | Export to PNG/SVG (needs browser) | `format` ("png"\|"svg"), (optional) `filePath`, `background` |
| `export_to_excalidraw_url` | Upload & get shareable excalidraw.com URL | (none) |

### State Management

| Tool | Description | Required params |
|------|-------------|-----------------|
| `clear_canvas` | Remove all elements | (none) |
| `snapshot_scene` | Save named snapshot | `name` |
| `restore_snapshot` | Restore from snapshot | `name` |

### Viewport & Camera

| Tool | Description | Required params |
|------|-------------|-----------------|
| `set_viewport` | Control camera: zoom-to-fit all/selected elements, center one element without changing zoom, or manual zoom/scroll (needs browser); specify one mode per request | (optional) `scrollToContent`, `scrollToElementIds`, `viewportZoomFactor` (0, 1], `scrollToElementId`, `zoom`, `offsetX`, `offsetY` |

### Design Guide

| Tool | Description | Required params |
|------|-------------|-----------------|
| `read_diagram_guide` | Get design best practices (colors, sizing, layout, anti-patterns) | (none) |

### Conversion

| Tool | Description | Required params |
|------|-------------|-----------------|
| `create_from_mermaid` | Mermaid diagram to Excalidraw | `mermaidDiagram` |

Notes:
- **CLI + MCP**: Set `text` on shapes to label them (auto-converts to `label.text`). Use `startElementId`/`endElementId` on arrows.
- **Label typography**: `fontSize` / `fontFamily` / `textAlign` / `verticalAlign` passed next to `text` follow the text into the label. To colour the label text, pass the label object explicitly — `"label": {"text": "Save", "strokeColor": "#d03b3b"}` — because a shape's own `strokeColor` paints its border, not its caption.
- **Wireframe role**: `"role": "chart"` (or `table`, `button`, `card`, …) declares what a shape is; `wireframe` reports a declared role verbatim, without the `?`. Worth setting on every plot and table placeholder — their labels describe what they show, which inference can't read as "this is a chart".
- **CLI `apply.update`**: Update entries can use either direct fields (`{"id":"a","x":120}`) or a `set` object (`{"id":"a","set":{"x":120}}`). Do not mix both forms in one update entry.
- **Raw REST**: Use `"label": {"text": "..."}` for shape labels. Use `"start": {"id": "..."}` / `"end": {"id": "..."}` for arrow binding. (Different format!)
- `fontFamily` must be a string (e.g. `"1"`, `"helvetica"`) or omitted — do NOT pass a number.
- `points` accepts both `[[x,y]]` tuples and `[{x,y}]` objects.
- **Curved arrows**: Use `"roundness": {"type": 2}` with 3+ points for smooth curves. Use `"elbowed": true` for right-angle routing.
- Prefer creating shapes first, then arrows, then alignment/grouping.

## Canvas REST API (HTTP)

### Elements

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/elements` | List all elements |
| `GET` | `/api/elements/:id` | Get element by ID |
| `POST` | `/api/elements` | Create element |
| `PUT` | `/api/elements/:id` | Update element |
| `DELETE` | `/api/elements/:id` | Delete element |
| `DELETE` | `/api/elements/clear` | Clear all elements |
| `GET` | `/api/elements/search?type=...` | Search with filters (exact string match + bbox) |
| `POST` | `/api/elements/batch` | Batch create |
| `POST` | `/api/elements/sync` | Frontend scene sync — reconciles per element and records human edits |
| `POST` | `/api/elements/from-mermaid` | Mermaid conversion via frontend |

### Changes (review loop)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/changes?since=N` | Change records after revision N: `{rev, truncated, reset, records[]}` |
| `GET` | `/api/changes/wait?since=N&timeout=60000&settle=1500` | Long-poll: resolves on the next change (or `timedOut: true`); `timeout` caps at 600000ms |

Each record is `{rev, kind: add|update|delete, id, origin: agent|human, at, elementType, label?, before?, after?}`.
`before`/`after` hold only the fields that differed, in canonical form.

### Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/export/image` | Request image export (needs frontend) |
| `POST` | `/api/export/image/result` | Frontend posts export result back |

### Viewport

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/viewport` | Set viewport/camera; body may include `scrollToContent`, `scrollToElementIds`, `viewportZoomFactor`, `scrollToElementId`, `zoom`, `offsetX`, `offsetY` (needs frontend) |
| `POST` | `/api/viewport/result` | Frontend posts viewport result back |

### Snapshots

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/snapshots` | Save snapshot `{name}` |
| `GET` | `/api/snapshots` | List snapshots |
| `GET` | `/api/snapshots/:name` | Get snapshot by name |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check (`websocket_clients` = open browser tabs) |
| `GET` | `/api/sync/status` | Memory/WebSocket stats |

## Design Guide (quick version)

Stroke/fill pairs: `#e03131`/`#ffc9c9` red, `#2f9e44`/`#b2f2bb` green, `#1971c2`/`#a5d8ff` blue, `#9c36b5`/`#eebefa` purple, `#e8590c`/`#ffd8a8` orange, `#0c8599`/`#99e9f2` cyan, `#868e96`/`#e9ecef` gray.
Styling: `"fillStyle": "solid"` for crisp flat fills (default is sketchy hachure); `"strokeStyle": "dashed"` for zone borders / async arrows.
Sizing: shapes ≥ 120×60 with width ≥ `labelChars * 12`, fonts ≥ 16 (titles ≥ 20), gaps 40–80px (120px+ for labeled arrows), align to a 20px grid.
Order of work: background zones → primary shapes (with `text`) → arrows (bound via ids) → annotations → refine (align/distribute/screenshot).
MCP mode has the full guide behind the `read_diagram_guide` tool.

**Drawing a UI wireframe instead of a diagram?** Different rules — see `wireframe-conventions.md`. In short: frame at (120,120) 1160 wide, 32 inset, 1096 content, 16 gutter (so columns are 1096/540/354/262); structure neutral (`#14130f` ink, `#d7d5cc` border, `#ffffff` surface, `#fbfaf8` band) and interactive coloured (`#74c0fc`/`#1971c2` selected, `#dbeafe`/`#4dabf7` unselected); `"fillStyle": "solid"` always; declare `"role"` on every chart/table/image placeholder; verify with `wireframe`, not just `screenshot`.
