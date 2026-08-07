<!-- status: active · updated: 2026-08-07 · class: append-only -->

# ADR-002 — Lint a wireframe's geometry behind `wireframe --lint`, reporting only

- **Status:** accepted
- **Date:** 2026-08-07
- **Deciders:** Lucas, agent (Claude Code)

## Context

`wireframe --score` (ADR-001, ROADMAP PR 3) answers *"did the reading succeed?"* — it counts
fallbacks, unnamed screens and orphans. Nothing answers *"does this drawing follow the conventions
it was drawn against?"*, and the two are not the same question: a drawing can score `0` on every
count while sitting off-grid, with ragged rows, one pixel from a different reading.

On 2026-08-07 that gap cost a session. A footer copied inside the canvas landed **4.29px** outside
its frame; containment failed, the footer was promoted to a third screen, and `--score` reported
*"1 screen could not be named"* (`docs/DEVLOG.md`, 2026-08-07). That is the symptom two inferential
steps from the cause. Diagnosing it took reading element bounding boxes by hand. A tool that said
*"[ftr] is 4.29px outside [s1]"* would have ended it in one line.

Every rule such a check would apply is already written down in
`skills/excalidraw-skill/references/wireframe-conventions.md` and none of it is enforced — the
conventions are a document whoever draws has to remember to follow.

Three questions have to be settled before building.

**Where it lives.** `--score`'s output is a contract with real consumers: `src/cli/commands/scene.ts`,
`tests/wireframe-corpus.test.mjs`, `docs/specs/SPEC-001-fixture-corpus.md`, and the skill.

**What counts as a finding.** The conventions carry two kinds of statement, and they are not equally
serious.

**Whether it gates.** ROADMAP PR 3 deliberately rejected a `--check` flag that exits non-zero, on
the grounds that "a gate is a bigger decision than 'emit the number', and nothing asked for it yet"
(`docs/DEVLOG.md`, 2026-08-01).

A fourth question is already settled and recorded here because it constrains the output: the lint is
built **core first, with the browser panel as a thin view over it** — so the findings must be a
stable machine-readable contract, not prose a panel has to parse.

## Options

**Whether to build a lint at all:**

1. **Rely on Excalidraw's own alignment aids** — the editor ships grid mode and object snapping, so a
   human dragging a shape gets help for free. Rejected: it helps only the human, only at draw time,
   and only for position. The agent draws through the API where no snapping applies, and snapping
   cannot express "a header must span ≥ 90% of its edge or it reads as a `card`"
   (`wireframe-conventions.md` §4) or "declare a `role` on every chart" (§5). The 4.29px failure was
   produced *by a human dragging inside the editor*, with those aids available.

**Where the check lives:**

1. **Fold the findings into `wireframe --score`** — cheapest, no new surface. Rejected: it conflates
   "the reading succeeded" with "the drawing is well-formed", and it changes a contract four existing
   consumers already assert on.
2. **A separate `lint` command** — its own verb and its own output shape, free to evolve, and could
   later cover non-wireframe canvases. Costs a new command on a CLI table that is already ~20 rows,
   and splits the canvas into two reads that can race while someone is editing.
3. **A `--lint` flag on `wireframe`, with `lint` also carried in `wireframe --json`** — the findings
   need the reader's own containment and screen model, and arrive alongside the tree they refer to.

**Whether it gates:**

1. **Report only.**
2. **Exit non-zero on errors** (`--check`), usable from CI or a hook.

## Decision

**A `--lint` flag on `wireframe`, with the findings also carried under `lint` in `wireframe --json`,
computed from `readWireframe`'s model, reporting only — no exit-code gating.**

The deciding reason for the surface is that **the lint must not re-derive geometry.** Its central
check *is* the reader's nesting computation — "is this element inside that frame" is precisely what
`readWireframe` already decides, and a lint that answered it independently could disagree with the
reader about what contains what. A lint that contradicts the tool it is protecting is worse than no
lint. Consuming the reader's model makes that class of bug unrepresentable. Carrying `lint` inside
`wireframe --json` also gives the planned browser panel tree, score and findings in **one request**,
so it highlights elements against a single consistent snapshot instead of two reads of a canvas
someone is still editing.

Findings carry **two severities**, and only reading-affecting rules are errors:

| Severity | Meaning | Rules |
|---|---|---|
| **error** | changes what the reading *is* | containment near-miss (§1); header/footer/sidebar spanning < 90% of its edge, which makes it read as a `card` (§4); row members not sharing a `y`, which shuffles reading order (§1); a shape within a pixel of an inference threshold — checkbox ≤ 28, divider ≤ 6 thin, heading ≥ 20px (§4, §3); an oversized transparent rectangle treated as markup (KI-6) |
| **advisory** | house style; reads correctly either way | frame width 1160 and origin (120, 120); content inset 32; gutter 16; the 540/354/262 column widths; coordinates on a 2px grid; palette tokens (§1, §2) |

Keeping those apart is the point. PR 3 declined to warn on `?` marks because "warning on them would
train the reader to ignore the block" (`docs/DEVLOG.md`, 2026-08-01); a lint that reports a 2px grid
deviation at the same volume as a broken screen earns exactly that reflex.

Following the precedent PR 3 set for the same reason — the MCP tool `describe_wireframe` takes no
arguments, so a CLI-only flag would leave an agent reading its own drawing with no way to be told —
the plain reading gains a **`### Drawing quality`** block that appears only when there is at least
one **error**. Advisories stay behind the flag.

**Reporting only, because the thresholds are not yet calibrated.** Gating on unvalidated numbers
teaches people to bypass the gate, which is worse than not gating. **What would reverse it:** once
the rules have run against the fixture corpus and real drawings and the false-positive rate on
errors is known to be near zero, a `--check` flag becomes a small, separate decision.

## Consequences

**Easier.** A drawing failure gets diagnosed at its cause rather than its symptom — the 4.29px case
becomes one line instead of a manual bounding-box comparison. The agent gains a pre-flight it can run
before handing a wireframe to a person, and the conventions stop being purely advisory for the first
time. The browser panel becomes a rendering job over a tested contract rather than a second
implementation of the rules.

**Harder.** `readWireframe`'s model becomes load-bearing for a second consumer, so its internals need
to expose containment and row grouping rather than only the finished tree. The `wireframe --json`
payload grows a third top-level key, and the corpus goldens will need a lint expectation per fixture
— `tests/fixtures/undeclared-content.excalidraw` is already a deliberately bad drawing and becomes
the natural positive case.

**Committed to.** The findings shape is a public contract the moment the panel consumes it: a stable
`ruleId`, `severity`, `elementId`, human-readable `message`, and the measured value that triggered it.
Renaming a rule id is then a breaking change for the panel.

**Not covered.** The lint judges geometry against the conventions. It cannot tell whether the
*design* is any good, and it does not check role correctness — a button correctly declared `input`
is a lint pass and a design error. Nor does it address KI-4 (a note binding to the wrong component),
which is an attribution question, not a geometry one.

## Confidence

- ✓ **Containment near-misses matter, and silently.** Proven 2026-08-07: a footer 4.29px outside its
  frame became a phantom third screen (`docs/DEVLOG.md`, `.claude/SESSION.md` same date).
- ✓ **Sharing the reader's model rather than re-deriving it.** Follows from `readWireframe` already
  owning containment; the alternative admits reader/lint disagreement by construction.
- ✓ **Severity separation.** Grounded in an in-project precedent with a stated outcome — PR 3's
  refusal to warn on `?` marks (`docs/DEVLOG.md`, 2026-08-01).
- ⚠ **Every numeric tolerance in the lint is arbitrary right now.** How far outside a frame counts as
  a near-miss rather than a deliberate placement, and how much `y` drift breaks a row, are guesses —
  the conventions state the targets but not the tolerances. Calibrate against the five corpus
  fixtures and the drawings in `docs/DEVLOG.md` before the advisory rules ship, and record the
  chosen values with their evidence in the PR 4 spec.
- ⚠ **The error/advisory split is a judgement call.** Each "error" rule claims a convention violation
  changes the reading; only containment has been demonstrated to. The others are read off the
  documented inference rules, not observed failing. Demote any rule that turns out not to change a
  reading.
