# Wireframe Drawing Conventions

How to *draw* a UI wireframe so that `wireframe` reads it back as the interface you
meant, and so the reading is a specification someone can build from.

`SKILL.md` covers reading a wireframe and the inference rules. This covers the other
direction. The two are the same contract seen from opposite ends: every convention
here exists because it makes a specific part of the reading come out right.

## The round-trip is the definition of done

A wireframe is finished when `wireframe` reads it back as what you intended — not
when the screenshot looks nice. Those are different bars, and the screenshot is the
weaker one: a box that *looks* like a chart to you reads as `shape` to the tool, and
`shape` is what the next agent will build from.

```
draw  →  screenshot   (does it look right to a human?)
      →  wireframe    (does it read back right to an agent?)
      →  fix whichever failed, repeat
```

Run both. When they disagree, the reading is the one that matters, because the
reading is what gets turned into code.

**What a failed round-trip looks like.** Two real examples from dashboards drawn
before these conventions existed:

```
12. shape "PSI per feature · 0.25 line · drift region"  rectangle 504x200
                                                            ↑ should be `chart`
16. input? "Run date  Max PSI  Worst feature  Champion RMSE"  rectangle 512x56
                                                            ↑ should be `table`
```

Both are fixed by declaring the role (below). Neither is visible in a screenshot.

---

## 1. Frame and grid

**One screen = one native frame** (ADR-003). Name the frame with the screen's id and
title, give it that id in lower case, and set `frameId` to it on everything that
belongs to the screen:

```json
{"id": "s01", "type": "frame", "x": 120, "y": 120, "width": 1160, "height": 1300,
 "name": "S01 — Sign in"},
{"id": "s01-email", "type": "rectangle", "x": 152, "y": 184, "width": 536, "height": 48,
 "label": {"text": "Email address"}, "role": "input", "frameId": "s01"}
```

The editor draws the name above the frame at a fixed 14 px on screen, whatever the
zoom, so a person looking at 25 screens zoomed out can still read "S23 — Character"
and quote it, and `wireframe` reads the screen by the same words:

```
### Screen 1 "S01 — Sign in"  [s01] frame 1160x1300
```

The name *is* the screen's name: no heading is needed, and a heading you draw inside
reads as a `heading` component. Exports and renders draw the name at 14 px of the
drawing, so it shrinks with the image there.

Inside a frame, containment still builds the tree: a card nests under the frame and
its contents under the card, by geometry. A member that crosses the frame's edge still
belongs to the frame (its `frameId` says so), but the editor clips whatever lies
outside, so keep members fully inside. An element with no `frameId` drawn inside a
frame reads as part of that screen too, but in the editor it does not move with the
frame, so set `frameId`. An empty frame reads as an empty screen.

**A rectangle screen still reads**, and every scene drawn before ADR-003 is one: a
plain bordered rectangle, no fill, no label, with everything fully inside it.
Containment alone decides membership there — a card whose edge pokes 3px outside the
rectangle is not a child of that screen, and the whole tree collapses.

```json
{"id": "screen", "type": "rectangle", "x": 120, "y": 120, "width": 1160, "height": 1300,
 "strokeColor": "#14130f", "strokeWidth": 2, "backgroundColor": "transparent"}
```

Never put `text` on a rectangle screen — the bound label centres itself in the middle
of the screen, on top of the content. Name it with a free-standing heading (font
size ≥ 20) near its top, or a header bar containing one; `wireframe` names the screen
after the largest heading directly in it or in its header bar, the first one on a tie, so a
smaller caption above the title does not take its name (T-005). A frame with no name is named
the same way.

### The measurements that work

Derived from shipped dashboard wireframes; use them unless the design says otherwise.

| Thing | Value |
|---|---|
| Frame width (desktop) | 1160 |
| Frame origin | (120, 120) — leaves a gutter for annotations |
| Content inset from frame | 32 each side |
| Content width | 1096 |
| Gutter between siblings | 16 |
| Header / footer band height | 176 / 120 |

Column widths fall out of `1096 = n·w + (n−1)·16`, so they always add up:

| Columns | Width each | Typical use |
|---|---|---|
| 1 | 1096 | full-bleed table, hero chart |
| 2 | 540 | chart cards |
| 3 | 354 | wide KPI tiles |
| 4 | 262 | KPI tiles |

Round every coordinate to a multiple of 2 and keep rows on a shared `y`. Ragged
values by a few pixels make the reading order shuffle, because rows are grouped by
vertical proximity.

**Z-order is creation order.** On a rectangle screen, a header or footer band flush
with the edge paints over the rectangle's border along that edge, so the outline appears to
break where the bands are. Harmless, and containment is unaffected — but if you want
an unbroken outline, inset the bands by 1px or create the frame last.

### Multiple screens

Lay screens out left-to-right in flow order with **≥ 200px between frames** — enough
that a cross-screen arrow is legible and that annotations beside one screen aren't
attributed to the next. Overview screens on the left, detail screens to the right of
the thing that opens them.

---

## 2. Palette

Two layers, and the split is load-bearing: **structure is neutral, interactive is
coloured.** Role inference keys off saturation — a filled, saturated box reads as a
button. Colour a card and it becomes a button; leave a button white and it becomes
an input.

**Structure (neutral).** Frames, cards, bands, dividers, placeholders:

| Token | Hex | Use |
|---|---|---|
| ink | `#14130f` | frame border, headings |
| ink2 | `#55534d` | body text |
| muted | `#8a867d` | captions, placeholder text |
| border | `#d7d5cc` | card borders, dividers, placeholder outlines |
| surface | `#ffffff` | card fill, input fill |
| surface-2 | `#fbfaf8` | header / footer bands, inactive tracks |

**Interactive (accent).** Primary action, selected tab, active state:

| State | Fill | Stroke |
|---|---|---|
| primary / selected | `#74c0fc` | `#1971c2` |
| secondary / unselected | `#dbeafe` | `#4dabf7` |

**Status.** Only for status: `#b2f2bb`/`#2f9e44` good, `#ffec99`/`#c98500` warn,
`#ffc9c9`/`#d03b3b` critical.

Always set `"fillStyle": "solid"` — the default hachure scribble reads as sketchy and
muddies the fill-saturation signal that inference depends on.

### Use the product's own tokens when they exist

If the thing you're wireframing has a stylesheet, lift its custom properties instead
of the table above. The neutrals here *are* the `--ink` / `--surface` / `--axis`
values from the dashboard they were drawn for. It costs nothing at draw time and pays
twice: the wireframe reads as the product rather than as a generic sketch, and the
generated markup can reference `var(--surface)` instead of a hex that has to be
reconciled later.

---

## 3. Typography

| Size | Role | Reads as |
|---|---|---|
| 26–28 | screen title | `heading` |
| 20 | card / section title | `heading` |
| 16 | emphasis, tab labels | text |
| 13–14 | body, descriptions | text |
| 12 | captions, legends | text |
| 10–11 | micro-labels inside placeholders | text |

Anything ≥ 20 is a `heading`, which is also how a rectangle screen gets named — so don't set body
copy to 20 to make it readable, and don't shrink a real heading below it.

Use one `fontFamily` for the whole wireframe (`"helvetica"` / `"2"` for a clean UI
look; `"excalifont"` when you deliberately want "this is a sketch, not a spec").
Label typography rides along with `text` on a shape — `fontSize`, `fontFamily`,
`textAlign`, `verticalAlign` follow it into the label.

**A big number reads as a `heading`.** A KPI tile's value at 26px comes back as
`heading "23"`. That is the size rule working, not a bug — don't shrink the value to
dodge it. Read it as "this is the tile's own title", which is what it is.

---

## 4. Component recipes

Geometry and colour, chosen so inference lands on the right role without help.
`role` column is what the reading should say.

**Colour every label on a light border.** A label written as `"text"` takes the shape's
`strokeColor`, so on the `#d7d5cc` border of an input, a card or a secondary button it is drawn
in that pale grey and nearly disappears. Give the label its own colour:
`"label": {"text": "Cancel", "strokeColor": "#14130f"}` (T-008). Its `textAlign` (`left`,
`right`) and `verticalAlign` (`top`, `bottom`) place it in the shape, 5px from that edge: a
file row or an input's placeholder reads as drawn with `"textAlign": "left"` (T-004).

| Component | Geometry | Fill / stroke | Notes | Role |
|---|---|---|---|---|
| Primary button | h 44–52, w ≥ 120 | accent primary | action verb label | `button` |
| Secondary button | h 44–52 | `#ffffff` / `#d7d5cc` | declare the role — a white button reads as `input`; label `strokeColor` `#14130f` | `button` |
| Text input | h 44–56, w ≥ 240 | `#ffffff` / `#d7d5cc` | label is the field name, ≤ 4 words | `input` |
| Segmented / tabs | h 44, siblings on one `y` | selected = primary, rest = secondary | see below | `button` |
| Checkbox | square ≤ 28 | `#ffffff` / `#d7d5cc` | label text immediately right | `checkbox` |
| Radio | circle ≤ 28 | same | ellipse, not rectangle | `radio` |
| KPI tile | 262×96 | `#ffffff` / `#d7d5cc` | value at 26, caption at 12 | `card` |
| Chart card | 540×336 | `#ffffff` / `#d7d5cc` | holds title + desc + placeholder | `card` |
| Chart placeholder | inset 18, h 200 | transparent / `#d7d5cc` **dashed** | **declare `chart`** | `chart` |
| Table placeholder | as above | same | **declare `table`** | `table` |
| Header / footer | full frame width, pinned to edge | `#fbfaf8` / `#d7d5cc` | flush with both sides (within 10px) and ≥ 80% of the edge | `header` / `footer` |
| Sidebar | pinned to left edge, full height | `#fbfaf8` / `#d7d5cc` | flush top and bottom, ≥ 70% of the height | `sidebar` |
| Divider | h 2, w ≥ 400 | `#d7d5cc` | ≤ 6px thin is the trigger | `divider` |
| List item | identical boxes stacked, gap ≤ 16 | `#ffffff` / `#d7d5cc` | needs ≥ 3 to read as a set | `list-item` |
| Avatar | circle 32–48 | `#d7d5cc` | | `avatar` |
| Icon glyph | square or circle 16–28, no label | transparent / `#8a867d` | **declare `icon`** — undeclared it reads as a checkbox or a radio | `icon` |

**Tabs and segmented controls** are just a row of buttons on a shared `y` with
exactly one filled in the primary accent. There is no `tab` role — that is fine, and
it is why the selected one must be visually distinct: the fill is what tells the
reader (and the person building it) which state is active. Put the group inside a
`#fbfaf8` track rectangle if the real control has one.

**Sidebars and headers must actually span their edge.** A "sidebar" that stops 200px
short of the bottom reads as a `card`. Pin it corner to corner.

---

## 5. Declare the role for content

**Rule: every chart, table, map, and image placeholder gets an explicit `role`.**

Inference reads geometry, style, and wording. It can catch a label that says what a
thing *is* ("Revenue chart", "12 rows of orders"). It cannot catch a label that says
what a thing *shows* — and every real dashboard labels its plots the second way:

```
"PSI per feature · 0.25 line · drift region"
"holdout RMSE · champion vs challenger · stars"
```

No general word list recognises those, and teaching it one domain's vocabulary breaks
every other domain. So say it outright:

```json
{"id": "psi-plot", "type": "rectangle", "x": 170, "y": 708, "width": 504, "height": 200,
 "backgroundColor": "transparent", "strokeColor": "#d7d5cc", "strokeStyle": "dashed",
 "role": "chart",
 "text": "PSI per feature · 0.25 line · drift region",
 "fontSize": 11, "fontFamily": "2"}
```

A declared role is reported verbatim, without the `?`. It survives a human editing
the canvas — sync merges over the stored element rather than replacing it, so the
frontend dropping the unknown prop doesn't lose it.

Declare it for anything else where you'd be annoyed to be guessed wrong: a white
secondary button, a search bar wide enough to look like a banner, a single list item.
Cheap to add, and it's the difference between a spec and a suggestion.

Valid roles: `button`, `input`, `heading`, `header`, `footer`, `sidebar`, `card`,
`checkbox`, `radio`, `avatar`, `icon`, `list-item`, `divider`, `chart`, `table`, `image`,
`text`. An unknown role is rejected by the API.

Three more are in the vocabulary and are the reader's own, so there is nothing to gain by
declaring them: `screen` comes from a native frame, or from containment for a top-level
rectangle holding others; `panel` from containment (a region holding half its parent or more);
and `shape` is the fallback the gate counts, declared or not.

**Declare `icon` on every glyph.** A small box with no label is the one thing inference cannot
tell apart from a control: up to 28 px, a square reads as `checkbox?` and a circle as `radio?`.

### Write placeholder captions as build instructions

The caption inside a placeholder is the only description of that content the next
agent gets. `"chart"` tells them nothing. Name the series, the axes, and the
reference marks:

- Bad: `"Chart"` · `"Data table"`
- Good: `"PSI per feature · 0.25 line · drift region"`
- Good: `"23 rows × 11 cols — as-of, max PSI, worst feature, champion RMSE, decision"`

---

## 6. Reading order is generation order

Children are numbered top-to-bottom, then left-to-right within a row. That numbering
is the order to emit markup in, so it should match the DOM you want.

- Keep a row's elements on the same `y`. Two cards 8px apart vertically may or may
  not group as a row; on the same `y` they always do.
- If two things must be adjacent in the markup, make them adjacent on the canvas.
- A card's own children are numbered within it (`3.1`, `3.2`), so put a card's title
  above its body — the reading inherits the visual order, including mistakes.
- **An element beside a stacked column reads as a column.** A full-height sidebar, a
  picture beside a stack of buttons, a detail card beside a list: whatever has two or
  more stacked siblings beside it is read as one block with what sits under it in its
  own width, before the rows beside it when it stands to their left, after them when it
  stands to their right. The rows beside it read row by row. No wrapper card is needed
  round a main column (T-006, T-021).

---

## 7. Flows between screens

An arrow crossing from one screen to another is reported as navigation:

```
button "Continue" [submit] → screen "Dashboard" [s2]
```

- Bind both ends: `"startElementId": "submit", "endElementId": "s2"` — an
  unbound arrow that merely points near a button is not a flow. The end can be the
  target screen's frame itself (`"end": {"id": "s02"}` in the CLI); the tab keeps
  that binding.
- Start the arrow at **the control that triggers it**, not at the screen edge. The
  whole value of the report is knowing *what* navigates.
- Leave arrow labels off unless the trigger is non-obvious (`"on error"`,
  `"if signed in"`); ≤ 12 characters when used.
- Route around intervening screens with waypoints rather than straight through them.
  A bound arrow keeps the points between its ends where you put them, in the `add` that
  creates it and when an agent moves a shape it is bound to; only its two ends are
  re-anchored to their shapes' edges.

---

## 8. Annotation conventions (for the human)

**Put the legend on the canvas before handing over the pen** (ADR-004). It is a frame named
"How to mark up" that tells the person what each colour means. It ships with this skill as
`references/markup-legend.json`, an `apply` patch; from this repository:

```bash
excalidraw-canvas apply skills/excalidraw-skill/references/markup-legend.json
```

It lands left of the convention's frame origin, at x −360 to −60. If a screen is there, shift
every `x` in a copy of the file before applying it. `wireframe` leaves it out
and says so in one line: an element whose id is `legend` or begins `legend-`, with everything
that is a member of it or drawn inside it, is never a screen, a component or a mark's target.

**A mark's colour is what it asks for.** The four one-click swatches beside black in the stroke
picker; any shade of the same family means the same:

| Colour | Swatch | Intent | Read as |
|---|---|---|---|
| Red | `#e03131` | change this | `[change]` |
| Orange (the editor calls it yellow) | `#f08c00` | remove this | `[remove]` |
| Blue | `#1971c2` | I have a question | `[question]` |
| Green | `#2f9e44` | this is fine | `[fine]` |

Any other colour gives no tag and reads as a change request, as all markup did before. Only a
person's marks are read for intent, so the agent's own colours never carry one. `wireframe` prints the tag
before each mark; `changes` prints it after `by human`, and `intent change → fine` when a person
recolours a mark. A colour-blind reviewer has the legend's words, not the swatches: read the
note's words too when a tag and the words disagree.

**Give every screen up for review an approval box** (ADR-005). A person ticks it when the
screen is done, so you can see which screens are approved without asking. Draw it inside the
screen's top-right corner, transparent, and give it the screen's id with `-approval` after it:

```json
{"id": "s01-approval", "type": "rectangle", "x": 1144, "y": 136, "width": 120, "height": 36,
 "strokeColor": "#2f9e44", "backgroundColor": "transparent", "label": {"text": "Approved"},
 "frameId": "s01"}
```

(For the 1160-wide frame at (120, 120): x = frame right − 136, y = frame top + 16.) It is never a
component: no `checkbox?`, no `shape`. A fill, or any mark of a person's whose centre is inside
it, ticks it, and that mark is not listed as an annotation. `wireframe` prints each screen
`· approved` or `· not approved yet` with `Approved: 1 of 2 screens.` at the top; `changes`
reports a tick as `↳ approves screen [s01] …`, and a fill taken off as `withdraws approval of`.
The boxes show which screens are done; the Send box says the round is.

**A round ends when the person sends it** (ADR-007). The legend carries a "Send to Claude" box,
`legend-send`; the person ticks it, with any mark inside it or a fill, when the round is done.
Until then `changes`, `wireframe` and their MCP tools hold back what that person did since the
round began and print only `⏸ N edits by a person, not sent yet.`: a note they drew is not in the
reading at all; an edit to an element that already existed (a move, a relabel) still shows as it
is, and is counted. Your own edits are never held. `watch --until-sent` (`wait_for_changes` with
`untilSent`) returns the whole round once, at the tick, then deletes the tick and draws the box
again for the next round. `describe`, `export` and `screenshot` show the canvas as it is: the
reading is held, not the pixels, so do not look at them during a round either.

**Where a screen has no room for a box,** a person approves it by ringing the whole screen in
green (ADR-006): a mark in the "fine" colour that encloses a whole screen reads `· approved`, and
`changes` adds `↳ approves screen [s01] …` under it. The ring stays in the annotations, attached
to the screen. A red, orange or blue ring round a screen is a mark on the screen, not an approval.

**Where a mark lands** is attributed by gesture, whatever its colour:

| Gesture | Reported as |
|---|---|
| Arrow from a note to a component | `points at` |
| Ellipse drawn around a component | `circles / marks` |
| Scribble on top of a component | `sits on` |
| Text note beside a component | `annotates` |

Leave the 120px gutter around the frame free so a note beside a screen has somewhere
to live. Notes are never attributed to a background panel — anything holding two or
more elements counts as structure, so a note beside the frame binds to the nearest
real component instead.

---

## 9. Pre-flight checklist

Four of the eight below are counted for you. `wireframe --score` returns:

```json
{ "screens": 1, "components": 21, "fallbacks": 0, "inferred": 0, "unnamedScreens": 0, "orphans": 0 }
```

`fallbacks` is item 4, `unnamedScreens` item 2, `orphans` item 3, `inferred` item 8. All three of
the first should be **0**. The plain reading also prints a `### Reading quality` block whenever any
of them is non-zero, so a failed drawing says so without being asked — if you don't see that block,
those checks passed.

Screenshot checks (see SKILL.md's Quality Checklist), plus these, from `wireframe`:

1. **Screen count** matches the number of frames you drew. Not `0 screens` — that
   means it read the canvas as a flowchart.
2. **Every screen is named** — no `screen "(unnamed)"`. Name the frame, or give a
   rectangle screen a heading.
3. **No orphans.** Everything you drew appears under a screen. A top-level component
   is one that fell outside its frame, or whose `frameId` names a frame it does not touch.
4. **No `shape` entries.** `shape` is the fallback role and means the reading gave
   up; declare it.
5. **Content roles are `chart` / `table` / `image`**, not `input?` or `card`.
6. **Reading order matches the DOM** you want generated.
7. **Flows are listed**, one per navigating control.
8. **`?` marks are on things you genuinely don't mind being guessed.** Any `?` on
   something load-bearing gets a declared role.

**Then lint it** (ADR-002): `wireframe --lint` checks the drawing against these conventions and
names the cause when the reading is a few pixels from a different one. Each finding has a rule id;
**errors** change what the reading is, **advisories** are house style. The plain reading prints a
`### Drawing quality` block whenever there is an error, so you see those without asking.

| Rule | Severity | Fires when |
|---|---|---|
| `containment-near-miss` | error | an element overlaps a larger sibling but reaches 2–20px outside it, so it nests beside it, not inside (the footer 4.29px out that became a phantom screen) |
| `row-split` | error | two boxes of a size (the shorter ≥ 75% of the taller) sit side by side but overlap vertically by half or less, so they read as two rows |
| `bar-short` | error | a rectangle band flush to an edge spans ≥ 60% of it but misses the header / footer / sidebar test above |
| `threshold-edge` | error | an undeclared box is 1px past a threshold: a 29px square, 19px text, a 7px-thin bar |
| `oversized-annotation` | error | a transparent shape a person drew holds two or more components (KI-6) |
| `frame-overflow` | advisory | a frame member reaches outside its frame, where the editor hides it |
| `sibling-overlap` | advisory | siblings overlap by more than 2px and more than a near miss, and neither holds the other |
| `small-text` | advisory | text under 10px |

It reports only; the exit code says nothing. `wireframe --json` carries the same findings under
`lint`. Off-grid coordinates, frame width and inset are not checked: the corpus showed them to be
deliberate as often as not (`docs/specs/SPEC-008-geometry-lint.md`).

---

## 10. Worked skeleton

A dashboard screen, correct by these conventions. Header band, source switcher, KPI
row, 2-up chart cards, footer.

```json
[
  {"id": "s1", "type": "frame", "x": 120, "y": 120, "width": 1160, "height": 1000,
   "name": "S1 — Drift dashboard"},

  {"id": "hdr", "type": "rectangle", "x": 120, "y": 120, "width": 1160, "height": 176,
   "backgroundColor": "#fbfaf8", "strokeColor": "#d7d5cc", "fillStyle": "solid", "role": "header", "frameId": "s1"},
  {"id": "title", "type": "text", "x": 152, "y": 152, "width": 400, "height": 34,
   "text": "MLflow drift loop", "fontSize": 26, "fontFamily": "2", "strokeColor": "#14130f", "frameId": "s1"},
  {"id": "lede", "type": "text", "x": 152, "y": 196, "width": 640, "height": 40,
   "text": "A monitoring loop that catches a model going stale.",
   "fontSize": 13, "fontFamily": "2", "strokeColor": "#55534d", "frameId": "s1"},

  {"id": "tab-1", "type": "rectangle", "x": 152, "y": 330, "width": 214, "height": 44,
   "backgroundColor": "#74c0fc", "strokeColor": "#1971c2", "fillStyle": "solid",
   "role": "button", "text": "Kraków air quality", "fontSize": 13, "fontFamily": "2", "frameId": "s1"},
  {"id": "tab-2", "type": "rectangle", "x": 382, "y": 330, "width": 170, "height": 44,
   "backgroundColor": "#dbeafe", "strokeColor": "#4dabf7", "fillStyle": "solid",
   "role": "button", "text": "Live schedule", "fontSize": 13, "fontFamily": "2", "frameId": "s1"},

  {"id": "kpi-1", "type": "rectangle", "x": 152, "y": 430, "width": 262, "height": 96,
   "backgroundColor": "#ffffff", "strokeColor": "#d7d5cc", "fillStyle": "solid", "role": "card", "frameId": "s1"},
  {"id": "kpi-1-v", "type": "text", "x": 170, "y": 446, "width": 100, "height": 34,
   "text": "23", "fontSize": 26, "fontFamily": "2", "strokeColor": "#14130f", "frameId": "s1"},
  {"id": "kpi-1-k", "type": "text", "x": 170, "y": 486, "width": 200, "height": 18,
   "text": "Monitoring runs", "fontSize": 12, "fontFamily": "2", "strokeColor": "#8a867d", "frameId": "s1"},

  {"id": "card-1", "type": "rectangle", "x": 152, "y": 558, "width": 540, "height": 336,
   "backgroundColor": "#ffffff", "strokeColor": "#d7d5cc", "fillStyle": "solid", "role": "card", "frameId": "s1"},
  {"id": "card-1-h", "type": "text", "x": 170, "y": 576, "width": 300, "height": 26,
   "text": "Data drift", "fontSize": 20, "fontFamily": "2", "strokeColor": "#14130f", "frameId": "s1"},
  {"id": "card-1-d", "type": "text", "x": 170, "y": 612, "width": 480, "height": 34,
   "text": "Each feature's recent distribution vs. the champion's training window.",
   "fontSize": 12, "fontFamily": "2", "strokeColor": "#8a867d", "frameId": "s1"},
  {"id": "plot-1", "type": "rectangle", "x": 170, "y": 676, "width": 504, "height": 200,
   "backgroundColor": "transparent", "strokeColor": "#d7d5cc", "strokeStyle": "dashed",
   "role": "chart", "text": "PSI per feature · 0.25 line · drift region",
   "fontSize": 11, "fontFamily": "2", "frameId": "s1"},

  {"id": "ftr", "type": "rectangle", "x": 120, "y": 1000, "width": 1160, "height": 120,
   "backgroundColor": "#fbfaf8", "strokeColor": "#d7d5cc", "fillStyle": "solid", "role": "footer", "frameId": "s1"}
]
```

Mirror `card-1` at `x: 708` for the second column, and stack rows at `+352`
(336 card + 16 gutter).
