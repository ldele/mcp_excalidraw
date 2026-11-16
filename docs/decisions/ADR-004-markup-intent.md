<!-- status: active · updated: 2026-11-16 · class: append-only -->

# ADR-004 — How a person's mark says what they want done

- **Status:** accepted
- **Date:** 2026-11-16
- **Deciders:** Lucas; drafted by Claude Code
- **In one sentence:** when a person marks up a wireframe, the canvas tells them how to say
  "change this", "remove this", "I have a question" or "this is fine", and the agent reads back
  which one each mark means.
- **Decided:** intent by colour: four stroke colours from the editor's own picker, a legend frame
  that says which is which, and the intent printed beside each mark (option 2). Lucas,
  2026-11-16. How a person signs off a screen and ends a round is ADR-005. How a screen shows its
  id is ADR-003.

## In practice — the review of dnd_crawler_rust's S23 and S24 (T-027)

The owner reviewed the character screens S23 and S24 on the canvas, then gave the changes by
message. The skill tells the agent to hand over the pen in chat ("circle what's wrong, or drop a
text note next to anything you want changed. Tell me when you're done", SKILL.md, the loop's
step 2). Nothing on the canvas says it. When a person does mark up, the reading attaches each
mark to a component (`points at`, `circles / marks`, `sits on`, `annotates`), but not what they
want done to it. The agent guesses that from the note's words, or asks. After this decision, the
person sees how to mark up on the canvas itself. `changes` prints, beside each mark, what it
asks for.

## Context

- **What counts as markup.** A mark is an element with origin `human` that `looksLikeAnnotation`:
  free text, a scribble, an arrow or a line, or an unfilled rectangle, ellipse or diamond
  (`src/core/changes.ts:408`). Its colour is not read. A note's text is passed through as written.
- **Who knows the gestures.** The skill names them to the agent only (SKILL.md, the review
  loop).
- **A legend would read as a screen.** An element the agent draws at top level, a legend panel
  included, reads as one more screen (`src/core/wireframe.ts:358`).
- **Not measured:** how well the reading attaches a mark to its component when a person draws it
  (KI-3, ROADMAP PR 1). This ADR is about what a mark asks for, not where it lands.

## Options

1. **A legend panel for today's gestures.** Beside every scene the agent draws a "How to mark up"
   panel: a note is a comment, a circle means look here, an arrow from a note says what it is
   about, a scribble through something means remove it.
   - **Gives:** no reading code beyond leaving the panel out; it works in any Excalidraw.
   - **Costs:** the reading must leave the panel out, through a declared role or an id rule; the
     agent still infers intent from a note's words; a panel in every export.
2. **Intent by colour.** Four colours from the editor's own palette, for example red for change,
   orange for remove, blue for a question and green for fine. A legend says so, and `changes` and
   `wireframe` print the intent beside each mark.
   - **Gives:** intent the agent can read without guessing, picked with one click in the colour
     picker.
   - **Costs:** code in `changes.ts` and in the reading's output, tests, and the conventions; a
     person who forgets the colours gives no intent; colour alone fails a colour-blind reviewer.
     Only a person's marks (origin `human`) are read for intent, so the agent's own colours are
     unaffected.
3. **Intent by a first word.** A note that starts "change", "remove", "?" or "ok" carries that
   intent, printed beside the mark.
   - **Gives:** little code; typed rather than picked; survives any palette.
   - **Costs:** parsing free text; a person forgets the prefix; still needs telling, by a legend
     or in chat.
4. **Free markup, as today.**
   - **Costs:** what the report describes. The review went to chat, and the canvas lost it.

## Decision

Option 2: intent by colour. Four stroke colours from the editor's own picker mean change, remove,
question and fine. A legend frame on the canvas, which the reading leaves out, says which is
which. `changes` and `wireframe` print the intent beside each mark. A mark in any other colour
reads as it does today, with no intent. The exact four colours are chosen from the editor's
palette when this is built. Decided by Lucas on 2026-11-16, choosing option 2 from the four.

## Enforced by

To be built with the change: the annotated fixture's stored reading pins one mark of each
intent (`tests/fixtures/annotated.excalidraw`, read by `tests/wireframe-corpus.test.mjs`), plus a
fixture showing the legend frame left out of the reading. Both are seen red before the change.

## Consequences

- **Options 2 and 3** change what `changes`, `get_canvas_changes` and `wait_for_changes` print,
  which the skill documents.
- **Options 1 to 3** each put something on the canvas that the reading must not take for the
  design.
- **ADR-005's choice** of how a round ends is independent, but a legend from option 1 or 2 is
  where its sign-off gesture would be explained.
