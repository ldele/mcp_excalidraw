<!-- status: active · updated: 2026-10-08 · class: living -->

# SPEC-003 — T-009: is the waypoint fix worth sending upstream

> The executor brief (ADR-019). Target executor: **an agent session in this repo with a terminal**.
> The *why* is the owner's word of 2026-10-08 — *"First let's update our fork then see if it is
> worth sending T-009 upstream"* — with `FORK.md` (what this fork is) and `docs/ROADMAP.md`
> § Upstream (what carrying a private change costs at each merge). This is the *how*.
> Written from a Scribe session (`pylvir-labs/Writing-App`), which filed T-009; no code in this repo
> was changed while planning.

## Goal

Put one decision in front of the owner with its evidence: **send the fix for T-009 to
`yctimlin/mcp_excalidraw`, keep it in the fork, or drop it.** T-009 is that a bound arrow's waypoints
are dropped when the arrow is created. This spec reproduces it on upstream alone, writes the
smallest fix on upstream's own tree, and measures what the fix costs. **It sends nothing.**

**What is known, 2026-10-08.**

- Reproduced on the fork at 1.2.0, with no tab attached: an arrow added with `startElementId`,
  `endElementId` and `"points": [[0,0],[120,0],[120,300],[340,300]]` is stored as
  `[[0,0],[412.9,247.8]]`. `update` with the same four points keeps all four (T-009).
- Read from the code, not run: `resolveArrowBindings` in `src/server.ts` ends by replacing
  `el.points` with a two-point line from edge to edge. The function is the same on
  `upstream/main` at `96d9c21` (its line 661) and on `merge/upstream-2.1.2` (line 829), and the
  fork has never changed it.
- It is called from three places on the merged code: creating one element (line 445), creating a
  batch (line 895), and `rerouteBoundArrows` (line 849), which runs when a shape an arrow is bound
  to moves. So waypoints are also lost when a bound shape is moved. That third case is not in
  T-009 and has not been run.
- Upstream has worked on this function on purpose: `6dfae34` (#60, bindings kept on create) and
  `3e62b83` (a comment on bound-arrow rerouting). A straight line may be what it intends.
- Upstream takes small fixes from outside quickly: #126 and #127, from two other authors, were
  merged on 2026-10-05. Large ones wait: #74 has been open since 2026-04-16.

## Hard constraints

- **Not before SPEC-002 is on `main`.** The patch is written against the code the fork then stands
  on, and step 1 re-reads upstream first.
- **Nothing leaves this machine without the owner's instruction for that one action.** No issue,
  no comment, no pull request on `yctimlin/mcp_excalidraw`, and no push of a patch branch to
  `origin`: this repository is public, so a pushed branch is already published. A pull request is
  under the owner's name, and `FORK.md` describes this fork as kept for our own use.
- **`AGENTS.md` rule 1 — stage, never commit.** Stage and hand off.
- **`.claude/CONTEXT.md` rule 2 — fetch upstream first.** The fix is in `src/server.ts`, the
  collision zone.
- **`.claude/CONTEXT.md` rule 4 — the round-trip closes.** `tests/expected/` must not change. The
  `two-screen-flow` fixture holds a bound cross-screen arrow; its reading is the regression check.
- **The upstream patch holds nothing of ours.** No `rev`, no `origin`, no change record, nothing
  from `wireframe.ts` or `changes.ts`. It is written and tested in a clean worktree of
  `upstream/main`, not in the fork.
- **CONVENTIONS §16 (test weight).** The test for upstream goes where upstream keeps its own
  (`scripts/check-state-integrity.mjs`, or `tests/browser/` only if a page is needed). No new
  test dependency.

## Open questions

- **familiarity:** fork / upstream contribution policy — **high** (rows 4 and 5 are the owner's).
  How a bound arrow should treat waypoints — **medium** (rows 2 and 3: research first, then
  confirm or veto).

| # | Question | Status | Resolution + reason | Reopens if |
|---|----------|--------|--------------------|------------|
| 1 | Does T-009 reproduce on upstream alone? | open | Closed by test case 1. Expected yes: the function is identical. Until it is run this is a reading of code | upstream changes `resolveArrowBindings` before the run |
| 2 | Is a straight line what upstream intends for a bound arrow? | open | Read #60, `3e62b83` and the skill's arrow guidance; look for an issue asking for routed arrows. If upstream means it, the patch has to be argued, not just sent | — |
| 3 | What should the fix do with a caller's points? | open | Proposed: when more than two points are given, keep the interior ones and re-anchor only the first and last to the shapes' edges; with none or two, route as today. To settle: the same rule for `rerouteBoundArrows` when a shape moves, or keep the waypoints and re-anchor one end | a kept waypoint ends up inside the shape it is bound to |
| 4 | Send it upstream, keep it in the fork, or drop it? | open | **The owner's.** Proposed test: it reproduces upstream (1), upstream does not intend the straight line or accepts the argument (2), and the patch is one function and under about 40 lines with a test. If so, send: a fix kept here is a private change in `server.ts` to carry through every merge | the fork stops tracking upstream |
| 5 | If sent: an issue first, or a pull request directly; from which branch? | open | **The owner's.** Proposed: one pull request with the reproduction in its description, from a branch cut from `upstream/main` | upstream asks for an issue first |

## Execution checklist

1. Write the test cases below. Cases 1 to 4 run against upstream's tree; record which fail there.
2. `git fetch upstream`; record ahead / behind and whether `resolveArrowBindings` changed since
   `96d9c21`.
3. Add a clean worktree of `upstream/main` (`git worktree add ../mcp_excalidraw-upstream
   upstream/main`), `npm ci && npm run build` there, and run its server on a private port. `:3000`
   is not touched.
4. Run test case 1 there. **If it passes, stop:** upstream does not have the defect, T-009 is the
   fork's to explain, and question 4 is "drop".
5. Close questions 2 and 3 from what upstream's history and docs say. Stop and report if upstream
   plainly intends the straight line.
6. Write the fix and its test in the upstream worktree. Record the patch size.
7. Apply the same change to the fork's `main` and run `npm test` (test case 5).
8. List, without acting on them, the other changes this fork carries in files upstream owns
   (work item 5).
9. Write the decision note in `docs/DEVLOG.md`: the evidence for rows 1 to 3 and a proposal for
   rows 4 and 5. Stage; hand off. **Nothing is sent until the owner says so.**

## Work items

| # | Item | Files | Acceptance |
|---|------|-------|------------|
| 1 | Reproduce on upstream alone | the upstream worktree; no file changed | test case 1 fails there, with the stored points in the DEVLOG |
| 2 | Read upstream's intent | `git log` on `resolveArrowBindings`, #60, the skill's arrow section, its issue list | questions 2 and 3 are resolved or parked with a source |
| 3 | The fix, on upstream's tree | `src/server.ts` (`resolveArrowBindings`, and `rerouteBoundArrows` if question 3 says so); `scripts/check-state-integrity.mjs` | test cases 1 to 4 pass in the upstream worktree; its own `npm test` still passes |
| 4 | The same fix on the fork | `src/server.ts` | test case 5; `git diff` against the upstream patch shows no difference inside the function |
| 5 | Inventory of what else the fork carries in upstream's files | none changed; a table in the DEVLOG | each of `src/server.ts`, `src/core/expand-elements.ts`, `src/core/normalize.ts`, `frontend/src/` sorted into: plumbing for our own features, or a fix upstream lacks (T-013's label export and the `replace` change record are the two known candidates) |
| 6 | The decision note | `docs/DEVLOG.md`, `docs/TICKETS.md` through `cpc-ticket` | T-009 carries the result; rows 4 and 5 have a proposal and are the owner's to close |

## Test cases (write these first — checklist step 1)

| Name | Assertion | Path |
|------|-----------|------|
| 1 · waypoints survive creation | two rectangles and an arrow bound to both, posted in one batch with four points: the stored arrow has four points. Fails today with two | `scripts/check-state-integrity.mjs` in the upstream worktree (extend) |
| 2 · the ends are still anchored | in the same scene the first and last stored points lie on the two shapes' edges with the usual gap, and the two interior points are where the caller put them | same |
| 3 · a plain bound arrow routes as before | the same scene with no `points`, and with two, stores the two-point edge-to-edge line it stores today | same |
| 4 · update is unchanged | `update` of a bound arrow with four points keeps four, as it does today | same |
| 5 · the fork's readings do not move | on the fork with the fix: `npm test` passes and `git diff --quiet -- tests/expected` exits 0; `two-screen-flow` still reads its navigation | `tests/wireframe-corpus.test.mjs` (existing) |
| 6 · the consumer's workaround becomes unnecessary | Scribe's `scripts/open_wireframe.py --load docs/wireframes/library.excalidraw` draws arrow `f-open` with its five points when its second pass (`update`) is skipped | manual, from `pylvir-labs/Writing-App`; recorded in the DEVLOG |

## Estimate

- **estimate:** S / 3–4 h  <!-- planner judgment, not a measurement: the upstream worktree and
  the reproduction 1 h, reading intent 0.5 h, the fix and its test 1–1.5 h, the port and the
  corpus 0.5 h, the inventory and the note 0.5 h. Sending, if the owner chooses it, is not in
  this figure. -->

## Out of scope

- **Sending anything.** Opening the issue or the pull request is its own step, on the owner's
  instruction, after this spec's note.
- T-008 (a short-form label takes the border colour), T-010 (the tab's own adjustments read as a
  person's, and the lost flows), T-011 (to be re-tested on the merged build — SPEC-002 § What is
  left, step 6). Each may turn out to be upstream's as well; the inventory names them, nothing more.
- Acting on the inventory in work item 5. A second pull request is a second decision.
- Auto-routing arrows around shapes. This keeps the points a caller gave; it does not invent any.
- Removing Scribe's workaround. That is a change in that repository, after the fix is in a build
  it uses.

## Docs to touch when this lands

- `docs/DEVLOG.md` — the decision note: reproduction, upstream's intent, patch size, the inventory
- `docs/TICKETS.md` — T-009, through `cpc-ticket` (`triage` with the result, or `close`)
- `.claude/SESSION.md` — baton
- `docs/ROADMAP.md` § Upstream — the policy this sets: when a base fix is offered upstream
- `FORK.md` — only if something is sent: what we offered upstream and what became of it
