<!-- status: active · updated: 2026-07-31 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: none archived yet.

## 2026-08-07 — Merged upstream for the first time since the fork (rule 2)
- **What:** `git merge upstream/main` — `2930519` (export fidelity) and `ecf3cac` (`.passthrough()`).
  Clean, no conflicts. Brings `src/core/expand-elements.ts` (new, 276 lines), rewrites
  `src/core/share-url.ts`, and touches `scene-io.ts`, `obsidian-md.ts`, `server.ts`. Merge commit
  `1c5925b`.
- **Why:** it fixes a live data-corruption bug in our own import path, reproduced before merging.
  Our `CreateElementSchema` had no `containerId`, `index`, `seed` or `versionNonce`, and zod strips
  unknown keys — so a scene exported with 10 bound text children came back from `import` with
  **0**. Every label detached from its shape, and the reading changed with it: `button "General"`
  became `button` plus a separate child `text "General"`, and **`input? "Project name"` became
  `card?`** — 23 components/5 inferred turned into 33/7. `wireframe --score` did **not** flag any of
  it (`fallbacks` stayed 0), so it was silent. `snapshot restore` shares the defect: restoring a
  snapshot taken while the labels were intact also returned 0 `containerId`. Both of the skill's
  documented recovery paths were corrupting drawings.
- **Rejected:** cherry-picking only the schema additions (leaves us permanently diverged on
  `share-url.ts`/`scene-io.ts`, converting a free merge into a conflicted one next time);
  reimplementing the schema fix ourselves (same outcome, all of the divergence cost, none of the
  benefit); continuing to defer (the cost only grows — every commit we add to `server.ts` widens the
  collision surface, and this was the cheapest the merge will ever be).
- **Verified:** `type-check` clean, full build, 43/43 tests, bind check. Merged schema carries
  `containerId`/`index`/`seed`/`versionNonce` on both Create and Update, `.passthrough()` on both,
  and `role: RoleSchema.optional()` still validates — so unknown props now survive without invalid
  roles slipping through. Then the decisive test, same input file as before the merge:
  **35 elements / 10 `containerId` in → 35 / 10 out**, and the reading returned to 23 components,
  5 inferred, 0 fallbacks — identical to the original drawing. `export` to both `.excalidraw` and
  Obsidian `.excalidraw.md` still work (the `expand-elements.ts` path).
- **Not tested:** `share`. It uploads the scene to excalidraw.com, and `share-url.ts` is the file
  upstream rewrote most heavily — so that is exactly the path most worth exercising and the one that
  needs a deliberate decision to publish a scene externally. Smoke-test it before relying on it.
- **Opens:** `.passthrough()` now makes `customData` viable, which is what **KI-5** (copy-paste
  destroys a declared `role`) and Phase 3 have been waiting on — the roadmap item is no longer
  blocked on upstream. Nothing else changed for our layer: upstream has never touched
  `wireframe.ts` or `changes.ts`, which is why this merged clean at 14 commits of divergence.

## 2026-08-07 — A multi-tab guard, and fixing the regression the echo fix introduced
- **What:** two changes from two failed attempts at the PR 1 markup round. (1) `multiClientWarning`
  in `src/cli/util.ts`, wired into `changes` and `watch` — warns on stderr *and* in-band in the
  report when `/health` shows more than one browser tab connected; in `watch` it fires **before** the
  wait. (2) `boundChildSupersedesLabel` in `src/core/changes.ts`, applied on the sync handler's
  no-delta path in `src/server.ts`. Seven new assertions across
  `tests/multi-client-guard.test.mjs` and `tests/frontend-echo.test.mjs`.
- **Why (1):** with two tabs open, each POSTs its whole scene and the handler reads "absent from this
  payload" as "the human deleted it", so the tabs delete each other's elements indefinitely. It wiped
  a complete round of human markup — 386 adds against 385 deletes, six annotations gone,
  unrecoverable because change records carry no geometry. `changes` reported "1 change" because the
  adds and deletes cancelled out. Logged as **KI-7**; the protocol fix is a separate ADR.
- **Why (2):** **this was a regression introduced by the same day's echo fix.** Suppressing the
  browser echo meant the first sync no longer produced a delta — which was the point — but the early
  `continue` on the no-delta path skips the merge branch that drops a shape's agent-format `label`
  once Excalidraw has expanded it into a bound text child. So every shape kept a `label` that each
  new client load re-expanded into another duplicate child: 10 shapes across 4 tab loads produced 40
  stray text elements. The comment at that branch already warned that keeping the label "would leave
  two competing sources of truth"; the fix moved the code path around it without noticing it was
  load-bearing.
- **Rejected:** reverting the echo fix (removes the regression but restores the original bug —
  phantom human writes and markup detection silently off; trades a visible problem for an invisible
  one); making the *merge* path's label-drop conditional on a bound child existing too (a real
  behaviour change to a path that is working — the new predicate is applied only where the gap was);
  hard-refusing to run with two tabs (there is no legitimate multi-tab case, but a refusal blocks
  reads that are perfectly safe, and a loud warning in both channels already makes the condition
  impossible to miss).
- **Verified:** 43/43 tests, `type-check` clean. Live, after **two** page reloads on a fresh server:
  35 elements (25 agent + exactly 10 bound labels), **0 duplicated containers**, **0 shapes carrying
  a stale label**, `origins: {"agent":25}`, `trustOrigin: true`, and `rev` still **25** — the browser
  echo is now completely inert, which is a stronger result than the morning's fix alone produced. The
  guard was confirmed silent at one client; its warning text is unit-tested, and the field it reads
  is the same `websocket_clients` that read `2` while diagnosing KI-7.
- **Opens:** **PR 1's attribution number is still untaken** — three attempts today, defeated by
  `trustOrigin`, then by KI-7, and the third round was never drawn. Everything blocking it is now
  fixed; it needs one sitting.
- **Upstream (rule 2):** this change edits `src/server.ts`, the collision zone. Upstream's two
  commits (`2930519`, `ecf3cac`) were re-checked — still no conflicts — and the merge was
  **deliberately deferred** so a bug fix and a five-file upstream merge are not reviewed together.
  The deferral is the decision rule 2 asks for, not an omission. Take the merge as its own step;
  `ecf3cac`'s `.passthrough()` remains what `customData` and KI-5 need.

## 2026-08-07 — ADR-002 accepted: the geometry lint's shape (ROADMAP PR 4)
- **What:** `docs/decisions/ADR-002-geometry-lint.md`, accepted. A `--lint` flag on `wireframe` with
  the findings also under `lint` in `wireframe --json`; two severities, only reading-affecting rules
  as errors; reporting only, no exit-code gate. No code yet.
- **Why:** the lint's central check *is* the reader's nesting computation, so it must consume
  `readWireframe`'s model rather than re-derive geometry — a lint that disagreed with the reader
  about containment would be worse than none. Carrying `lint` inside `wireframe --json` also hands
  the planned browser panel tree, score and findings in one request, against one consistent snapshot
  of a canvas someone may still be editing.
- **Rejected:** folding findings into `--score` (conflates "the reading succeeded" with "the drawing
  is well-formed", and changes a contract four consumers already assert on); a separate `lint`
  command (splits the canvas into two reads that can race); relying on Excalidraw's own grid and
  object snapping (helps only a human, only at draw time, only for position — and the 4.29px failure
  that motivated this was produced by a human dragging *with* those aids on); gating now
  (the tolerances are uncalibrated, and gating on unvalidated numbers teaches people to bypass it).
- **Opens:** two ⚠ in the ADR's Confidence block. Every numeric tolerance is currently a guess — the
  conventions state targets, not tolerances — and the error/advisory split is a judgement call in
  which only containment has been *demonstrated* to change a reading. Both need calibrating against
  the corpus before the advisory rules ship, with the chosen values and their evidence recorded in a
  SPEC alongside the code.

## 2026-08-07 — The first human markup round, and the origin bug it exposed (ROADMAP PR 1)
- **What:** ran the two-way review loop with a person at the canvas for the first time (KI-3). It
  broke before a single annotation was drawn. Fixed the load-bearing defect:
  `canonicalizeElement` now drops width/height for text elements, and `diffCanonical` compares
  through a new `fieldsEqual` that treats "unset" and the editor's own default-fill as equal
  (`EDITOR_DEFAULTS`). Eight assertions in `tests/frontend-echo.test.mjs`. Also documented `watch`'s
  240s ceiling in the skill and cheatsheet, then `npm run sync:skills`.
- **Why:** opening the canvas in a browser — which the loop *requires*; the tab is the transport —
  makes Excalidraw echo the whole scene back with every unset style property filled in
  (`fillStyle: null → "solid"`, `strokeWidth: null → 2`, …) and every text box re-measured
  (`width 400 → 177.75`). The server stamps anything arriving from the browser `human`, so all 25
  agent-drawn elements were restamped in one write. Two failures followed. `changes` offered 25
  normalization records as the human's design feedback, against a skill that says "only `by human`
  entries are feedback". And `trustOrigin` — `allElements.some(el => el.origin === 'agent')`,
  `src/core/wireframe.ts:531` — went false, so `collectMarkup` silently stopped detecting everything
  except freedraw. The headline feature of the review loop could not work in its own documented
  workflow, and no fixture could show it: the corpus reads `.excalidraw` off disk and never passes
  through a browser.
- **Rejected:** normalizing at creation time in `normalize.ts` so the echo matches (the true root
  cause, but that file is collision-zone under rule 2 with an undecided upstream merge open, and it
  would not repair elements already stored); absorbing the frontend's concrete values on a no-delta
  echo so storage becomes concrete and *later* style-only edits stay detectable (correct, and the
  better long-term shape — but it lives in `server.ts`, also collision-zone); treating unset as equal
  to *any* value (would permanently suppress "the human filled this shape red" on any property the
  agent never set — hence a per-field default map, so a non-default value still reports); a
  live-server test driving `POST /api/elements/sync` (the honest level for this, but ADR-001 keeps
  the server out of the suite deliberately, and the defect is in a pure comparison function that a
  unit test pins exactly).
- **Verified:** the tests were proved to fail before being trusted — stash the fix and 3 of 8 fail,
  and it is the right 3: the echo guards fail, the five "real edits still report" assertions pass
  either way. Then end-to-end on the live canvas: *before*, opening the tab produced 25 phantom
  `human` records and `trustOrigin: false`; *after*, the identical action produced `No changes — the
  canvas is exactly as you left it`, `origins: {"agent":25}`, `trustOrigin: true`. Full suite 36/36,
  `type-check` clean, and no golden moved — the fix does not change how any fixture reads.
- **Opens:** **PR 1's number is still unmeasured.** Markup attribution accuracy needs a person to
  draw annotations and the session pivoted to feature design before that; the blocker is gone but the
  measurement is not taken. New: KI-5 (copy-paste in the browser destroys a declared `role` —
  screen 1 read `button "General"`, its copy read `button? "General"`) and KI-6 (`changes` attributed
  a 1160x1180 duplicated screen frame as `annotates` a 540x48 input, because `looksLikeAnnotation`
  accepts any transparent rectangle at any size). Agreed next: a geometry lint — `--score` reported
  "1 screen could not be named" where the cause was a footer sitting 4.29px outside its frame; the
  lint should report the cause. Core lint first with a JSON contract, browser panel as a thin view
  over it. Needs an ADR.
- **Upstream (rule 2):** `git fetch upstream` at session start — upstream has moved for the first
  time since the fork. `2930519` (export fidelity: preserves `containerId`, `index`, `seed`,
  `versionNonce`, `updated` through import; new `src/core/expand-elements.ts`) and `ecf3cac`
  (`.passthrough()` on the create/update element schemas). Both touch `src/server.ts`;
  `git merge-tree` reports **no conflicts**. **Decision deferred** — nothing this session touched the
  collision zone, so the merge was not needed to proceed. It is directly relevant to Phase 2's
  `customData` plan (`.passthrough()` is the mechanism that would let it survive), and to KI-5.
  Decide next session.

## 2026-08-01 — `wireframe --score`, and the reading now reports its own failures (ROADMAP PR 3)
- **What:** `wireframe --score` emits the pre-flight counts as JSON and nothing else; `wireframe
  --json` carries the same object under `score`; and `formatWireframe` grew a `### Reading quality`
  block that appears **only** when `fallbacks`, `unnamedScreens` or `orphans` is non-zero. Skill,
  cheatsheet and conventions §9 updated, then `npm run sync:skills`.
- **Why:** the roadmap asked for the flag. The report block is the same counts aimed at the other
  consumer: the MCP tool `describe_wireframe` takes no arguments, so a CLI-only flag would leave an
  agent reading its own drawing back with no way to be told the reading gave up — which is exactly
  who needs telling.
- **Rejected:** always printing the quality block (a clean reading should not carry a paragraph
  saying nothing is wrong, and it would have churned every golden); making `inferred` a warning
  (`?` marks are normal — `list-detail` has 5 and reads correctly, so warning on them would train
  the reader to ignore the block); a `--check` flag that exits non-zero on a bad score (a gate is a
  bigger decision than "emit the number", and nothing asked for it yet).
- **Verified:** live CLI round-trip on both a clean and a deliberately-bad drawing — 21 components
  all zero, versus 3 fallbacks and 1 unnamed screen. The corpus caught the report change and scoped
  it exactly: 1 of 5 goldens moved, +5 lines, the other four byte-identical.
- **Opens:** nothing new. Phase 1 now hangs entirely on PR 1, the human markup round.

## 2026-08-01 — Fixture corpus + the repo's first test harness (ROADMAP PR 2)
- **What:** five `.excalidraw` fixtures drawn through the real CLI, each with a hand-authored
  expectation and a golden reading; a `node:test` harness (28 assertions) reading them off disk;
  `scoreWireframe()` exported from `src/core/wireframe.ts`; `npm test` / `test:corpus` /
  `corpus:update`; and a CI `test` job. Decision in `docs/decisions/ADR-001-fixture-corpus-harness.md`,
  the how-to in `docs/specs/SPEC-001-fixture-corpus.md`.
- **Why:** `wireframe.ts` (32 KB) and `changes.ts` (27 KB) carry the whole differentiator and had no
  regression coverage at all — CI ran `type-check` and `build` and nothing else. Every inference
  change was being validated by looking at a screenshot, which the roadmap already calls too weak.
- **Rejected:** Vitest (a dependency tree and a transform this project does not otherwise need);
  driving the canvas server inside the tests (slow, order-dependent, and it *destroys* the thing
  being tested — the server stamps `origin: "agent"`, so markup attribution becomes untestable);
  a text-golden-only corpus (regenerable in one command, so eventually regenerated unread).
- **Verified:** the harness was proved to fail before being trusted — moving
  `HEADING_MIN_FONT_SIZE` 20 → 24 broke all five golden readings (23 pass / 5 fail), then reverted.
- **Opens:** PR 3 is now just a CLI flag over `scoreWireframe()`. Markup attribution has a first
  number (4/5) and a miss worth chasing: a note binds to the input above the card it sits level
  with. The corpus does not cover the create/normalize path, since fixtures are read from disk.

> Entries below dated 2026-07-31 were backfilled on 2026-08-01 from the commits and the baton; they
> are short by intent, not by neglect.

## 2026-07-31 — Adopt the claude-project-conventions standard
- **What:** `cpc-init --profile standard`, then filled `AGENTS.md`, `.claude/CONTEXT.md`,
  `docs/ROADMAP.md`, `.claude/KNOWN_ISSUES.md`. Cut the 8 branches inherited from upstream off
  `origin` (each verified byte-identical to its `upstream/` counterpart first) and deleted the
  merged local `fix/wireframe-role-inference`. Only `main` remains. Commit `f559c7f`.
- **Why:** the fork had no coordination layer of its own — no baton, no context file, no roadmap —
  so every session re-derived the state from git log.
- **Opens:** the roadmap's PR 1 (human markup round) and PR 2 (fixture corpus) as the named next
  work.

## 2026-07-31 — Make the fork stand on its own
- **What:** renamed the package to `@ldele/mcp-excalidraw-server`, set `"private": true`, bumped to
  1.2.0, and repointed all 35 `npx mcp-excalidraw-server` invocations at the local
  `excalidraw-canvas` binary. Dropped `demo.gif`, both Dockerfiles, compose, and the docker and
  npm-publish workflows. Fixed CI badges pointing at upstream's Actions. Added `FORK.md`.
  Commit `8bc6afb`.
- **Why:** the skill told agents to `npx mcp-excalidraw-server` — upstream's package, at the same
  version number this fork carried. `npx` therefore fetched a build with no `wireframe` and no
  `changes` command, silently.
- **Rejected:** publishing the fork under its own name on npm — nothing outside this machine
  consumes it, so `private` is the cheaper guarantee.
- **Opens:** KI-1 (anything outside this repo that memorised the old `npx` line is still wrong) and
  KI-2 (the `demo.gif` blob is still in history).
