<!-- status: active · updated: 2026-10-08 · class: living -->

# SPEC-003 — T-009: is the waypoint fix worth sending upstream

> The executor brief (ADR-019). Target executor: **an agent session in this repo with a terminal**.
> The *why* is the owner's word of 2026-10-08 — *"First let's update our fork then see if it is
> worth sending T-009 upstream"* — with `FORK.md` (what this fork is) and `docs/ROADMAP.md`
> § Upstream (what carrying a private change costs at each merge). This is the *how*.
> Written from a Scribe session (`pylvir-labs/Writing-App`), which filed T-009; no code in this repo
> was changed while planning.
>
> **Executed 2026-10-08, the same day, on the owner's word** (*"SPEC-003 right after the merge"*).
> Rows 1 to 3 were resolved by the run (`docs/DEVLOG.md`, 2026-10-08 (b)). **Rows 4 and 5 were
> decided by the owner the same day, in two steps: keep the fix in the fork — done, on `main` —
> and, after asking for the pull request's text, the issue search, a tab test and a count of our
> own use, hold the offer to upstream.** Nothing was sent. § Verified has the results and says
> where the patch waits (`docs/DEVLOG.md`, 2026-10-08 (c) and (d)).

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
| 1 | Does T-009 reproduce on upstream alone? | resolved | **Yes.** In a clean worktree of `upstream/main` at `96d9c21`, built and run on a private port: a bound arrow posted with four points is stored with two, `[[0,0],[412.9,247.8]]` — the fork's values to the last digit | upstream changes `resolveArrowBindings` |
| 2 | Is a straight line what upstream intends for a bound arrow? | resolved | **It is what upstream documents, and it leaves a gap between two of its own rules.** Its skill says a bound arrow "auto-route[s] to element edges", shows waypoints only on *unbound* arrows, and then rules: "If an arrow would pass through an unrelated shape, add a waypoint to route around it." A caller must choose between an arrow that follows its shapes and one that goes round an obstacle. No upstream issue asks for both (searched 2026-10-08). So this is a small feature that closes that gap, not a bug by upstream's own account, and it has to be argued | upstream documents bound arrows with waypoints |
| 3 | What should the fix do with a caller's points? | resolved | **As built.** More than two points: the ones between the first and last stay where the caller put them, and each bound end is re-anchored to its shape's edge, facing the waypoint next to it. The same rule holds when a bound shape moves, because it is the same function. An *unbound* end of a routed arrow stays exactly where it was put. None or two points: unchanged, and shown identical on three arrows | a kept waypoint ends up inside the shape it is bound to — not handled, not seen |
| 4 | Send it upstream, keep it in the fork, or drop it? | resolved | **Keep it in the fork; the offer to upstream is held.** The owner, 2026-10-08: first *"yes to all four"* to the proposal as put (keep, and offer) — the fix is on `main` since that day — then, having asked to see the pull request, the issue search, a tab test and whether so small a change is justified: *"hold the PR"*. For the fork, the reasons as proposed: its own conventions ask for bound arrows routed with waypoints (§7), which the server could not store, and Scribe carried a second pass to work round it. For upstream the case is thinner than it was put: one function, 29 lines added and 11 removed, a check in upstream's own state script, no change to any arrow without waypoints — but, counted, our own use is three routed bound arrows in one drawing, no upstream issue asks for it, and what the fork gains is not carrying 40 lines in a function upstream changed once in the 25 commits of the last merge (DEVLOG 2026-10-08 (d)) | the owner says so. Triggers the session proposes: a merge that conflicts in `resolveArrowBindings`; an upstream issue asking for routed bound arrows |
| 5 | If sent: an issue first, or a pull request directly; from which branch? | resolved | **Held with row 4** (owner, 2026-10-08). If it is sent later: one pull request with no issue first was the owner's first answer; the session's later note is that an issue first is the more cautious route, since upstream documents the straight line and has no contributing guide either way. The branch is `t009-waypoints-upstream`, one local commit; pushing it to `origin` publishes it, and that push and the pull request are the owner's to do. Its text, `PR_BODY.md`, does not name this fork (the owner's wish, 2026-10-08) | row 4 reopens |

## Execution checklist

1. ✅ Write the test cases below. Cases 1 to 4 are one check in upstream's state script; on
   unmodified upstream it fails at its first assertion (case 1).
2. ✅ `git fetch upstream`; record ahead / behind and whether `resolveArrowBindings` changed since
   `96d9c21`. Upstream is still at `96d9c21`; the fork is 35 ahead and 0 behind; no change.
3. ✅ Add a clean worktree of `upstream/main` (`git worktree add ../mcp_excalidraw-upstream
   upstream/main`), `npm ci && npm run build` there, and run its server on a private port. `:3000`
   is not touched.
4. ✅ Run test case 1 there. It fails, so the work went on.
5. ✅ Close questions 2 and 3 from what upstream's history and docs say. Upstream documents the
   straight line; the work went on because the same document asks for waypoints (row 2).
6. ✅ Write the fix and its test in the upstream worktree. `src/server.ts` +29 −11, the check +78.
7. ✅ Apply the same change to the fork and run `npm test` (test case 5) — in the spare worktree, on
   a branch cut from `main`, **not in the main checkout**: `npm test` rebuilds `dist/`, and the
   command on PATH runs from the main checkout's `dist/`. An undecided change must not reach it.
8. ✅ List, without acting on them, the other changes this fork carries in files upstream owns
   (work item 5) — in the DEVLOG note.
9. ✅ Write the decision note in `docs/DEVLOG.md`: the evidence for rows 1 to 3 and a proposal for
   rows 4 and 5. Hand off. **Nothing is sent until the owner says so.**

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

## Verified

2026-10-08, on Windows with Node 24. Every server ran on a private port.

| Case | Result |
|---|---|
| 1 · waypoints survive creation | **Fails on unmodified upstream** (`96d9c21`): four points stored as two. **Passes with the fix**, for a batch and for a single create |
| 2 · the ends are still anchored | **Pass.** Start at 268, 122 and end 8 px off the target's edge; the two waypoints at 380, 122 and 380, 422 as given |
| 3 · a plain bound arrow routes as before | **Pass, and compared across builds:** rectangle to rectangle, ellipse to diamond, and an arrow bound at one end are stored with the same `x`, `y` and `points` with and without the fix, a shape having been moved first |
| 4 · update is unchanged | **Pass.** An update with four points keeps four |
| — · a bound shape moves | **Pass** (added while writing the check): the waypoints stay, and the end follows the shape — `[[268,122],[380,122],[380,422],[606.4,497.5]]` after the target moved down 100 |
| 5 · the fork's readings do not move | **Pass.** With the same change on the fork's code: `type-check`, `npm test` 66 / 66 plus wire, bind, render and state with the new check; `tests/expected/` untouched |
| 6 · the consumer's workaround becomes unnecessary | **Pass.** On the fixed fork build, Scribe's Library scene drawn with one `add` keeps its arrows at 5, 4, 3 and 2 points and reads 3 screens, 65 components, 4 flows |

Upstream's own scripts with the fix, in its worktree: MCP wire, local-bind, render and state all
pass. **Upstream's Playwright suite: 19 / 19** on the patched build (2026-10-08 (d)), run with the
installed Chrome (`channel: 'chrome'`), because the Chromium build that Playwright version pins is
not on this machine. **Not run:** anything on Linux for upstream's tree. The fork's own tree did
run there: CI run 37758104927 on `ac7d8dd`, green, the new check passing under Node 22.

**With a browser tab** (2026-10-08 (d)). One script, a real Chrome tab on a private port, against
upstream with the patch and against upstream as it is. The scene is the pull request's own: two
rectangles, one bound arrow given four points, one bound arrow given none. On unpatched upstream
the arrow is flattened at creation, so the script routes it there with a later `update`.

| Stage | Upstream + patch | Upstream at `96d9c21` |
|---|---|---|
| created with four points, no tab | four kept: `[[268,122],[380,122],[380,422],[592,422]]` | two: `[[223.5,148.1],[636.5,395.9]]` |
| tab attaches, left alone 3.5 s; manual sync; a click and a pan; reload | four kept, unchanged | four kept, unchanged (once routed by `update`) |
| a person drags the target 100 px down in the tab | waypoints stay, the end follows: `…,[592,492.7]` | the same values |
| an agent moves the target through the API, no tab sync before it | waypoints stay, the end follows: `…,[606.4,497.5]` | flattened to two: `[[213.7,149],[646.3,495]]` |
| an agent moves the source through the API after a tab has synced | no arrow moves, routed or plain | the same |

So the tab does not undo a route, and the patch changes two server paths only: creation, and a
shape moved through the API before any tab has synced. The last row is upstream's and not the
patch's: a tab's sync stores arrows with `startBinding` / `endBinding` and without `start` /
`end`, and `rerouteBoundArrows` matches on `start` / `end` alone, so it finds nothing.

**The fork does not have that gap** (checked 2026-10-08 (e), the same kind of script on the
fork's build at `ac7d8dd`). A bound shape was moved through the API in six states — no tab; a tab
attached and not synced; after a manual sync; after a reload; after the tab's own automatic sync;
after a person dragged the shape in the tab — and both arrows followed every time. The stored
arrows keep `start` / `end` beside `startBinding` / `endBinding`, because the fork's sync merges
each element into the stored one where upstream's clears the store and rewrites it. A person's
drag in the fork's tab keeps the waypoints and moves the end, as on upstream. Pinned since
2026-10-08 (f) by a check in `scripts/check-state-integrity.mjs`, *bound arrows follow a shape an
agent moves after a tab has synced*; it fails on upstream's build.

One thing about this machine, not about the fix: upstream's `npm run test:state` timed out twice,
because it starts a server straight after a build and waits 5 s. The same script run on its own
passes. The 2026-10-07 entry saw the same and could not explain it either.

**Where the two patches are**, the same change in both (as of 2026-10-08 (d)):

- for the fork: **on `main`.** Re-run after rebasing from `6f25cb7` onto `265f7a9`: `type-check`
  clean, `npm test` 66 / 66 plus wire, bind, render and state with the new check,
  `tests/expected/` untouched. The branch it came from, `t009-waypoints-fork` in
  `C:\Projects\mcp_excalidraw-merge`, is merged and can go.
- for upstream: **held; one local commit, not pushed** — `527500b`, *fix: keep waypoints on bound
  arrows*, on branch `t009-waypoints-upstream`, cut from `upstream/main` at `96d9c21`, in
  `C:\Projects\mcp_excalidraw-upstream`. Untracked in that worktree, and lost if it is removed:
  the pull request's text, `PR_BODY.md`, which carries the suite and tab results and does not
  name this fork; and the tab script, `tests/probe/t009-tab.spec.mjs` with
  `playwright.probe.config.mjs`. The session that made the commit was refused the push of a new
  branch to a public repository by its own permission check, and did not route round it.

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
