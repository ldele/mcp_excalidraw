<!-- status: active · updated: 2026-11-17 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: [`docs/archive/DEVLOG-archive-001.md`](archive/DEVLOG-archive-001.md). Rotation
began on 2026-10-08; the archive holds everything older than the entries kept here (three since
2026-11-16).

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

## 2026-11-17 (h) — T-006 and T-021 fixed: an element beside a stacked column reads as a column
- **Why:** both tickets, rank 4, four reports between them (UI-Wizard, BlackBox, doc_assistant,
  pharma-dq-validator), all with a clean score. `inReadingOrder` grew a row's band to its tallest
  member, so a full-height sidebar or two tall drop zones swallowed every row beside them, the
  main column read sorted by x and two checkboxes lost their labels.
- **What:** in `src/core/wireframe.ts`, a sibling with two or more stacked siblings beside it,
  within its height, is a column. Rows are grouped from the rest; the column reads as one block
  with what sits under it in its own width, before the rows it spans when it stands to their left,
  after them when to their right. No threshold to calibrate.
- **Calibration rejected first:** a height-over-median ratio. It needed under 3 for T-021, and
  there it also took S01's 140px save card for a column on the owner's dnd scene; joining a column
  to the row of its top edge read S07's detail card into the middle of its list. Both pinned now.
- **Real drawings:** the three reports read from their files (read-only) are fixed; UI-Wizard's
  legacy dashboard is T-006's own drawing, and its expected reading was regenerated (order only,
  checked). The owner's dnd scene changes in seven screens with a side column beside a list (S04,
  S17, S18, S22, S26, S28, S30): two read better as columns, five move a side card by one item;
  none worse; dnd_crawler's committed reading file will differ when next regenerated.
- **Tests:** `tests/reading-order.test.mjs` (6: the two reports seen red, four layouts that must
  not break); fixtures `sidebar-rows` and `stacked-checkboxes`; the harness checks a stated
  `readingOrder` and `checkboxLabels`. Every older golden unchanged. Live on port 3083 with a tab.
  238 / 238.
- **Opens:** BlackBox's two wrapper cards (`[s2-main]`, `[s3-main]`) can go.

## 2026-11-17 (g) — PR 1 round 2 not run: an approved scene gives nothing to mark
- **What:** the round-1 scene was reopened on port 3080 for a second round (it read clean, S01
  approved by the owner's loop since ADR-006, the tab's load made no record). The owner pointed
  out that the scene was already approved, so there was nothing they wanted changed; no mark was
  drawn and the round was stopped.
- **Lesson:** the attribution measurement needs a design under real review. Marks invented for
  the test would measure an imitation, as the agent-drawn corpus does. KI-3 now says how to close
  it: take round 2 from the next real review.

> Entries below dated 2026-07-31 were backfilled on 2026-08-01 from the commits and the baton; they
> are short by intent, not by neglect.
