<!-- status: archived · updated: 2026-10-08 · class: append-only -->

# DEVLOG archive 001

Rotated DEVLOG entries — moved here from `docs/DEVLOG.md` once it held more than 20, **verbatim** per cpc ADR-023 rule 13b and cpc ADR-053. Newest entry on top. Append-only; never edited.

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
