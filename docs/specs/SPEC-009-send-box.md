<!-- status: active · updated: 2026-11-20 · class: living -->

# SPEC-009 — a person's markup reaches the agent when they send it (ADR-007)

> The executor brief (cpc ADR-019). Target executor: **an agent session in this repo with a terminal
> and a browser** (the round trip of rule 4 needs a real tab). The *why* is
> `docs/decisions/ADR-007-markup-is-sent-not-watched.md` (accepted 2026-11-20, options 2 + 5 + 1);
> this SPEC is the *how* and does not reopen the choice. Written 2026-11-20 by the session the
> owner gave the build to.
>
> **Built 2026-11-20, staged on `main`, not committed.** Every test case below ran; § Verified
> gives each result.

## Reader and what changes
- **Reader:** the session building ADR-007, then the owner reviewing the staged diff; after it, any
  agent running a review round, and the person marking up.
- **What changes for them:** the legend carries a "Send to Claude" box. The person marks up
  undisturbed and ticks it when the round is done. Until then the agent's readings say how many
  edits are waiting and nothing more; `watch --until-sent` returns the whole round once, at the
  send, and clears the box for the next round.

## Goal

An element whose id is `legend-send` is the Send box. A person's mark inside it, or a person's
fill of it, sends the round. A person's edits after the last send are held back from `changes`,
`wireframe` and their MCP tools, which print `⏸ N edits by a person, not sent yet.` instead. The
agent's own edits are never held. Every scene with no Send box reads exactly as before.

## Hard constraints
- **ADR-007, decided:** the box in the legend (option 2); unsent markup held back from the reading
  (option 5); the skill's loop rewritten around the send (option 1). No header button, no
  `@claude`, no agent notes on the canvas.
- **No file of upstream's:** `src/server.ts`, `src/index.ts`, `src/core/normalize.ts` and
  `frontend/src/App.tsx` untouched (upstream checked 2026-11-20, empty). `--until-sent` therefore
  waits on the client, over the existing `/api/changes/wait`; `src/core/mcp-dispatch.ts` carries
  our three tools already (FORK.md) and gains one parameter.
- **`AGENTS.md` rules 1–5:** stage, never commit; edit `skills/` then sync; the round trip through
  a real tab on a private port; never stage `tools/conventions/`.
- **CONVENTIONS §16:** the send rule is its own pure module, `src/core/send-box.ts`; the network
  glue shared by the CLI and MCP is `src/core/send-round.ts`.

## Open questions
- **familiarity:** wireframe semantics — **high** (the owner's call closes a row). Each row is the
  executor's call within the ADR, made so the build could go ahead.

| # | Question | Status | Resolution + reason | Reopens if |
|---|----------|--------|--------------------|------------|
| 1 | How is the box told apart? | resolved | **An id rule:** exactly `legend-send`. It is a legend member, so the reading already leaves it and anything drawn inside it out (ADR-004), and one box per canvas is all a round needs. | two reviews share one canvas |
| 2 | What sends? | resolved | **A person's mark whose centre lies inside the box, or a person's fill of it,** in any colour, as the approval box (ADR-005). | — |
| 3 | Where does a round start? | resolved | **At the agent's latest write to the box:** its `rev` while the agent last touched it; else the log's latest agent record for it; else 0. Drawing the legend starts round 1; the reset after a read starts the next. | — |
| 4 | What is held? | resolved | **A person's edits with a rev after the boundary:** the tick's rev once sent, the round start until then. The ticks themselves are not counted. | — |
| 5 | How does `changes` hold them? | resolved | **Exactly:** the held records are left out of the report, and one line counts them. | — |
| 6 | How does `wireframe` hold them? | resolved | **Elements a person created after the boundary are left out** (the log's create records, origin `human`); **a person's edit to an element that already existed stays as it is now and is counted.** The log's update deltas are canonical (a label is resolved from its bound text), so undoing them would rebuild a scene that never existed. With the log truncated, every element a person last touched after the boundary is left out. | a person's move or relabel read before the send misleads a round |
| 7 | How is the box cleared? | resolved | **`watch --until-sent` clears it after reporting:** it deletes the ticks inside the box and draws the box again, same place, size, label and frame. A fresh create is a write the server always records, so it starts the next round. | — |
| 8 | What if `--until-sent` times out? | resolved | **It reports `Not sent yet: N edits by a person waiting.` and exits 0,** like `watch`'s own timeout; the agent calls it again. With no Send box on the canvas it is a usage error (exit 2) that says to apply the legend. | — |

## Execution checklist
1. Write the test cases below; see them fail.
2. `src/core/send-box.ts`, then `src/core/send-round.ts`.
3. `changes`, `watch`, `wireframe` in the CLI; `get_canvas_changes`, `wait_for_changes`,
   `describe_wireframe` in MCP.
4. The legend's box and line; conventions § 8; SKILL.md's loop; README; sync the skills.
5. The live round trip (test case 9).
6. Docs: DEVLOG, CONTEXT, FORK.md, README, this SPEC's § Verified.

## Work items
| # | Item | Files | Acceptance |
|---|------|-------|------------|
| 1 | The id rule, ticks, round start, boundary, held records and elements | `src/core/send-box.ts` | cases 1–5 |
| 2 | Held report, held scene, wait until sent, clear the box | `src/core/send-round.ts` | cases 6–8 |
| 3 | CLI and MCP use it | `src/cli/commands/changes.ts`, `src/cli/commands/scene.ts`, `src/core/mcp-dispatch.ts`, `src/core/mcp-tools.ts` | cases 6–8 |
| 4 | The box in the legend; the skill's loop | `skills/excalidraw-skill/references/markup-legend.json`, `…/wireframe-conventions.md`, `…/SKILL.md`, `README.md` | cases 9, 10 |

## Test cases (write these first — checklist step 1)
| # | Name | Assertion | Path |
|---|------|-----------|------|
| 1 | the id rule | `legend-send` is the box; `send`, `legend-sender`, `s01-send` are not | `tests/send-box.test.mjs` |
| 2 | what sends | a person's stroke inside the box sends; a person's fill sends; an agent's stroke inside does not; a person's note beside the box does not | same |
| 3 | round start | the box's rev while the agent last wrote it; the log's latest agent record once a person filled it | same |
| 4 | held, not sent | with the box unticked, a person's edits after the round start are held and an agent's are not; with no box nothing is held | same |
| 5 | held, sent | once ticked, a person's edits up to the tick are released and those after it held; the tick is not counted | same |
| 6 | `changes` holds | against a real server: a person's note synced before the send is absent from the report, which says `1 edit by a person, not sent yet`; after a tick it is in | `tests/send-round.test.mjs` |
| 7 | `wireframe` holds | a note a person created after the round start is not an annotation in the reading; after the tick it is | same |
| 8 | wait and clear | `waitUntilSent` returns once a tick is synced, with the round's notes in the report; the tick is gone after, the box is there again, and a note drawn next is held | same |
| 9 | the round trip, live | on a private port with a real tab: the agent draws a screen and the legend; a person draws a red note in the tab; `wireframe` and `changes` hold it; the person ticks the box; `watch --until-sent` returns the note; the box is clear | this SPEC § Verified |
| 10 | the docs say how | the legend has the box and its line; conventions § 8 and SKILL.md's loop say hand over, wait for the send, read once, answer in chat; `npm run sync:skills` | review |

## Verified

In the main checkout, 2026-11-20, Windows 11, Node 24.

| Case | Result |
|---|---|
| 1–5 · the rule | **Pass**, 9 tests in `tests/send-box.test.mjs`. Not red first: `send-box.ts` was written just before them, so they never ran against a missing module |
| 6–8 · against a real server | **Pass**, 5 tests in `tests/send-round.test.mjs`: a note held from `changes` and `wireframe`, then released by a tick; the agent's own edit never held; `waitUntilSent` returns the round, the tick is gone, the box is redrawn by the agent in its frame, the next note is held; a timeout counts what waits; no box refuses. The test draws the skill's own legend file |
| 9 · round trip, live | **Pass** on port 3011 (in memory) with a real tab: a screen and the legend added by `apply`, 0 fallbacks. A red ellipse drawn round the button in the tab: `wireframe` printed `⏸ 1 edit by a person, not sent yet.` and 0 annotations, `changes` the same line. A green stroke drawn in the Send box with the editor's pen: `watch --until-sent` returned `Round sent at rev 20`, the ellipse `by human · change ↳ circles / marks [s01-submit]`, and `The Send box is clear for the next round.` The tab then showed the box without the tick; `wireframe` read 1 annotation and no held line. A blue ellipse drawn next was held again |
| 10 · the docs say how | The legend's line and box; conventions § 8; SKILL.md's command table and loop steps 2–4; the MCP tools' descriptions and `untilSent`; README's Markup row; FORK.md; `npm run sync:skills` |
| Gates | `type-check` and the frontend type-check: pass. `node --test tests/**/*.test.mjs`: 272 / 272. `check-mcp-stdio`: 6 / 6. `test:bind`: pass. Not run: the render, state, durable, share and paths checks and the browser suite, which touch nothing changed here (no frontend file changed) |

## Out of scope
- A Send button in the page header (ADR-007 option 3; built afterwards, 2026-11-20, see ADR-007
  § Enforced by), `@claude` (6), agent notes on the canvas (7).
- Holding back `describe`, `export`, `screenshot` or the page itself: the reading is held, not the
  pixels (ADR-007 option 5's cost, said in the skill).
- Undoing a person's edits to existing elements in the reading (row 6).

## Docs to touch when this lands
- this SPEC, last: § Verified, then the shipped line and `status: archived · class: append-only`.
- README's differences table (its Markup row) · FORK.md (`mcp-dispatch.ts`) · docs/DEVLOG.md ·
  .claude/CONTEXT.md · ADR-007's "Enforced by".
