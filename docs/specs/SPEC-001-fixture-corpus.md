<!-- status: active · updated: 2026-08-01 · class: living -->

# SPEC-001 — wireframe fixture corpus

> The executor brief for `docs/ROADMAP.md` PR 2. The *why* — runner, element source, expectation
> shape — is ADR-001; read it first and do not re-litigate it here. This is the *how*: what is in
> the corpus, how to add to it, and how to change it without lying to yourself.

## Goal

Make a role-inference change safe to touch: any edit to `src/core/wireframe.ts` or
`src/core/changes.ts` must show up as a diff against known-good readings of real drawings, instead
of being validated by looking at a screenshot.

## Hard constraints

- **CONVENTIONS §16 (test weight).** No new dependencies. `node:test` only — ADR-001.
- **`.claude/CONTEXT.md` rule 4.** A wireframe change is not done until the round-trip closes.
  The corpus is that round-trip, made repeatable; it does not replace drawing the thing once.
- **`.claude/CONTEXT.md` rule 2.** `src/core/normalize.ts` is in the upstream collision zone.
  Fixtures are generated through it, so re-generating them after an upstream merge is a *check*,
  not a chore.
- The corpus asserts on `scoreWireframe()`, never on its own count of roles.

## Open questions

- **familiarity:** wireframe semantics — **high** (the owner's own design).

| # | Question | Status | Resolution + reason | Reopens if |
|---|----------|--------|--------------------|------------|
| 1 | Should fixtures be drawn through the canvas or hand-written JSON? | resolved | Drawn through the CLI, consumed from disk. Hand-written JSON drifts from what the canvas actually emits, so the tests would pass on input the tool never sees. | The `add`/`export` path changes shape. |
| 2 | Should every fixture read cleanly? | resolved | No. `undeclared-content` is drawn wrong on purpose. A corpus where everything scores zero cannot detect a change that makes everything read as `card` with no `?`. | — |
| 3 | Assert markup attribution at 100%? | resolved | No — record `intendedTargetId` per annotation and assert accuracy never falls below a recorded baseline. Attribution is a judgment call, and one wrong binding that is *written down* is not a surprise. | A human round (PR 1) gives a real sample. |
| 4 | Where does the `?`/fallback counting live? | resolved | `scoreWireframe()` in `src/core/wireframe.ts`, exported. Duplicating it in the test would measure something the tool does not report. | — |

## The corpus

Five fixtures. Each `.excalidraw` is real canvas output; each `.json` says in prose why it exists.

| Fixture | Covers | Score (screens / components / fallbacks / inferred) |
|---|---|---|
| `dashboard` | The conventions §10 skeleton: header + footer bands, segmented control, KPI tiles, declared `chart` and `table` placeholders | 1 / 21 / 0 / 0 |
| `two-screen-flow` | Bound cross-screen arrow → navigation; undeclared inputs and checkbox → the inference path; tickbox label absorption | 2 / 13 / 0 / 3 |
| `list-detail` | Measurement rules: sidebar edge span, divider thinness, the ≥3 identical stacked boxes that make a `list-item` set | 1 / 13 / 0 / 5 |
| `annotated` | Markup attribution, all four relations (`near` / `points-at` / `encloses` / `inside`), and markup exclusion from the component tree | 1 / 8 / 0 / 0 |
| `undeclared-content` | The failure case. Both worked examples from conventions §0, plus an unnamed screen | 1 / 5 / **3** / 1 |

Non-zero numbers in the last two columns are deliberate on the fixtures that carry them. Do not
"fix" them.

## Execution checklist

1. ✅ Draw each scene through the CLI and export it to `tests/fixtures/`.
2. ✅ Add `scoreWireframe()` to `src/core/wireframe.ts`.
3. ✅ Write the harness (`tests/corpus.mjs`, `tests/wireframe-corpus.test.mjs`).
4. ✅ Hand-author `tests/expected/*.json` and generate `tests/expected/*.txt`.
5. ✅ Wire `npm test` / `test:corpus` / `corpus:update` and the CI `test` job.
6. ✅ Prove the harness fails on a real regression before trusting it.

## Adding a fixture

The canvas server must be running; a browser tab is **not** needed (`export` is server-only — only
screenshots, image export, mermaid and viewport control need a tab).

```bash
node dist/bin.js start
node dist/bin.js clear --yes
node dist/bin.js add my-scene.json
node dist/bin.js wireframe
node dist/bin.js export --out tests/fixtures/my-scene.excalidraw
```

Read the `wireframe` output before exporting. If it does not say what you meant, fix the drawing —
`skills/excalidraw-skill/references/wireframe-conventions.md` §9 is the checklist.

Then write `tests/expected/my-scene.json` by hand (`what`, `why`, `score`, `screens`, `navigation`,
`markup`, `notes`) and run `npm run corpus:update` to generate the golden text.

**Markup fixtures need one extra step.** The canvas server stamps `origin: "agent"` on everything it
creates, and markup attribution only considers elements with `origin: "human"` (plus `freedraw`,
which always counts). So export first, then patch the annotation elements' `origin` to `"human"` in
the fixture file. This is also why re-importing `annotated.excalidraw` through
`excalidraw-canvas import` shows **zero** annotations — the origins are reset on the way in. That is
expected, not a bug; the harness reads fixtures off disk for exactly this reason (ADR-001).

## Changing a reading on purpose

1. Make the change in `src/core/*`.
2. `npm run test:corpus` — read the failures. Each one is a drawing whose meaning you changed.
3. If every change is intended, `npm run corpus:update` and **read the diff**.
4. Update the affected `tests/expected/*.json` by hand — score, and the prose if the reason moved.
5. If markup bindings moved, re-review `intendedTargetId` and
   `tests/expected/attribution-baseline.json`. The baseline test fails on a corpus size change
   rather than auto-adjusting, on purpose.

## Test cases

| Name | Assertion | Path |
|------|-----------|------|
| corpus is not empty | fixtures exist and load | `tests/wireframe-corpus.test.mjs` |
| reading matches the golden text | full `formatWireframe` output, per fixture | same |
| score matches | `scoreWireframe()` deep-equals the hand-authored score | same |
| screens are named as expected | screen ids + derived labels | same |
| navigation flows match | bound cross-screen arrows only | same |
| markup binds where expected | id → targetId + relation | same |
| every annotation declares intent | `intendedTargetId` present on all markup | same |
| attribution has not regressed | correct ≥ baseline; fails if corpus size changed | same |

28 assertions across 5 fixtures.

## Verified

The harness was proved to fail before being trusted: changing `HEADING_MIN_FONT_SIZE` from 20 to 24
broke the golden reading on all five fixtures (23 pass / 5 fail). Reverted.

## Out of scope

- `wireframe --score` as a CLI flag — that is ROADMAP PR 3, and `scoreWireframe()` is its engine.
- The create/normalize path. Fixtures are read from disk, so a regression on the way *in* is not
  covered here (ADR-001, "Not covered").
- Human markup at real sample size — that is PR 1, and it is what makes the attribution number mean
  something.

## Docs to touch when this lands

- docs/DEVLOG.md
- docs/ROADMAP.md — PR 2 status, and measures 2 and 3
- .claude/SESSION.md
