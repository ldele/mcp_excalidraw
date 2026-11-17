<!-- status: active · updated: 2026-11-17 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: [`docs/archive/DEVLOG-archive-001.md`](archive/DEVLOG-archive-001.md). Rotation
began on 2026-10-08; the archive holds everything older than the entries kept here (three since
2026-11-16).

## 2026-11-17 (k) — T-004 fixed, T-008 documented: a label goes where it is aligned, and needs its own colour
- **T-004:** not Excalidraw's limit, as the report supposed, but upstream's page code:
  `recenterBoundShapeTextElements` (`frontend/src/utils/scene.ts`, upstream #61) moved every bound
  label to its shape's middle, so `textAlign: "left"` was stored, read back and drawn centred, in a
  tab and in the headless PNG (which bundles the same function). It now places the label by its
  `textAlign` and `verticalAlign`, 5px from the edge, as Excalidraw does; the default is centred as
  before. `tests/label-align.test.mjs` (3, two red first); FORK.md row; seen live in a tab and a PNG
  on port 3085, the tab's load making no record. Files with left-aligned labels now draw them left.
- **T-008:** confirmed in the same PNG: a `"text"` label on a `#d7d5cc` border is drawn in that
  grey. Conventions § 4 now says to colour every label on a light border, and the secondary-button
  recipe gives `#14130f`; SKILL.md says why. The default stays upstream's.

## 2026-11-17 (j) — T-018 and T-019: the browser probes join the suite; the first run's waits lengthened
- **T-018:** two of the three probes kept since 2026-10-08 in an untracked folder of the upstream
  worktree are now tests with assertions in `tests/browser/`: `tab-sync-reroute.spec.mjs` (both
  bound arrows follow every API move of a shape, with no tab, an unsynced tab, after a manual sync,
  after a reload, after the tab's own sync, and after a person's drag) and `cross-origin.spec.mjs`
  (a page from another local port, and one from a file on disk, is refused a read, a write, the
  socket and a clear, and the canvas is untouched). The probe's public-website cases needed the
  internet and are left out. `cross-origin-http.mjs` is not ported: the state check *requests
  from another site are refused* sends the same raw HTTP and socket. The worktree folder can go.
- **Seen red:** with the guard switched off in the build, the cross-origin test failed on both
  pages, on the socket: Chrome's own CORS already blocks the HTTP calls, so the socket is what
  the guard holds alone. The tab-sync test pins what the fork has done since 2026-10-08; upstream's
  sync is its red (DEVLOG archive 2026-10-08 (e)).
- **T-019:** the state check's health wait is 30 s (was 5) and Playwright's `webServer` timeout
  60 s (was 15); both return as soon as the server answers. Not reproduced: after `npm ci` and a
  build, the first state check took 3 s and the first browser run 1.8 min, 35 passed. The cause
  stays unknown; the waits are the margin.
- **Browser suite:** 35 / 35 with the installed Chrome (a scratch config, not staged: this
  Playwright's own Chromium build is not on this machine), twice.

## 2026-11-17 (i) — T-017 run and fixed: `npm run dev` syncs, and the guard still refuses other sites
- **Why:** since T-015 the canvas refuses any page Origin but its own; the Vite dev flow had never
  been run under it.
- **Found** (a memory-only canvas on 3000, so port 3000's saved scene was never touched; Vite on
  5175, since 5173 was another project's dev server): the dev page read Disconnected. Its socket
  opens at the page's own host, and Vite's proxy had no socket entry, so it never reached the
  canvas. Every proxied API call, GET included, got 403. So `CANVAS_ALLOWED_ORIGINS` alone, which
  the README advised, would have fixed the API and not the socket.
- **What:** `scripts/vite-dev-proxy.mjs`, wired into upstream's `vite.config.js` (FORK.md): the
  proxy carries the socket (`^/$`, upgrades only; Vite still serves the page) and gives a request
  whose Origin is the Vite server it was sent to the canvas's Origin. Any other Origin is forwarded
  as it came. `tests/dev-proxy.test.mjs` (5, red first).
- **Verified live:** the page Connected; a rectangle drawn on it reached the canvas as one change by
  a person; through the proxy, the page's own Origin got 200 on the API and opened the socket, while
  `https://evil.example` and `http://localhost:5173` got 403 on both. Vite's hot reload still
  connects; `vite build` passes. README's dev section and 403 note rewritten.
- **Rejected:** Vite's `rewriteWsOrigin` (rewrites every Origin, which reopens T-015's hole for the
  socket); widening the guard to any localhost port (another local dev server is another site).

> Entries below dated 2026-07-31 were backfilled on 2026-08-01 from the commits and the baton; they
> are short by intent, not by neglect.
