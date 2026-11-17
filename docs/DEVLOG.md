<!-- status: active · updated: 2026-11-17 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: [`docs/archive/DEVLOG-archive-001.md`](archive/DEVLOG-archive-001.md). Rotation
began on 2026-10-08; the archive holds everything older than the entries kept here (three since
2026-11-16).

## 2026-11-17 (l) — T-005 fixed: a screen is named by its largest own heading, not its topmost
- **Why:** a 20px overlay caption above a 26px title named the screen after the caption
  (doc_assistant, 2026-08-21): `deriveScreenName` took the first heading in reading order.
- **What:** it now takes the largest heading that sits directly in the screen or in its header
  bar, the first in reading order on a tie; a heading deeper in, inside a card, names the screen
  only when there is no other, as before. Conventions § 1 says so. SKILL.md now says `clear --yes`
  and add it all again is the way to redraw a generated scene, the report's second ask.
- **Checked:** none of 62 screens renamed across the corpus and five real drawings (pharma,
  UI-Wizard twice, doc_assistant, dnd_crawler). `tests/screen-name.test.mjs` (5, two red first);
  live on port 3086, the caption above "Library" no longer names the screen. 251 / 251.

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

> Entries below dated 2026-07-31 were backfilled on 2026-08-01 from the commits and the baton; they
> are short by intent, not by neglect.
