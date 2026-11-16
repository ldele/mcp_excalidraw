<!-- status: active · updated: 2026-11-16 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

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

## 2026-11-16 (k) — Claude Code — ADR-003 landed on `main` as `6414461`; CI dispatched
- **Done:** entry (j)'s work was committed as `6414461` on the owner's yes, fast-forwarded onto
  `main` and pushed. The worktree `C:\Projects\mcp_excalidraw-adr003` and branch
  `adr-003-frame-screens` are removed. CI run 43952866891, dispatched on it: the three keypoint
  jobs passed; "Build + wireframe corpus" was still running when this was written.
- **Not done:** `npm ci && npm run build` in the main checkout. The owner's canvas on :3000 was
  running, so its `dist/` is the pre-ADR-003 build: it reads frames the old way until it is
  stopped, rebuilt and started again.
- **Next:** read CI run 43952866891's result; rebuild the main checkout with no canvas running.
  Then ADR-004 (its legend frame will read as a screen until it is left out) and ADR-005.
- **Picks up:** any session with a terminal; ADR-004 and ADR-005 need a browser tab.
