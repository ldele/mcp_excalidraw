<!-- status: active · updated: 2026-11-20 · class: append-only -->

# ADR-007 — A person's markup reaches the agent when they send it, not while they draw

- **Status:** accepted
- **Date:** 2026-11-17
- **Deciders:** Lucas; drafted by Claude Code
- **In one sentence:** a person marks up and comments undisturbed, and the agent forms its view of
  the round only when they say they are done, or when they send one comment on purpose.
- **Decided:** options 2 + 5 + 1: a "Send to Claude" box in the legend, unsent markup held back
  from the reading, and the skill's loop rewritten around the send. Lucas, 2026-11-20.

## In practice — PR 1, round 1 (2026-11-17)

The owner marked up their dnd_crawler wireframe in the browser pane. The agent could read the
canvas at any moment, and did: asked "See the green?" mid-round, it read the one mark drawn so far
and gave its view before the round was over. Nothing stopped it from doing so unasked. The owner,
afterwards: the agent should wait until the person has finished before taking an opinion; a
"send to Claude" for a single comment, as in Claude Docs, might help, but might become intrusive.
Letting the person do the markup and the comments is what matters.

## Context

- **What the agent can read, and when.** `changes` (MCP `get_canvas_changes`) and `wireframe`
  (`describe_wireframe`) show every edit a person has made, the moment the tab syncs it, whenever
  the agent asks. `watch` (`wait_for_changes`) blocks until the canvas is touched, then returns at
  the first 1.5 s of quiet (`--settle`, `src/cli/commands/changes.ts`). A person who pauses to
  think hands over a half-finished round.
- **What the skill tells the agent.** Hand over the pen, `watch`, then "read the report, then act on
  it" (SKILL.md, the review loop's steps 3 and 4), in a loop. Nothing in it says to wait for the
  end of the round; "tell me when you're done" is asked in chat, but each `watch` report invites
  the agent to act.
- **How a round ends today.** By the quiet period, or by the person saying so in chat (ADR-005
  kept that; its approval boxes say which *screens* are done, not that the *round* is). ADR-005
  set aside a Done button in the page because it would touch upstream's files and "works only in
  this page, only per round" — per round is exactly what is wanted here.
- **What can carry a signal without upstream's server.** A drawn element, read like the approval
  box (ADR-005). The page header already has "Sync to Backend" and "Clear Canvas"
  (`frontend/src/App.tsx`, upstream's file, which the fork already changes); a button there can
  change an element through the ordinary sync, with no new route in `src/server.ts`.
- **What a person sees of the agent meanwhile.** Nothing, unless the agent draws or speaks. An
  agent that answers each mark as it lands, on the canvas or in chat, is the intrusion to avoid.

## Options

Two questions: how the person says "now", and whether the agent is merely asked to wait or cannot
read the draft at all. Options 1 to 4 answer the first; 5 the second; 6 and 7 are additions.

1. **Etiquette only.** The skill says: after handing over the pen, do not read, react or draw until
   the person says they are done, in chat; `watch` is used with a long settle only to notice that
   they have started.
   - **Gives:** no code; the change is in SKILL.md alone.
   - **Costs:** rests on every agent following the skill; the person leaves the canvas to say done;
     `changes` and `wireframe` still show the half-finished round to an agent that asks.
2. **A "Send to Claude" box on the canvas.** The legend gains a box the person ticks when the round
   is done, drawn and read like an approval box. `watch --until-sent` (and `wait_for_changes`'
   `untilSent`) ignores edits until the box is ticked, then returns the whole round as one report;
   the agent unticks it when it has read the round.
   - **Gives:** the person stays on the canvas; works in any Excalidraw; no upstream file; reuses
     ADR-005's reading.
   - **Costs:** one more element; a person must find the box; still etiquette for an agent that
     calls `changes` directly, unless option 5 is taken too.
3. **A "Send to Claude" button in the page header,** beside "Sync to Backend". It ticks option 2's
   box through the ordinary sync, and can show how many marks are waiting ("3 marks not sent").
   - **Gives:** the most obvious control, one click, a visible count; still no server route.
   - **Costs:** a change to upstream's `App.tsx` (a FORK.md row and a browser test); the button
     exists only in this page, the box stays the way in any other Excalidraw.
4. **A longer quiet period.** `--settle 30` or more.
   - **Costs:** guesses at how long a person thinks; a long pause still splits a round, and a short
     round waits for nothing.
5. **Unsent markup is held back.** `changes`, `wireframe` and their MCP tools report a person's
   edits only up to the last send; what was drawn since reads as "4 edits by a person, not sent
   yet", with no content. Needs a send signal: option 2 or 3.
   - **Gives:** "the agent waits" becomes "the agent cannot look", whatever it is told; the
     person's draft is theirs until they send it.
   - **Costs:** `changes.ts` and `wireframe.ts` (ours) filter by the last send; `describe`,
     `export` and `screenshot` still show the canvas as it is, so it holds the reading, not the
     pixels (said in the skill); a person who never sends is never read, which is the point.
6. **Send one comment now, Claude Docs-style.** A note that starts `@claude` is sent at once, on
   its own, while the rest of the round stays unsent; the agent answers it in chat, not on the
   canvas, and does not look at anything else.
   - **Gives:** a question answered mid-round without ending the round; the person chooses what is
     sent.
   - **Costs:** a typed prefix to remember (the legend says it); a person who `@claude`s every note
     makes the agent intrusive again; parsing a note's first word (ADR-004 rejected that for
     intent, but here it is an opt-in, not the main channel).
7. **The agent answers on the canvas.** After a round, the agent's reply to a comment appears as a
   note beside it, as a thread does in Claude Docs.
   - **Gives:** the conversation stays with the design.
   - **Costs:** agent notes on the person's canvas are intrusive while they draw, and must never be
     read back as the design or as markup; a role and a reading rule. Later, if at all.

## Recommendation (to decide)

Options **2 + 5 + 1**, with **3** as soon as the box proves its worth, and **6** only if a round
shows a person needing to ask mid-round:

- The person marks up undisturbed and ticks "Send to Claude" in the legend (or clicks the button,
  once built) when the round is done.
- Until then the agent cannot read the round: `changes` and `wireframe` say how many edits are
  waiting and nothing more, and `watch --until-sent` blocks until the send.
- The skill's loop says: hand over the pen, wait for the send, read the round once, answer in chat;
  never draw on the canvas during a round.
- The round's report is read once and whole, so the agent's view of it is formed once.

What would change the recommendation: a person who finds the box harder than the button (build 3
first); a round where waiting for the end cost more than a mid-round answer would have (build 6).

## Decision

Options 2, 5 and 1, as recommended. The legend gains a "Send to Claude" box that a person ticks
when a round is done. Until then `changes`, `wireframe` and their MCP tools report a person's
edits only up to the last send, and what came after as "N edits by a person, not sent yet";
`watch --until-sent` (`wait_for_changes`' `untilSent`) blocks until the box is ticked. The skill's
review loop says: hand over the pen, wait for the send, read the round once, answer in chat,
never draw on the canvas during a round. Option 3, the header button, is built once the box has
been used in a real round and found hard to reach; option 6, `@claude`, only if a round shows a
person needing to ask mid-round; option 7 not now. Decided by Lucas on 2026-11-20.

## Enforced by

Fixture and tests to be written first: a round with marks drawn after the last send reads as
"N edits not sent yet" in `changes` and `wireframe`; ticking the box returns the round from
`watch --until-sent`; an agent's own edits are never held. The skill's review loop and the legend
file updated; the round trip of rule 4 through a real tab.

## Consequences

- **Options 2, 3, 5** change what the agent can see mid-round; the skill's review loop is
  rewritten around the send.
- **Option 3** touches upstream's `App.tsx` (FORK.md); options 2 and 5 touch only our files.
- **PR 1's round 2** (KI-3) would be the first round run this way.
