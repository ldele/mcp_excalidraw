---
name: excalidraw-skill
description: Excalidraw canvas toolkit for creating, editing, and refining diagrams and wireframes on a live canvas shared with a human. Use when an agent needs to (1) draw or lay out diagrams and UI wireframes, (2) iteratively refine them by describing the scene and screenshotting its own work, (3) collect design feedback by reading what a person changed or annotated on the canvas, (4) export/import .excalidraw files or PNG/SVG images, (5) save/restore canvas snapshots, (6) convert Mermaid to Excalidraw, or (7) perform element-level CRUD, alignment, distribution, grouping, duplication, and locking. Primary interface is the bundled CLI (excalidraw-canvas <command>) which auto-starts the canvas server; MCP tools and a REST API are equivalent alternatives.
---

# Excalidraw Skill

## Step 0: Pick an Interface

Three interfaces drive the same live canvas. Pick the first one that applies:

1. **MCP tools** — if `excalidraw/*` tools (e.g. `batch_create_elements`) are in your tool list, prefer them: results land directly in your context, and screenshots come back as images without touching disk.
2. **CLI** (default when no MCP tools are present):
   ```bash
   excalidraw-canvas <command>
   ```
   Any canvas-touching command **auto-starts the canvas server** on `http://127.0.0.1:3000`.

   > **Do not use `npx mcp-excalidraw-server`.** That name on npm belongs to the
   > upstream project this is forked from, and upstream has no `wireframe` or
   > `changes` command — so `npx` silently fetches a build without the features
   > this skill documents. This fork is private and unpublished. Make
   > `excalidraw-canvas` available with `npm link` from the repo (or call
   > `node <repo>/dist/bin.js` directly).
3. **REST API** (last resort, e.g. from application code): HTTP endpoints on `http://127.0.0.1:3000` — see `references/cheatsheet.md` for payloads. The server must already be running.

The canvas URL comes from `EXPRESS_SERVER_URL` (default `http://127.0.0.1:3000`). Remind the user to open that URL in a browser — screenshots, image export, mermaid conversion, and viewport control need an open tab (CLI exits with code 4 when it's missing).

### CLI Quick Reference

Results are JSON on stdout — except `describe` (plain text) and raw-content output when `--out` is omitted (`export` scene JSON, `screenshot --format svg`). Diagnostics on stderr. Exit codes: 0 ok, 1 error, 2 usage, 3 canvas unreachable, 4 browser tab required.

| Task | Command |
|------|---------|
| Start / stop / inspect server | `start`, `stop`, `status` |
| Create elements (batch) | `add elements.json` or `echo '[...]' \| add` or `add --one '{...}'` |
| Multi-op patch in one call | `apply patch.json` — `{"create":[...],"update":[{"id":"a","set":{...}}],"delete":[...]}` |
| Read one / query many | `get <id>`, `query [--type t] [--bbox x0,y0,x1,y1] [--filter k=v] [--filter-json '{...}']` |
| Update / delete | `update <id> --set '{...}'`, `delete <id> [...]` |
| Understand the scene | `describe` (plain-text summary: ids, positions, labels, connections) |
| Read a UI wireframe | `wireframe` — screens, nesting, component roles, reading order, navigation, annotations |
| See the scene | `screenshot [--out f.png]` (PNG without `--out` → temp file path in JSON; SVG without `--out` → raw SVG) |
| Read what the human changed | `changes [--since <rev>]` — additions, edits, deletions in design terms, with markup attributed to its subject |
| Wait for the human to edit | `watch [--timeout 60]` — blocks until someone touches the canvas, then reports |
| Layout operations | `arrange align\|distribute\|group\|ungroup\|lock\|unlock\|duplicate --ids a,b,c [--to left\|horizontal\|...]` |
| Scene files | `export [--out scene.excalidraw]`, `import [scene.excalidraw|-] [--replace]` — a `.excalidraw.md` out path writes Obsidian's format (see File I/O) |
| Mermaid → canvas | `mermaid [diagram.mmd|-]` (or stdin) |
| Snapshots | `snapshot save\|list\|restore <name>` |
| Share link | `share` (encrypted upload → excalidraw.com URL) |
| Wipe canvas | `clear --yes` |
| Install / upgrade this skill | `install-skill --dir <skills-root>` (agent chooses project/global root) |

### Element Format (CLI and MCP)

The CLI and MCP tools accept the same agent-friendly format and normalize it automatically:

- **Labels**: put `"text": "My Label"` on any shape — converted to Excalidraw's bound-label format for you.
- **Label typography**: `fontSize`, `fontFamily`, `textAlign` and `verticalAlign` alongside `text` style the label (a shape has no font of its own, so they follow the text into it). For label colour pass the label explicitly — `"label": {"text": "Save", "strokeColor": "#d03b3b"}` — since a shape's `strokeColor` is its border. Explicit `label` keys win over the shorthand.
- **Wireframe role**: `"role": "chart"` declares what a shape is, so `wireframe` reports it instead of guessing. Any role from the vocabulary is accepted; an unknown one is rejected by the API.
- **Arrow binding**: `"startElementId": "a"` / `"endElementId": "b"` — arrows auto-route to element edges.
- **fontFamily**: pass a string name (`"helvetica"`, `"cascadia"`, `"excalifont"`, ...) or string number `"1"`–`"8"`.
- **points**: both `[[x,y], ...]` tuples and `[{"x":..,"y":..}]` objects are accepted.
- **Patch updates**: in `apply`, update entries can use either direct fields (`{"id":"a","x":120}`) or a `set` object (`{"id":"a","set":{"x":120}}`). Do not mix both forms in one update entry.

**Raw REST is stricter**: labels must be `"label": {"text": "..."}`, bindings must be `"start": {"id": "..."}` / `"end": {"id": "..."}`. Only worry about this when POSTing to the API directly.

---

## Coordinate System

The canvas uses a 2D coordinate grid: **(0, 0) is the origin**, **x increases rightward**, **y increases downward**. Plan your layout before writing any JSON.

**General spacing guidelines:**
- Vertical spacing between tiers: 80–120px (enough that arrows don't crowd labels)
- Horizontal spacing between siblings: 40–60px minimum; give labeled arrows 120px+
- Shape width: `max(160, labelCharCount * 12)` to keep the label on one line
- Shape height: 60px single-line, 80px two-line labels
- Background/zone padding: 50px on all sides around contained elements

**Styling for a professional look:**
- `"fillStyle": "solid"` on shapes gives crisp flat fills — the default is a sketchy hachure pattern
- Pair pastel `backgroundColor` fills with their darker `strokeColor` (palette in the cheatsheet)
- `"strokeStyle": "dashed"` on zone borders and async arrows reads as "boundary / background"

---

## Layout Anti-Patterns (Critical for Complex Diagrams)

These are the most common mistakes that produce unreadable diagrams. Avoid all of them.

### 1. Do NOT use `label.text` (or `text`) on large background zone rectangles

When you put a label on a background rectangle, Excalidraw creates a bound text element centered in the middle of that shape — right where your service boxes will be placed. The text overlaps everything inside the zone and cannot be repositioned.

**Wrong:**
```json
{"id": "vpc-zone", "type": "rectangle", "x": 50, "y": 50, "width": 800, "height": 400, "text": "VPC (10.0.0.0/16)"}
```

**Right — use a free-standing text element anchored at the top of the zone:**
```json
{"id": "vpc-zone", "type": "rectangle", "x": 50, "y": 50, "width": 800, "height": 400, "backgroundColor": "#e3f2fd"},
{"id": "vpc-label", "type": "text", "x": 70, "y": 60, "width": 300, "height": 30, "text": "VPC (10.0.0.0/16)", "fontSize": 18}
```

The free-standing text element sits at the top corner of the zone and doesn't interfere with elements placed inside.

### 2. Avoid cross-zone arrows in complex diagrams

An arrow from an element in one layout zone to an element in a distant zone will draw a long diagonal line crossing through everything in between. In a multi-zone infra diagram this produces an unreadable tangle of spaghetti.

**Design rule:** Keep arrows within the same zone or tier. To show cross-zone relationships, use annotation text or separate the zones so their edges are adjacent (no elements between them), and route the arrow along the edge.

If you must connect across zones, use an elbowed arrow that travels along the perimeter — never through the middle of another zone.

### 3. Use arrow labels sparingly

Arrow labels are placed at the midpoint of the arrow. On short arrows, they overlap the shapes at both ends. On crowded diagrams, they collide with nearby elements.

- Only add an arrow label when the relationship name is genuinely essential (e.g., protocol, port number, data direction).
- If you're adding a label to every arrow, reconsider — it usually adds visual noise, not clarity.
- Keep arrow labels to ≤ 12 characters. Prefer omitting them entirely on dense diagrams.

---

## Quality: Why It Matters (and How to Check)

Excalidraw diagrams are visual communication. If text is cut off, elements overlap, or arrows cross through unrelated shapes, the diagram becomes confusing and unprofessional — it defeats the whole purpose of drawing it. So after every batch of elements, verify before adding more.

### Quality Checklist

After each `add` / `apply` / `batch_create_elements`, take a screenshot and check:

1. **Text truncation** — Is all label text fully visible? Truncated text means the shape is too small. Increase `width` and/or `height`.
2. **Overlap** — Do any shapes share the same space? Background zones must fully contain children with padding.
3. **Arrow crossing** — Do arrows cut through unrelated elements? If yes, route them around using curved or elbowed arrows (see Arrow Routing below).
4. **Arrow-label overlap** — Arrow labels sit at the midpoint. If they overlap a shape, shorten the label or adjust the arrow path.
5. **Spacing** — At least 40px gap between elements. Cramped layouts are hard to read.
6. **Readability** — Font size ≥ 16 for body text, ≥ 20 for titles.
7. **Zone label placement** — If you used `text`/`label.text` on a background zone rectangle, the zone label will be centered in the middle of the zone, overlapping everything inside. Fix: delete the bound text element and add a free-standing text element at the top of the zone instead (see Layout Anti-Patterns above).

If you find any issue: **stop, fix it, re-screenshot, then continue.** Say "I see [issue], fixing it" rather than glossing over problems. Only proceed once all checks pass.

---

## Workflow: Drawing a New Diagram

### Mermaid vs. Direct Creation — Which to Use?

**Use `mermaid` / `create_from_mermaid`** when: the user already has a Mermaid diagram, or the structure maps cleanly to a flowchart/sequence/ER diagram with standard Mermaid syntax. It's fast and handles conversion automatically, though you get less control over exact layout.

**Create elements directly** when: you need precise layout control, the diagram type doesn't map to Mermaid well (e.g., custom architecture, annotated cloud diagrams), or you want elements positioned in a specific coordinate grid.

### Steps (CLI shown; MCP tools are 1:1 — see cheatsheet)

1. Plan your coordinate grid — map out tiers and x-positions before writing JSON. (MCP mode: call `read_diagram_guide` for colors/sizing; the same guidance lives in `references/cheatsheet.md`.)
2. Optional fresh start: `excalidraw-canvas clear --yes`
3. Create shapes and arrows in one call. Custom `id` fields (e.g. `"id": "auth-svc"`) make later updates easy:
   ```bash
   excalidraw-canvas add - <<'EOF'
   [
     {"id": "lb", "type": "rectangle", "x": 300, "y": 50, "width": 180, "height": 60, "text": "Load Balancer"},
     {"id": "svc-a", "type": "rectangle", "x": 100, "y": 200, "width": 160, "height": 60, "text": "Web Server 1"},
     {"id": "svc-b", "type": "rectangle", "x": 450, "y": 200, "width": 160, "height": 60, "text": "Web Server 2"},
     {"id": "db", "type": "rectangle", "x": 275, "y": 350, "width": 210, "height": 60, "text": "PostgreSQL"},
     {"type": "arrow", "x": 0, "y": 0, "startElementId": "lb", "endElementId": "svc-a"},
     {"type": "arrow", "x": 0, "y": 0, "startElementId": "lb", "endElementId": "svc-b"},
     {"type": "arrow", "x": 0, "y": 0, "startElementId": "svc-a", "endElementId": "db"},
     {"type": "arrow", "x": 0, "y": 0, "startElementId": "svc-b", "endElementId": "db"}
   ]
   EOF
   ```
   (The `-` positional is optional — with no file argument, `add` reads stdin.)
4. Set shape widths using `max(160, labelLength * 12)`.
5. `screenshot` → view the file → run the Quality Checklist → fix issues before the next batch.

---

## Arrow Routing — Avoid Overlaps

Straight arrows can cross through elements in complex diagrams. Use curved or elbowed arrows when needed:

**Curved arrows** (smooth arc over obstacles):
```json
{
  "type": "arrow", "x": 100, "y": 100,
  "points": [[0, 0], [50, -40], [200, 0]],
  "roundness": {"type": 2}
}
```
The intermediate waypoint `[50, -40]` lifts the arrow upward. `roundness: {type: 2}` makes it smooth.

**Elbowed arrows** (right-angle / L-shaped routing):
```json
{
  "type": "arrow", "x": 100, "y": 100,
  "points": [[0, 0], [0, -50], [200, -50], [200, 0]],
  "elbowed": true
}
```

**When to use which:**
- Fan-out (one source → many targets): curved arrows with waypoints spread to avoid overlapping
- Cross-lane (connecting to side panels): elbowed arrows that go up, then across, then down
- Long horizontal connections: curved arrows with a slight vertical offset

**Rule:** If an arrow would pass through an unrelated shape, add a waypoint to route around it.

---

## Workflow: Iterative Refinement

Pairing `describe` with `screenshot` is what makes this skill powerful.

- **`describe`** (`describe_scene` in MCP) → structured text: element IDs, types, positions, labels, connections. Use it to know *what's on the canvas* before making programmatic updates (find IDs, understand bounding boxes).
- **`screenshot`** (`get_canvas_screenshot` in MCP) → PNG of the actual rendered canvas. Use it for *visual quality verification* — it shows exactly what the user sees, including truncation, overlap, and arrow routing. The CLI prints the saved file path as JSON; read/view that file.

**Feedback loop:**
```
add elements
  → screenshot → view → "text truncated on auth-svc"
  → update auth-svc --set '{"width": 220}' → screenshot → "overlap between auth-svc and rate-limiter"
  → update rate-limiter --set '{"x": 520}' → screenshot → "all checks pass"
  → proceed
```

## Workflow: Drawing a UI Wireframe

A UI wireframe is not a diagram with boxes — it is drawn against a different set of
rules, because it will be *read back* as an interface (by `wireframe`, below) and
turned into code. Follow **`references/wireframe-conventions.md`**: the layout grid,
the neutral-vs-accent palette split, per-component geometry recipes, when to declare
a `role`, and the pre-flight checklist.

The three rules that matter most, if you read nothing else:

1. **One screen = one rectangle, and everything is fully inside it.** Containment is
   how nesting is computed. No label on the frame — use a free-standing heading.
2. **Declare `role` on every chart, table, map and image placeholder.** Inference
   cannot recognise a plot labelled with what it *shows* ("PSI per feature · 0.25
   line"), and `shape` is what the next agent will build from.
3. **Structure is neutral, interactive is coloured.** Role inference keys off fill
   saturation, so a coloured card becomes a `button` and a white button becomes an
   `input`.

**Done means the round-trip closes**, not that the screenshot looks right:

```
draw → screenshot (looks right to a human?) → wireframe (reads right to an agent?) → fix → repeat
```

Those are different bars and the reading is the one that matters, because the reading
is what gets generated from. Run both.

## Workflow: Reading a UI Wireframe

`describe` gives you a flat list of shapes at coordinates. For a **user interface**
that is the wrong altitude — you need to know what is a screen, what sits inside
what, and which box is a button. `wireframe` (`describe_wireframe` in MCP) reads
the same canvas as a UI:

- **Screens and nesting** — every element is placed under the smallest element that
  contains it, so a card inside a screen inside nothing comes out as a tree. Screens
  are named after their own heading, or their header bar's text.
- **Component roles** — `button`, `input`, `heading`, `header`, `footer`, `sidebar`,
  `card`, `checkbox`, `radio`, `avatar`, `list-item`, `divider`, `chart`, `table`,
  `image`, `text`.
- **Declared roles** — put `"role": "chart"` (or any role above) on a shape and the
  reader takes your word for it, reported without the `?`. Do this for dashboard
  content: inference can read a label that says what a thing *is* ("Revenue chart",
  "12 rows of orders"), but a real dashboard labels a plot with what it *shows*
  ("PSI per feature · 0.25 line · drift region"), which no general word list can
  recognise. Declare the role when you draw it and the reading comes back exact.
- **Reading order** — children are numbered top-to-bottom, left-to-right within a
  row (`3.`, `3.1.`, `3.2.`), which is the order a person reads them and the order
  you should generate markup in.
- **Navigation** — arrows that cross from one screen to another are reported as
  flows: `button "Continue" [submit] → screen "Dashboard" [s2]`.
- **Annotations** — human markup currently on the canvas, each attached to the
  component it refers to.
- **Reading quality** — a block that appears *only when something is wrong*: how
  many components fell back to `shape`, how many screens could not be named, how
  many fell outside every frame. If you don't see it, the reading is clean.

Use it before turning a wireframe into code, before reviewing someone's UI sketch,
and after a round of markup to re-read the updated design.

### Checking a drawing without reading it

`wireframe --score` emits the same counts as JSON and nothing else — use it when you
want to *gate* on the reading rather than read it:

```bash
excalidraw-canvas wireframe --score
```

```json
{ "screens": 1, "components": 21, "fallbacks": 0, "inferred": 0, "unnamedScreens": 0, "orphans": 0 }
```

`fallbacks`, `unnamedScreens` and `orphans` should all be **0** before you call a
wireframe finished — that is the pre-flight checklist in
`references/wireframe-conventions.md` §9, counted. `inferred` is the number of `?`
marks: fine on anything you would not mind being guessed wrong, worth declaring a
role on anything load-bearing. `wireframe --json` carries the same object under
`score`, alongside the full tree.

### Trust the `?`, and trust the numbers

Roles are **inferred** from geometry, style and wording — a rectangle is never
definitively a button. A trailing `?` means low confidence. Every entry also
carries its raw type and size, so you can disagree with the reading:

```
7. button "Continue"  [submit] rectangle 360x52 · fill #4c6ef5     ← confident
8. button? "Sign in with Google"  [google] rectangle 360x48 · fill #ffffff  ← guess
```

Roughly how the guesses are made — useful to know when you *draw* a wireframe you
want read back accurately:

- **button** — wide, short, and filled with a saturated or dark colour, or labelled
  with an action word ("Continue", "Save", "Sign in").
- **input** — wide, short, neutral fill with a border, or labelled with a field name
  ("Email", "Password", "Search…").
- **list-item** — same as above but one of several identically sized boxes stacked
  in a column.
- **header / footer / sidebar** — a strip pinned to an edge of its container,
  spanning most of that edge.
- **heading** — a text element at font size ≥ 20.
- **checkbox / radio** — a small square / circle ≤ 28px. Text immediately to its
  right becomes its label rather than a separate component.
- **divider** — anything ≤ 6px thin and ≥ 40px long.

So: fill your primary buttons with a real colour, leave inputs white with a border,
give each screen a heading or a header bar, and put every screen's contents fully
inside its frame. A wireframe drawn that way reads back cleanly.

**If it isn't a wireframe**, the report says so — `0 screens` plus a warning when the
canvas is really a flowchart. Use `describe` for diagrams.

## Workflow: Two-Way Design Review (wireframes & UX)

The canvas is shared: you draw on it, and so does the person you are working with.
`changes` / `get_canvas_changes` is how you find out what *they* did. Use this
whenever you are proposing UI, a layout, or a flow that the user should react to —
it is far cheaper and more precise than asking them to describe edits in prose.

**The loop:**

1. **Draw** the wireframe (`add` / `batch_create_elements`), then `screenshot` and
   run the Quality Checklist.
2. **Hand over the pen.** Tell the user explicitly what to do, in canvas terms:
   > "The sign-in wireframe is on the canvas at http://127.0.0.1:3000. Mark it up
   > however you like — drag things, retype labels, circle what's wrong, or drop a
   > text note next to anything you want changed. Tell me when you're done."
3. **Wait** with `watch` (`wait_for_changes`) instead of polling. It blocks until
   the canvas is touched, then waits for a quiet moment so a whole round of markup
   arrives as one batch. On timeout it says so — call it again to keep waiting.
4. **Read** the report. Then *act on it*: apply the edits to the code/design, or
   update the wireframe and go round again. For UI work, follow up with `wireframe`
   to re-read the marked-up design as an interface — the report tells you what
   moved, the wireframe reading tells you what the design now *is*.

**The user must have the canvas open in a browser.** Edits only reach the server
from an open tab — that is the transport. If `watch` keeps timing out, check this
before assuming the user is idle.

### Reading the report

```
### Added (2)
  [note-1] text "Make this full-width and the primary CTA" at (470, 360) — by human
      ↳ annotates [submit] rectangle "Log in" (40px away)
  [circle-1] ellipse at (60, 130) size 380x68 — by human
      ↳ circles / marks [email] rectangle "Email"

### Edited (1)
  [submit] rectangle "Log in" — by human
      moved down 60px — (70, 290) → (70, 350)
      resized 360x52 → 360x64
      text "Continue" → "Log in"
```

- **`by human` vs `by agent`** — your own writes are tracked too, so you can tell
  your changes from theirs. Only `by human` entries are feedback.
- **The `↳` line is the point.** Free-standing notes, circles, scribbles and arrows
  a person adds are attributed to the element they refer to — `points at` (a bound
  arrow), `circles / marks` (drawn around it), `sits on` (drawn over it), or
  `annotates` (drawn beside it, with the gap). A note attributed to `[submit]` is a
  change request for the submit button; read it as such.
- **Background panels are never `annotates` targets.** Anything holding two or more
  other elements is treated as structure, so a note beside a screen frame is
  attributed to the nearest real component instead.
- **Cursor.** Every report ends with `Cursor: rev N`. The MCP tools remember it, so
  calling them with no arguments always yields "what's new since last time". From
  the CLI, pass `--since N` yourself.

### Notes

- Moving a shape drags its bound arrows along, and those reroutes are reported as
  `by agent` — ignore them as feedback.
- A person retyping a shape's label is reported as a change to **the shape**
  (`text "Continue" → "Log in"`), not as a separate text element.
- If a report says the log is truncated or the cursor is ahead of the canvas (the
  server restarted), fall back to `describe` for the full current state.

## Workflow: Refine an Existing Diagram

1. `describe` to understand current state — note element IDs and positions.
2. Identify elements by `id` or label text (not by x/y coordinates — they change).
3. `update <id> --set '{...}'` to resize/recolor/move; `delete <id>` to remove; or bundle everything in one `apply` patch. **Bound arrows re-route automatically when you move or resize their endpoints** — no need to delete and recreate them.
4. `screenshot` to confirm the change looks right.
5. If updates fail: check the ID exists with `get <id>`; unlock with `arrange unlock --ids <id>` if locked.

## Workflow: Mermaid Conversion

```bash
echo 'graph TD
  A[Client] --> B[API]
  B --> C[(DB)]' | excalidraw-canvas mermaid
```
Requires an open browser tab (conversion runs in the frontend; exit code 4 tells you to open the canvas URL). Afterwards `screenshot` to verify layout. If the auto-layout is poor (nodes crowded, edges crossing), find problem elements with `describe` and reposition them with `update`.

## Workflow: File I/O

- Export scene: `export --out diagram.excalidraw` (no `--out` → JSON to stdout)
- Import scene: `import diagram.excalidraw` (append) or `import diagram.excalidraw --replace`
- Image: `screenshot --out diagram.png` / `screenshot --format svg --out diagram.svg` (browser tab required)
- Share link: `share` — encrypts the scene and returns a shareable excalidraw.com URL

This is how diagrams live in a repo: commit the `.excalidraw` file, and re-`import` + edit + `export` it when the architecture changes.

### Obsidian vaults: use `.excalidraw.md`

Check the destination before writing: if any ancestor directory contains `.obsidian/`, it is an Obsidian vault. A raw `.excalidraw` file there opens in the Excalidraw plugin only in **compatibility mode** ("Convert to new format" warning), gets no block references or vault-wide search, and default Obsidian Sync skips non-`.md` files. Give the export a `.excalidraw.md` extension and the CLI writes the plugin's native format automatically:

```bash
excalidraw-canvas export --out "$VAULT/diagrams/system-map.excalidraw.md"   # .md → Obsidian format (or force with --format obsidian)
excalidraw-canvas import "$VAULT/diagrams/system-map.excalidraw.md" --replace  # reads both plain and compressed Drawing blocks
```

Round-trips are safe: text-element block references follow the plugin's own id rules, so re-importing, editing, and re-exporting the same file keeps links from other notes intact.

## Workflow: Snapshots

1. `snapshot save <name>` before risky changes.
2. Make changes, evaluate with `describe` / `screenshot`.
3. `snapshot restore <name>` to roll back if needed. `snapshot list` shows what's saved.

## Workflow: Duplication

`arrange duplicate --ids a,b --offset 40,40` (default offset 20,20). Useful for repeated patterns or copying layouts.

## Error Recovery

- **Exit code 3 (canvas unreachable)?** Auto-start is disabled (`EXCALIDRAW_NO_AUTOSTART=1`) or a non-loopback `EXPRESS_SERVER_URL` is set. Run `start` explicitly or fix the env.
- **Exit code 4 (browser required)?** Open `http://127.0.0.1:3000` in a browser, then retry — screenshots, image export, viewport, and mermaid conversion render in the frontend.
- **Elements not appearing?** Check `describe` — they may be off-screen. In MCP mode, use `set_viewport` with `scrollToContent: true`, or `scrollToElementIds` plus optional `viewportZoomFactor` to focus on a specific subgraph; in a browser, press the zoom-to-fit button.
- **Arrow not connecting?** Verify element IDs with `get <id>`. Make sure `startElementId`/`endElementId` match existing element IDs.
- **Canvas in a bad state?** `snapshot save` first, then `clear --yes` and rebuild. Or `snapshot restore` to go back.
- **Element won't update?** It may be locked — `arrange unlock --ids <id>` first.
- **Duplicate text elements / element count doubling?** The frontend auto-sync timer periodically writes the full Excalidraw scene back to the server. Excalidraw internally generates a bound text element for every shape with a label; clearing and re-sending elements can re-inject cached bound texts. Clean up: `query --type text` to find elements with a `containerId`, `delete` the unwanted ones, wait a few seconds for auto-sync to settle. The safest prevention: **never put labels on background zone rectangles** — use free-standing text elements.

---

## References

- `references/cheatsheet.md`: full CLI reference, the 29 MCP tools, REST API endpoints + payload shapes, and the diagram design guide (colors, sizing).
- `references/wireframe-conventions.md`: how to **draw** a UI wireframe — layout grid and column widths, the structure/interactive palette split, typography scale, component geometry recipes, role declaration, flow arrows, annotation gestures, and the pre-flight checklist. Read it before drawing any UI.
