<!-- status: active · updated: 2026-11-17 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

## 2026-11-17 (l) — Claude Code — T-017 pushed (`9c7a6f6`); T-018 and T-019 fixed; STAGED
- **Done:** `9c7a6f6` pushed after the full gate. T-018: the tab-sync and cross-origin probes are
  browser tests with assertions (the cross-origin one seen red with the guard off). T-019: the two
  waits lengthened; a fresh install's first runs passed (DEVLOG 2026-11-17 (j)). The browser suite
  ran for the first time today: 35 / 35 with the installed Chrome.
- **Where:** `main` at `9c7a6f6`, equal to `origin/main`; the two fixes staged; both tickets
  closed. `C:/Projects/mcp_excalidraw-upstream/tests/probe-fork` is now copied in and can be
  removed (the owner's call; not touched).
- **Next:** commit; the full gate and push on the owner's yes; then T-004 and T-008 (rank 7).
- **Picks up:** any session with a terminal; the browser suite needs `channel: 'chrome'` on this
  machine (a scratch config).

## 2026-11-17 (k) — Claude Code — T-006/T-021 pushed (`49cc155`); T-017 fixed; STAGED
- **Done:** `49cc155` pushed after the full gate. T-017 run for the first time: the dev page never
  synced (no socket proxy) and every proxied call got 403. Vite's proxy now carries the socket and
  presents only the dev page as the canvas's own (DEVLOG 2026-11-17 (i)). 5 tests; verified live.
- **Where:** `main` at `49cc155`, equal to `origin/main`; T-017 staged; the ticket closed.
  `.claude/launch.json` (gitignored) gained `canvas-memory` and `vite-5174` entries.
- **Next:** commit; the full gate and push on the owner's yes; then T-018 and T-019 (rank 6).
- **Picks up:** any session with a terminal.

## 2026-11-17 (j) — Claude Code — T-006 and T-021 fixed; STAGED
- **Done:** an element beside a stacked column reads as a column block, so a full-height sidebar
  no longer turns the main column column-major and stacked checkboxes keep their labels. The
  three reported drawings read right; 238 / 238; live on port 3083 (DEVLOG 2026-11-17 (h)).
- **Where:** `main` at `cef6002`, equal to `origin/main`; the fix staged; both tickets closed in
  the ledger.
- **Next:** commit; the full gate and push on the owner's yes; tell the owner dnd_crawler's
  reading file will differ in seven screens when regenerated; then T-017 (rank 5).
- **Picks up:** any session with a terminal; T-017 needs two terminals and a browser.
