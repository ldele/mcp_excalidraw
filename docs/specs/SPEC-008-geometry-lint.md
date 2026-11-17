<!-- status: active · updated: 2026-11-17 · class: living -->

# SPEC-008 — the geometry lint (ADR-002, ROADMAP PR 4)

> The executor brief (cpc ADR-019). Target executor: **an agent session in this repo with a
> terminal.** The *why* is `docs/decisions/ADR-002-geometry-lint.md` (accepted 2026-08-07); this
> SPEC is the *how*, and records the tolerances ADR-002 left uncalibrated (its Confidence, ⚠) with
> their evidence. Written 2026-11-17 by the session the owner gave PR 4 to.
>
> **Built 2026-11-17, staged on `main`, not committed.** Every test case ran; § Verified gives each
> result. The module named `reader-thresholds.ts` while planning is `reader-rules.ts`: it holds
> `declaredRole` and the row rule as well as the numbers.

## Reader and what changes
- **Reader:** the session building PR 4, then the owner reviewing the staged diff; after it, any
  agent checking a drawing before handing it to a person.
- **What changes for them:** a drawing that is a few pixels from a different reading says so at
  the cause: `[ftr] is 4.29px outside [s1]` instead of "1 screen could not be named". The plain
  reading shows a `### Drawing quality` block only when something changes what the reading is;
  `wireframe --lint` lists everything, house style included.

## Goal

`lintWireframe` turns the reader's own model into findings, each with a stable `ruleId`, a
`severity` (`error` changes the reading; `advisory` is house style), the `elementId`, a `message`
and the `measured` value. `wireframe --lint` prints them; `wireframe --json` carries them under
`lint`; the plain reading (and so `describe_wireframe`) gains `### Drawing quality` when there is
at least one error. Nothing gates: the exit code is unchanged.

## Hard constraints
- **ADR-002, decided:** a `--lint` flag on `wireframe`, `lint` in `--json`, computed from
  `readWireframe`'s model (the lint never re-derives containment or rows); two severities;
  errors in the plain reading, advisories behind the flag; reporting only.
- **The reader's numbers, not the conventions' prose.** Where they differ, the lint uses what the
  reader does (a header must span 80% of its edge in `classify`, though conventions § 4 says 90%),
  and the conventions are corrected to match.
- **`AGENTS.md` rules 1–5:** stage, never commit; upstream checked 2026-11-17, empty, and none of
  `src/server.ts`, `src/index.ts`, `src/core/normalize.ts` is touched; edit `skills/` then sync;
  rule 4's corpus run; never stage `tools/conventions/`.
- **Every stored reading stays as it is,** except the new fixture's; the score's shape is unchanged.
- **CONVENTIONS §16:** the lint is its own module, `src/core/wireframe-lint.ts`; the thresholds it
  shares with the reader move to `src/core/reader-thresholds.ts` so neither copies the other.

## Calibration (2026-11-17)

Measured on the ten corpus fixtures (`tests/fixtures/`), every one of which reads as intended, so
any finding there is a false positive unless the fixture was drawn to show it.

| Candidate rule | Corpus hits | Decision |
|---|---|---|
| A sibling overlapping a larger sibling, ≤ 20px outside it | 0 | **error** `containment-near-miss`, tolerance 2 < out ≤ 20px (2 is the reader's own containment slack; 20 from ROADMAP PR 4 and the 4.29px case) |
| Side-by-side siblings that overlap vertically yet read as two rows | 0 | **error** `row-split`: vertical overlap > 0 and ≤ 50% of the shorter, the reader's row rule |
| Row members whose tops differ | 1 (list-detail: an avatar and a name, 11px apart, one row) | **rejected**: centred items differ in `y` and read right; `row-split` is the case that changes the reading |
| A band flush to an edge that misses the reader's header / footer / sidebar test | 0 | **error** `bar-short`, from 60% of the edge (below that it is a card by intent) |
| An undeclared shape within 1px past an inference threshold (square 28, heading 20, divider 6) | 0 | **error** `threshold-edge`, only on the wrong side (a 28px square is the convention, not a risk) |
| A transparent shape a person drew that holds two or more components (KI-6) | 0 | **error** `oversized-annotation` |
| A frame member reaching outside its frame | 1 (frame-edges `e03-next`, 40px, drawn to show it) | **advisory** `frame-overflow`: the reading is right, the editor hides the part outside |
| Siblings overlapping by more than the near-miss tolerance | 0 | **advisory** `sibling-overlap` |
| Text under 10px | 0 | **advisory** `small-text`; conventions § 3 allow 10–11 for micro-labels |
| Coordinates off the 2px grid | 18 values in 2 fixtures (dashboard, list-detail) | **rejected**: conventions § 1 advise insetting bands by 1px, so odd values are the conventions' own |
| Frame width 1160, origin (120, 120) | 8 of 10 fixtures | **rejected**: phone-sized screens are deliberate |
| Inset 32, gutter 16, column widths 540 / 354 / 262 | not measured | **deferred**: telling a deliberate layout from a slip needs the layout's intent |

The positive cases are a new fixture, `lint-near-misses`, which reproduces the 2026-08-07 footer
4.29px outside its screen and one case of every other error; `undeclared-content` is a bad drawing
by its roles, which `--score` already counts, and has no geometric fault.

## Open questions
- **familiarity:** wireframe semantics — **high**. Each row is the executor's call within ADR-002.

| # | Question | Status | Resolution + reason | Reopens if |
|---|----------|--------|--------------------|------------|
| 1 | Do the conventions' 90% or the reader's 80% / 70% decide `bar-short`? | resolved | **The reader's**, by ADR-002's rule that the lint never disagrees with the reader; conventions § 4 corrected. | the owner wants the reader raised to 90% |
| 2 | What does `--lint` print? | resolved | **The findings as text,** errors first, then advisories, one line each; `--lint --json` is `--json`, which always carries `lint`. | — |
| 3 | Where is the lint computed? | resolved | **In `readWireframe`,** as `model.lint`, from the tree and the markup it just built, so every consumer (CLI, MCP, panel) sees one snapshot. | the lint grows slow on large scenes |

## Work items
| # | Item | Files | Acceptance |
|---|------|-------|------------|
| 1 | Shared thresholds and the row rule | `src/core/reader-rules.ts`, `src/core/wireframe.ts` | every golden unchanged |
| 2 | The rules | `src/core/wireframe-lint.ts` | cases 2–9 |
| 3 | `model.lint`, `### Drawing quality` | `src/core/wireframe.ts` | cases 1, 10 |
| 4 | `--lint`, `lint` in `--json` | `src/cli/commands/scene.ts`, `src/cli/run.ts` | case 11 |
| 5 | Fixture with every error | `tests/fixtures/lint-near-misses.excalidraw`, `tests/expected/lint-near-misses.{json,txt}` | case 1 |
| 6 | Corpus asserts each fixture's lint | `tests/wireframe-corpus.test.mjs`, `tests/expected/frame-edges.json` | case 10 |
| 7 | Docs | conventions § 1, § 4, § 9; SKILL.md; README; `describe_wireframe` | case 12 |

## Test cases (write these first)
| # | Name | Assertion | Path |
|---|------|-----------|------|
| 1 | the near misses, drawn | lint-near-misses' findings are exactly its `.json` `lint` list, and its reading carries `### Drawing quality` with the 4.29px line | `tests/expected/lint-near-misses.*` |
| 2 | containment near miss | a footer 4.29px past its screen's edge: one error naming both, measured 4.29; 25px past: none (a sibling overlap instead) | `tests/wireframe-lint.test.mjs` |
| 3 | row split | two side-by-side boxes overlapping 40% vertically: error; 60%: none | same |
| 4 | bar short | a band flush to the top spanning 70%: error; full width: none (it reads `header`); 50%: none; a sidebar flush left stopping short of the bottom: error | same |
| 5 | threshold edge | an undeclared 29px square, 19px text, 7px-thin long box: one error each; 28px, 20px, 6px: none; a declared 29px square: none | same |
| 6 | oversized annotation | a person's transparent rectangle round two components: error; round one: none | same |
| 7 | frame overflow | a member 40px outside its frame: advisory, measured 40 | same |
| 8 | sibling overlap | two cards overlapping by 60px: advisory, no near miss | same |
| 9 | small text | 8px text: advisory; 10px: none | same |
| 10 | the clean corpus stays clean | every other fixture has no error; frame-edges has its one advisory; every other golden unchanged | corpus run |
| 11 | the CLI | `--json` carries `lint`; `--lint` prints each finding with its rule id | `tests/wireframe-lint.test.mjs` (the printer), live run |
| 12 | the docs | conventions § 9 names `--lint`; § 4's span says 80%; SKILL.md lists the block | review |

## Verified

In the main checkout, 2026-11-17, Windows 11, Node 24.

| Case | Result |
|---|---|
| 1 · lint-near-misses | **Pass.** Red first: against the code at HEAD (`b2792cc`), 2 of the fixture's 6 checks failed (its golden and its lint). Now its 8 findings, in order, and a `### Drawing quality` block whose first line is `[ftr] is 4.29px outside [s1]`, beside Reading quality's "1 screen could not be named": the 2026-08-07 failure, cause and symptom on one page |
| 2–9 · inline rules | **Pass**, 17 tests in `tests/wireframe-lint.test.mjs`. Not seen red: they were written first but run only once the module existed |
| 10 · the clean corpus stays clean | **Pass.** The only finding on the ten older fixtures is frame-edges' 40px `frame-overflow` advisory, pinned in its `.json`; every older golden unchanged byte for byte. A real drawing too: UI-Wizard's 98-element dashboard (`tests/legacy/`), no finding; `server-contract.test.mjs` now asserts its `lint` is empty and the rest of its payload is what UI-Wizard committed |
| 11 · the CLI | **Pass** live on port 3072: `wireframe --lint` printed 6 errors and 2 advisories, exit 0; `wireframe --json` carried the 8 under `lint`; `formatLint` is unit-tested |
| 12 · the docs | Conventions § 4 (the reader's 80% / 70% span) and § 9 (the rules); SKILL.md (Drawing quality); README (the reading bullet and its differences row); `describe_wireframe`'s description; `npm run sync:skills` |
| Gates | `type-check`, `type-check:frontend`: pass. `node --test tests/**/*.test.mjs`: 189 / 189, after one run of four lost a canvas boot to `0xC0000409` in an unrelated test (finding 1). `test:mcp`, `test:bind`: pass. `docs_check --strict`, `init_check`: pass. Not run: the rest of `npm test` and the browser suite, due once before the push |

## Findings

1. **A canvas booted by a test sometimes dies on Windows with `0xC0000409`.** One run of four, in
   `server-contract.test.mjs`, a test this change does not reach; SPEC-004 saw the same once in
   Playwright. Its second sighting, so logged as KI-9.
2. **The conventions said 90% where the reader uses 80%.** Conventions § 4 corrected to the reader's
   numbers (row 1).

## Out of scope
- A `--check` exit code (ADR-002: after calibration on real drawings).
- The browser panel (ADR-002: a thin view, later, over this contract).
- The deferred and rejected rules above.
