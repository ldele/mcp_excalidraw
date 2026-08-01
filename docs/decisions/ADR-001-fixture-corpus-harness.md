<!-- status: active · updated: 2026-08-01 · class: append-only -->

# ADR-001 — Test the wireframe reader with on-disk fixtures and `node:test`

- **Status:** accepted
- **Date:** 2026-08-01
- **Deciders:** Lucas, agent (Claude Code)

## Context

`src/core/wireframe.ts` (32 KB) and `src/core/changes.ts` (27 KB) carry this fork's entire
differentiator, and until now the repo had no test runner at all — `npm run test:bind` was a single
loopback-guard script, and CI ran only `type-check` and `build`. Every role-inference change was
therefore validated by drawing something and looking at it, which `docs/ROADMAP.md` already records
as too weak a bar.

`docs/ROADMAP.md` PR 2 asks for "a fixture corpus + test harness: `.excalidraw` in, expected reading
out". Three questions had to be settled to build it.

**What runs the tests.** The project has zero test dependencies today and CONVENTIONS §16 is
explicit about test weight.

**Where the elements come from.** `readWireframe` is a pure function over an element array, so a
fixture can be fed to it directly or pushed through the canvas server first.

**What "expected reading" means as a file.** A golden of the printed report, a structured
assertion, or both.

## Options

1. **Vitest or Jest** — familiar, rich matchers, snapshot support built in. Costs a dependency tree,
   a config file, and a transform step this ESM-to-`dist` project does not otherwise need.
2. **`node:test` + `.mjs` importing `dist/`** — zero new dependencies, no config. Matches what the
   repo already does: `scripts/check-local-bind.mjs` and `scripts/sync-skills.mjs` are both plain
   `.mjs` run against the build. Weaker matchers, and the tests are not type-checked.
3. **TypeScript tests compiled into `dist/`** — type-checked, but pollutes the build output and
   changes the `tsconfig` include surface for no behavioural gain.

For the element source:

1. **Drive the canvas server in the test** — closest to production, but needs a live server per run,
   makes the suite slow and order-dependent, and *loses the thing being tested*: the server stamps
   `origin: "agent"` on everything it creates, so markup attribution (which keys on
   `origin: "human"`) becomes untestable.
2. **Read the fixture file directly** — hermetic, fast, and can express human-drawn markup. One step
   further from production: it does not exercise the create/normalize path.

## Decision

**`node:test` with `.mjs` tests importing the compiled `dist/`, reading fixtures straight off disk.**

Fixtures are *authored* by driving the real CLI (`add` → `export`), so they are genuine canvas
output rather than hand-written JSON, and the annotated fixture is then patched to mark its markup
elements `origin: "human"`. Fixtures are *consumed* from disk.

Expectations are two files per fixture, because they fail differently:

- `tests/expected/<name>.txt` — the whole printed reading. Catches changes nobody thought to assert
  on. Regenerated with `npm run corpus:update`.
- `tests/expected/<name>.json` — score, screen names, flows, markup bindings, and the prose reason
  the fixture exists. Hand-authored, never regenerated.

The split is the point: a golden that can be regenerated in one command will eventually be
regenerated without being read, so the claims that matter live in a file the update script does not
touch.

Counting is not reimplemented in the tests. `scoreWireframe()` was added to `src/core/wireframe.ts`
and the suite asserts on its output, so the tool and the tests can never disagree about what a
fallback is. `wireframe --score` (ROADMAP PR 3) becomes a flag over an existing function.

## Consequences

**Easier.** A role-inference change now has to state what it changed: five fixtures, 28 assertions,
and a diff of the printed reading. Adding a fixture is drawing a scene, exporting it, and writing
one JSON file. PR 3 is nearly free.

**Harder.** The tests are not type-checked, so a rename in `wireframe.ts` surfaces as a test failure
rather than a compile error. Accepted: the suite runs on every `npm test` and the failure is loud.

**Committed to.** Fixtures must be regenerated when the *element schema* changes, not just when
inference does — they are frozen canvas output. `npm run corpus:update` handles the readings; the
`.excalidraw` files themselves would need redrawing, and the recipes for that are in
`docs/specs/SPEC-001-fixture-corpus.md`.

**Version floor for the suite.** `node --test` takes a glob only from Node 21, and directory
discovery no longer works on current Node, so the corpus job runs on Node 22.x and 24.x. The package
still supports Node ≥ 18 and the build/type-check matrix still proves it.

**Not covered.** Reading fixtures from disk skips the create/normalize path, so a regression in
`normalize.ts` that mangles elements on the way *in* would not be caught here. `npm run test:bind`
and the manual CLI round-trip in `AGENTS.md` remain the guard for that.
