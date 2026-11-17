<!-- status: active · updated: 2026-11-17 · class: append-only -->

# ADR-006 — A green ring round a whole screen approves it

- **Status:** accepted
- **Date:** 2026-11-17
- **Deciders:** Lucas; drafted by Claude Code
- **Amends:** ADR-005, whose decision is unchanged except as below.
- **In one sentence:** a person can approve a screen by ringing the whole of it in ADR-004's colour
  for "fine", as well as by ticking its Approved box.
- **Decided:** yes, a fine-coloured mark that encloses a whole screen approves it, box or no box.
  Lucas, 2026-11-17, after PR 1 round 1.

## In practice — PR 1, round 1 (KI-10)

The owner marked up their 29-screen dnd_crawler wireframe. Five screens had no room for an
Approved box. On one of them, S01, the owner drew a green loop round the whole screen and said
what it meant: "S01 is fine". The reader attached it to a heading inside the screen, and nothing
read S01 as approved. ADR-005 had considered this gesture ("a green mark on the screen itself")
and set it aside because a mark could not target a screen. KI-10's fix, in the same change as
this ADR, lets a ring round a whole container target it, so that obstacle is gone.

## Options

1. **A green ring approves.** A mark of the "fine" intent (ADR-004) whose ring encloses a whole
   screen approves it, as a tick in its box does. A ring in another colour stays an ordinary mark
   on the screen.
   - **Gives:** approval where a box does not fit, by the gesture a person reached for unprompted.
   - **Costs:** one more reading rule; a green ring meant only as praise also approves.
2. **Keep approval to the box.** The ring reads `[fine]` on the screen and the agent infers the
   rest.
   - **Costs:** what round 1 showed: a screen with no box cannot be approved on the canvas.

## Decision

Option 1. A mark a person drew in the "fine" colour family that `encloses` a screen approves it.
The reading prints the screen `· approved` whether or not it has a box, and the mark stays in the
annotations, attributed to the screen, since it is markup as well as a sign-off. `changes` adds
`↳ approves screen …` under the mark. A box still approves as ADR-005 says; either is enough.

## Enforced by

`tests/approval.test.mjs`: a green ring round a whole screen with no box approves it; a red ring,
and a green ring round a card, do not; `changes` reports the approval. `tests/fixtures/human-round-1`:
the owner's own loop approves S01. Seen red before the change.

## Consequences

- The legend gains nothing: its approval line names the box, the gesture that always works. The
  conventions name the ring as the way where a screen has no box.
- `Approved: N of M screens.` counts in M every screen with a box or approved by a ring.
