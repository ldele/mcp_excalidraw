<!-- status: active · updated: 2026-11-17 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

## 2026-11-17 (a) — Claude Code — ADR-004 built (SPEC-006); STAGED, not committed
- **Done:** a person's mark in red, orange, blue or green reads as change, remove, question or
  fine in `wireframe` and `changes`; the skill ships a "How to mark up" legend
  (`references/markup-legend.json`) that the reading leaves out. Round trip closed on port 3072
  with a real tab; 139 / 139 node tests (DEVLOG 2026-11-17 (a), SPEC-006 § Verified).
- **Where:** `main` at `82ef3ed`; this change is staged, waiting on the owner's yes to commit.
  `dist/` is rebuilt (the baton's open item from (m) is done).
- **Next:** commit ADR-004; build ADR-005 (an approval box per screen, its line in the legend,
  its README row); then PR 4.
- **Picks up:** any session with a terminal; ADR-005's round trip needs a browser tab.

## 2026-11-16 (m) — Claude Code — session closed; everything committed and pushed
- **Done today (DEVLOG 2026-11-16):** cpc re-vendored to 1.23.0 and kept out of git (rule 5); the
  README and FORK.md cut, with a table of how the fork differs from upstream; tickets triaged;
  T-001, T-022, T-024, T-025 and T-026 fixed; ADR-003 to ADR-005 decided; upstream 2.2.0 merged
  (`c800fa8`); ADR-003 built (`6414461`). The nested sessions are done and archived.
- **Where:** `main` equals `origin/main` at `9942c4b`, apart from this entry; nothing else staged.
- **Open:** this checkout's `dist/` predates ADR-003. Once the canvas on :3000 is stopped, run
  `npm ci && npm run build` here.
- **Next:** build ADR-004 (intent by colour, a legend frame) and ADR-005 (an approval box per
  screen), each adding its row to the README's differences table in the same commit; then PR 4.
- **Picks up:** any session with a terminal; the round trips for ADR-004 and ADR-005 need a
  browser tab.

## 2026-11-16 (l) — Claude Code — README § How it differs from upstream; STAGED
- **Done:** a table in the README sums up how the fork differs from upstream 2.2.0, each upstream
  claim checked against `upstream/main`. FORK.md says to update it at every merge (DEVLOG
  2026-11-16 (l)). Both nested sessions, the merge and ADR-003, had finished and closed out first.
- **Where:** `main` at `e4e2bb4`, pushed. This change is staged, not committed.
- **Open:** this checkout's `dist/` predates ADR-003, so `excalidraw-canvas` on PATH lacks it. A
  canvas is running on port 3000 (231 elements); rebuild with `npm run build` once it is stopped.
- **Next:** build ADR-004 and ADR-005; then PR 4.
- **Picks up:** any session with a terminal.
