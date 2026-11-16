<!-- status: active · updated: 2026-11-16 · class: append-only -->

# ADR-005 — How a person approves a screen and ends a round of markup

- **Status:** accepted
- **Date:** 2026-11-16
- **Deciders:** Lucas; drafted by Claude Code
- **In one sentence:** a person can mark a screen as approved, and say that a round of markup is
  over, on the canvas, and the agent reads both.
- **Decided:** an approval box in each screen that a person ticks; the end of a round stays the
  quiet period of `watch` (option 1). Lucas, 2026-11-16. What each mark asks for is ADR-004; the
  shared context of the review is there too.

## In practice — waiting on a review today (T-027)

The agent waits with `watch` (MCP `wait_for_changes`). It blocks until the canvas is touched, then
waits for 1.5 s of quiet (`--settle`, `src/cli/commands/changes.ts:84`) and returns what changed
as one batch. A person who stops to think for longer splits one round into two reports. A person
who is finished has to say so in chat, which the skill asks for ("Tell me when you're done"). The
dnd_crawler_rust review of S23 and S24 asked for "a way to sign off a screen" (`docs/TICKETS.md`,
T-027). After this decision, approval and the end of a round are on the canvas, and the agent sees
them in `changes` and `wireframe`.

## Context

- **Shared context** is in ADR-004.
- **A screen has no state.** It is a drawing, so approving one has to be either something drawn
  or something the canvas page records.
- **What the change feed records.** Revisions, and who made each change. It holds no event that
  is not a change to an element (`src/core/changes.ts`).

## Options

1. **An approval box in each screen.** The agent draws a small "Approved" tick box in each
   screen's corner. A person ticks it, by drawing in it or filling it. The reading prints the
   screen as approved, and `changes` reports it as approved.
   - **Gives:** approval per screen, on the canvas, in any Excalidraw.
   - **Costs:** a role or id rule for the box, so it is not read as a checkbox of the design; a
     reading rule for what a tick is (a fill, or a stroke inside the box); conventions and tests;
     one more element in every screen.
2. **A Done button in the canvas page.** A control in the page records "round done", and `watch`
   returns at once when it does.
   - **Gives:** an end of round that cannot be misread; no change to drawings.
   - **Costs:** code in `frontend/src/App.tsx` (upstream's file) and a route in `src/server.ts`,
     the collision zone of `.claude/CONTEXT.md` rule 2, plus a new record kind in the feed. It
     works only in this page, and only per round, not per screen.
3. **A word in a note.** "done" anywhere ends the round, and "approved" on a screen approves it.
   - **Gives:** little code.
   - **Costs:** parsing free text; a person must know the words; a note saying "not done yet"
     needs care.
4. **The quiet period and chat, as today.**
   - **Costs:** the report's case. A long pause splits a round, and approval lives in chat.

## Decision

Option 1: an approval box in each screen. The agent draws a small "Approved" box in each screen's
corner, and a person ticks it, with a stroke inside it or a fill; ADR-004's colour for "fine" is
the natural tick. The reading prints the screen as approved, and `changes` reports it. A round
still ends with the quiet period of `watch`, and the boxes show which screens are done. No file of
upstream's is touched. Asked alongside: a green mark on the screen itself, which would need the
attribution rules to let a mark target a screen; it was not chosen. Decided by Lucas on
2026-11-16, choosing option 1.

## Enforced by

To be built with the change: a fixture with one ticked and one empty box, whose stored reading
prints the first screen approved and the second not (`tests/wireframe-corpus.test.mjs`), and
proves the box is not read as a checkbox of the design. Seen red before the change.

## Consequences

- **Options 1 and 3** change the reading, so they need the round trip of `.claude/CONTEXT.md`
  rule 4.
- **Option 2** is the only one that touches upstream's files, and it conflicts most at the next
  upstream merge.
- **Any choice but 4** goes into the skill's review loop (step 2 and step 3), and into the legend
  if ADR-004 adds one.
