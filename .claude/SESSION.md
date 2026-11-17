<!-- status: active · updated: 2026-11-17 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

## 2026-11-17 (m) — Claude Code — T-018/T-019 pushed (`e8c6017`); T-004 fixed, T-008 documented; STAGED
- **Done:** `e8c6017` pushed after the full gate. T-004: the page's label recentring now honours
  `textAlign` / `verticalAlign` (upstream's code, FORK.md row). T-008: conventions § 4 says to
  colour labels on light borders (DEVLOG 2026-11-17 (k)).
- **Where:** `main` at `e8c6017`, equal to `origin/main`; both staged; both tickets closed.
- **Next:** commit; the full gate and push on the owner's yes; then T-002, T-003 (decisions for
  the owner) and T-005 (rank 8).
- **Picks up:** any session with a terminal.

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
