<!-- status: active · updated: 2026-08-21 · class: disposable -->

# Field feedback — first real wireframe session (external project)

> Filed as **T-001–T-005** in `docs/TICKETS.md` on 2026-09-05 (cpc ADR-047); each ticket's `Resolution`
> line will say what became of it. §6 is praise, not a ticket.

Agent session on 2026-08-21. Drove the CLI from a **different** repo (`doc_assistant`) to wireframe
an add-documents flow: 4 screens, 116 elements, three draw→read→fix cycles. Not a test of the tool
— a first use of it for its actual purpose, by an agent that had never seen it.

**Verdict: the round-trip doctrine works, and it is the product.** `wireframe` caught two real
defects a screenshot never would have, and the "Reading quality" block told me exactly what to fix
both times. Everything below is friction encountered on the way, ordered by how much time it cost.

---

## 1 · A text element without `width`/`height` silently disappears — including the one that names the screen

**Cost: the whole first cycle.** The first reading came back `3 screens, 35 components` with
`⚠️ 3 screens could not be named` and **not one of my 26 text elements present anywhere**.

Cause: the server stores `width: null, height: null` for a text element created without them.

```
$ excalidraw-canvas get s1-title
{'id': 's1-title', 'type': 'text', 'x': 153, 'y': 142,
 'width': None, 'height': None, 'fontSize': 26, 'text': 'Library'}
```

With a null bbox, containment can't place the element in a screen, so it is dropped from the
reading entirely. Passing an estimated `width`/`height` fixed it: **35 → 58 components**, all
screens named, on identical geometry otherwise.

**Why this one hurts.** `references/wireframe-conventions.md` says to name a screen with a
*"free-standing heading (font size ≥ 20) near its top"* — that is the documented happy path, and it
silently does nothing. The diagnostic points at the symptom (`3 screens could not be named`) rather
than the cause, so the natural next move is to fiddle with font sizes and positions, which never
helps.

**Suggested fix, in order of preference:**
1. Measure text server-side on create (font metrics for the known families) — the agent has no
   business estimating `len(s) * fs * 0.52`.
2. Failing that, **reject** a text element with no `width`/`height` at the API boundary. A loud 400
   beats a silent drop.
3. At minimum: say so in `SKILL.md` § Element Format, and have the "could not be named" diagnostic
   add *"(N text elements have no size and were skipped)"* when that is why.

## 2 · `role: "shape"` is accepted by the API and reported as a failure by the reading

`shape` is in `COMPONENT_ROLES` (`src/types.ts:135`), so the API takes it. But `wireframe` reports
`⚠️ N components read as 'shape' — the fallback role, meaning the reading gave up. Declare a role.`

I had declared it deliberately, on a progress bar, precisely *because* the vocabulary has nothing
better. So the reading told me to declare a role I had already declared.

**Suggestion:** either reject `shape` as an explicit declaration (it is the fallback, not a choice),
or distinguish *inferred* `shape` from *declared* `shape` in the diagnostic. The second is better —
a deliberate "this really is just a box" should be expressible without tripping a warning.

## 3 · No role for progress / meter / gauge

Related to 2, and the reason I reached for `shape`. A progress bar is a common UI primitive with no
honest entry in the vocabulary: `chart` reads as a graph to whoever builds it, `panel` loses the
meaning. I settled on nested `panel`s, which reads as two boxes.

**Suggestion:** add `progress` (or `meter`). Cheap, and it removes the only case in this session
where I could not say what a thing was.

## 4 · `textAlign` on a bound label is stored but has no visual effect

`SKILL.md` lists `textAlign` among the label typography keys. It round-trips correctly:

```
label: {'text': '[x]   hubel-wiesel-1959.pdf', 'textAlign': 'left', ...}
```

…and renders centred anyway, because Excalidraw centres container-bound labels. For a file list —
the exact thing a wireframe of an "add documents" dialog needs — every row reads as centred, which
looks wrong to the human even though the reading is right.

The workaround (standalone text positioned inside the row) costs the good reading: the row stops
being `list-item "filename.pdf"` and becomes `list-item` with a nested `text`. So the two bars
genuinely conflict here, and the conventions doc's own tie-break ("the reading is the one that
matters") means accepting a render you know looks wrong.

**Suggestion:** document the limitation next to `textAlign` in § Element Format — one sentence
saying container labels always centre, and that left-aligned rows are a render/reading trade with
no clean answer yet.

## 5 · Smaller things

- **Screen naming picks the topmost ≥20px heading, not the most screen-like one.** My screen 2 had
  a 20px overlay caption above a 26px screen title and got named *"Drop to add 12 documents"*.
  Defensible, but "nearest the top" and "largest" disagree more often than the doc implies.
- **`clear --yes` + re-`add` is the only practical redraw loop** for a generated scene. It works
  fine; worth blessing it in the skill as the intended iteration pattern, since `update` per element
  is unusable when a generator produces 116 of them.
- **Exit code 4 is well-designed.** Lost the browser tab mid-session, `screenshot` exited 4, message
  said exactly what to do. No time lost — contrast with item 1.
- **`describe` vs `wireframe`**: I never needed `describe` once `wireframe` was reading correctly.
  That is a compliment to `wireframe`.

## 6 · What worked, and should not be changed

- **"The round-trip is the definition of done"** is the right doctrine and it paid off twice in one
  session. Keep the screenshot explicitly labelled the weaker bar.
- **"Use the product's own tokens when they exist."** Lifting `apps/desktop/src/app.css` cost
  nothing and the wireframe reads as that product rather than as a generic sketch. This is the
  single highest-value line in the conventions doc.
- **The "Reading quality" block.** Machine-checkable, actionable, and it is what made cycles 1 and
  2 converge instead of guess.
- **Driving it from another repo** worked with no setup beyond `node <repo>/dist/bin.js` and the
  canvas URL. The `npx` warning in `SKILL.md` is prominent enough that I never reached for it.
