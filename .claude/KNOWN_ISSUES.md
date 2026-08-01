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
- **Cause:** the markup round was offered and skipped three times on 2026-07-31, and once on
  2026-08-01 (no time to sit for it).
- **Workaround:** none; the agent-side half works. As of 2026-08-01 it is also pinned by a test —
  `tests/fixtures/annotated.excalidraw` exercises all four attribution relations. That narrows what
  a human round could surprise us with; it does not close this.
- **Real fix:** `docs/ROADMAP.md` PR 1.

## KI-4 — a note beside a card can bind to the wrong component
- **Symptom:** in `tests/fixtures/annotated.excalidraw`, the note "show VAT breakdown" sits level
  with the £48.00 totals card and binds to the CVC input two rows above it. 4 of 5 annotations in
  the corpus bind where a person would; this is the fifth.
- **Cause:** attribution measures edge-to-edge distance from a point outside every candidate. The
  totals card is wider, so its nearest edge is further from the note's centre than the smaller
  input's is, even though the note is vertically level with the card and not with the input.
  Vertical alignment carries intent here and is not weighted.
- **Workaround:** none needed yet — the reading names the target, so a wrong bind is visible rather
  than silent.
- **Real fix:** not attempted. Worth doing only on evidence from a real human round
  (`docs/ROADMAP.md` PR 1) — tuning attribution against one agent-drawn sample of 5 would be
  fitting to noise. Baseline and method: `tests/expected/attribution-baseline.json`.

## Resolved index

One line per resolved issue (ADR-023): mark the entry's heading `(RESOLVED 2026-07-31)` on the day
it is fixed; once it has aged past `[staleness] resolved_ki_days`, replace the full entry with a
line here and move its text verbatim to docs/archive/KNOWN_ISSUES-archive-NNN.md (backtick the
path once the archive file exists — the route gate then keeps the link honest). Numbers are never
reused; the archive keeps the detail.

- <!-- KI-N (RESOLVED 2026-07-31) — <one-line summary> → docs/archive/KNOWN_ISSUES-archive-001.md -->
