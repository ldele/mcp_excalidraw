<!-- status: active · updated: 2026-08-01 · class: living -->

# ROADMAP

North star: **the canvas as a design surface an agent and a person share**, where a drawing carries
enough structure to be read back as a specification. Everything below serves that.

## How we know the wireframe layer is getting better

Three measures, because "it looked right" has already proved too weak a bar once.

1. **Round-trip cleanliness** — draw a scene, read it back with `wireframe`, count `shape`
   fallbacks and unintended `?` marks. Both should be zero. The three wireframes drawn on
   2026-07-31 scored 91, 30 and 18 components at zero and zero; wireframes drawn before the
   conventions existed shipped 12+ undeclared placeholders.
2. **A fixture corpus** — built 2026-08-01 (PR 2). Five `.excalidraw` files plus their expected
   reading, run as tests: `npm run test:corpus`. This is what stops a role-inference tweak from
   silently regressing another shape. Spec: `docs/specs/SPEC-001-fixture-corpus.md`.
3. **Markup attribution accuracy** — of N human annotations, how many bind to the component a
   person would say they refer to. **Still 4 of 5, and still agent-drawn**
   (`tests/expected/attribution-baseline.json`). The one miss is a note that binds to the field
   above the card it sits level with. That is a regression guard, not evidence the loop works.

   The human round finally ran on 2026-08-07 and **the number is still untaken** — the loop turned
   out to be broken before any annotation could be drawn (opening a browser tab restamped every
   agent element `human`, which switched markup detection off entirely; fixed and verified live the
   same day). Worth stating plainly, because it is the measure this whole layer is judged on: four
   sessions in, every attribution figure we have was produced by an agent imitating a person.

4. **Drawing conformance** — not yet measured. `wireframe --score` says whether the *reading*
   succeeded; nothing says whether the *drawing* follows the conventions it was drawn against. On
   2026-08-07 a footer 4.29px outside its frame produced "1 screen could not be named" — the symptom,
   two inferential steps from the cause. See PR 4.

## Phases

- **Phase 1 — Close the loop we already built.** Status: in progress — PR 2 and PR 3 landed
  2026-08-01. PR 1 ran on 2026-08-07 and found the loop broken at the browser boundary; the defect
  is fixed and verified, but the attribution measurement PR 1 exists to take is still untaken, so
  the item stays open. It needs a person, and roughly one sitting.
- **Phase 2 — Make the reader see more of the canvas.** Excalidraw carries structure we discard. Status: not started.
- **Phase 3 — Stop inferring, start declaring.** A component library makes a role a fact, not a guess. Status: not started.
- **Phase 4 — Wireframe to code.** Deliberately unplanned; see below. Status: not started.

## PR order (current phase)

| PR | Scope | Status | Spec |
|----|-------|--------|------|
| 1  | Run the two-way markup round with a human end to end; fix what it exposes | in progress — ran 2026-08-07, fixed what it exposed; attribution number still untaken | — |
| 2  | Fixture corpus + test harness: `.excalidraw` in, expected reading out | **done 2026-08-01** | `docs/specs/SPEC-001-fixture-corpus.md` |
| 3  | `wireframe --score`: emit fallback and uncertainty counts as a number | **done 2026-08-01** | — |
| 4  | Geometry lint: check a drawing against the conventions, report the cause | todo — needs an ADR first | — |

## PR 4 — the geometry lint

Agreed 2026-08-07. `--score` answers *"did the reading succeed?"*; the lint answers *"will this
drawing hold up?"* — and catches the failure one step earlier, at the cause rather than the symptom.

Every rule is already written in `skills/excalidraw-skill/references/wireframe-conventions.md` and
none of it is enforced:

| Check | Convention | Evidence |
|---|---|---|
| Element outside its frame by < 20px | §1 "a card poking 3px outside is not a child" | a footer 4.29px out became a phantom screen, 2026-08-07 |
| Row members not sharing a `y` | §1 "ragged values make the reading order shuffle" | — |
| Header / footer / sidebar spanning < 90% of its edge | §4 "a sidebar that stops short reads as a `card`" | — |
| Off-grid coordinates, wrong inset / gutter / column width | §1 measurements | — |
| Overlapping siblings; body text < 12px | §3 + SKILL.md Quality Checklist | — |
| An oversized "annotation" that is really structure | — | KI-6 |

**Shape:** core first, in `src/core`, emitting a JSON contract and reusing the existing reader;
the browser panel lands afterwards as a thin view over that output rather than duplicate logic.
Testable against the existing fixture corpus, which already contains a deliberately bad drawing.
Needs an ADR before building — where it lives (a `lint` command vs a flag on `wireframe`), and
whether it ever *gates* rather than reports, are both decisions rather than details.

## Phase 2 — what the canvas already knows and we ignore

Measured against `src/` on 2026-07-31.

- **Element `link`** (30 refs, plumbed but unused for flows). Excalidraw elements carry a `link`. A
  button linking to `#screen-2` encodes navigation *without a drawn arrow*, which survives someone
  dragging things around in a way arrow binding does not. Arrows stay as the human-drawable form;
  links become the precise one.
- **Frames** (`frameId` 7 refs, `type: "frame"` zero). Excalidraw has real frames, with names and
  membership, and we model screens as plain rectangles instead. Frames would give containment for
  free and name screens without the heading heuristic. Listed as an open question in
  `.claude/CONTEXT.md` because it changes the drawing conventions.
- **`groupIds`** (25 refs). Used for grouping, never for reading. A group is a strong signal that
  several shapes are *one component*; the reader flattens them today.
- **Z-order.** Never consulted, and it is the natural signal for modals: a card above a dimmed
  rectangle covering a screen is a dialog, and nothing else looks like that.
- **`customData`** (1 ref). Excalidraw's sanctioned slot for app-specific metadata. Our declared
  `role` rides elsewhere; `customData` is the durable home and would survive a round trip through
  the official editor.
- **Image and embeddable elements** (zero refs). A wireframe with a real screenshot pasted into it
  is a common redline workflow we cannot read at all.

Roles the vocabulary lacks: `tab-bar`, `modal`, `toolbar`, `breadcrumb`, `badge`, `tooltip`,
`progress`, `slider`, `toggle`, `stepper`, `fieldset`, `nav`. Add on evidence — a role earns its
place when a real drawing needed it, not from a list like this one.

Its own PR when it comes: **diffing two wireframes** (`wireframe --against v1.excalidraw`) to answer
"what changed in this design", which is what a reviewer actually asks.

## Phase 3 — the component library

The strongest move available, and it inverts the current design.

Excalidraw supports **libraries** (`.excalidrawlib`). Ship a UI kit whose components are already
styled to the drawing conventions *and already carry their declared role*. Drawing then becomes
dragging correct parts, and inference stops being load-bearing: a role is a fact the component was
authored with, not a guess from geometry and fill saturation.

That would make `references/wireframe-conventions.md` executable rather than advisory. Today it is a
document whoever draws has to remember to follow.

Depends on `customData` landing first (Phase 2), so roles survive a trip through excalidraw.com.

## Phase 4 — the coding layer

`wireframe` reports reading order and calls it "the order to generate markup in", and the skill says
to use it "before turning a wireframe into code" — but generation is left entirely to the calling
agent. There is no tool, command or plan for it. It has been run manually end to end (the
mlflow-drift-loop map card and method section were both built that way) and it works.

Treat it as an open idea, not a commitment. Deciding it needs an ADR, because "the reader emits
code" and "the reader stops at the reading" are different products.

## Upstream

The fork tracks `yctimlin/mcp_excalidraw`, which has not moved since the fork point. Checking is
rule 2 in `.claude/CONTEXT.md`. If upstream ever lands wireframe work of its own, that is an ADR
rather than a merge.
