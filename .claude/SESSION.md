<!-- status: active · updated: 2026-11-17 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

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

## 2026-11-17 (i) — Claude Code — KI-10 pushed (`31d1f6e`); round 2 not run; STAGED
- **Done:** `31d1f6e` (KI-10, ADR-006) pushed on the owner's yes after the full gate. Round 2
  offered on the round-1 scene and stopped: the owner had already approved that scene, so there
  was nothing genuine to mark (DEVLOG 2026-11-17 (g)). This note is staged.
- **Where:** `main` at `31d1f6e`, equal to `origin/main`, apart from this staged record.
- **Next:** PR 1's round 2 from the next real review, when the owner marks up screens they want
  changed (KI-3 says how); meanwhile the open tickets in their triage order. Still not run on
  the day's commits: the Playwright suite and a CI dispatch (KI-8).
- **Picks up:** any session with a terminal; round 2 needs the owner, a browser tab, and a design
  under review.
