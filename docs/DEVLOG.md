<!-- status: active · updated: 2026-07-31 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: none archived yet.

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
