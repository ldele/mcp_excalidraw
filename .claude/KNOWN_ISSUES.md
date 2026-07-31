<!-- status: active · updated: 2026-07-31 · class: living -->

# KNOWN ISSUES

Open weaknesses, recurring failures, workarounds. Log a bug the second time it appears.

## KI-1 — `npx mcp-excalidraw-server` silently runs upstream's build
- **Symptom:** `wireframe` and `changes` fail as unknown commands, or a command behaves like a
  build without any of this fork's features.
- **Cause:** the unscoped name on npm is yctimlin's package. This fork is `@ldele/…` and unpublished,
  so `npx` resolves to upstream. It was the skill's own documented entry point until 2026-07-31.
- **Workaround:** `npm link` from the repo, then use `excalidraw-canvas`; or call
  `node <repo>/dist/bin.js` directly.
- **Real fix:** done for our own docs (skill, cheatsheet, evals, README all point at the binary).
  Anything outside this repo that memorised the old `npx` line is still wrong. See `FORK.md`.

## KI-2 — `.git` still carries the 2.8 MB `demo.gif`
- **Symptom:** the repo clones heavier than its working tree suggests.
- **Cause:** `demo.gif` was removed from the tree on 2026-07-31, but deleting a file does not remove
  its blob from history.
- **Workaround:** none needed; it is a clone-size cost, not a correctness one.
- **Real fix:** descoped. Evicting it means rewriting history, which is not worth it at this size.

## KI-3 — the two-way markup loop has never run with a human
- **Symptom:** unknown. `changes` / `watch` / markup attribution are implemented and unit-exercised
  but no person has marked a canvas up and had it read back.
- **Cause:** the markup round was offered and skipped three times on 2026-07-31.
- **Workaround:** none; the agent-side half works.
- **Real fix:** `docs/ROADMAP.md` PR 1.

## Resolved index

One line per resolved issue (ADR-023): mark the entry's heading `(RESOLVED 2026-07-31)` on the day
it is fixed; once it has aged past `[staleness] resolved_ki_days`, replace the full entry with a
line here and move its text verbatim to docs/archive/KNOWN_ISSUES-archive-NNN.md (backtick the
path once the archive file exists — the route gate then keeps the link honest). Numbers are never
reused; the archive keeps the detail.

- <!-- KI-N (RESOLVED 2026-07-31) — <one-line summary> → docs/archive/KNOWN_ISSUES-archive-001.md -->
