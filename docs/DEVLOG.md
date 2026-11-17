<!-- status: active · updated: 2026-11-17 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: [`docs/archive/DEVLOG-archive-001.md`](archive/DEVLOG-archive-001.md). Rotation
began on 2026-10-08; the archive holds everything older than the entries kept here (three since
2026-11-16).

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

## 2026-11-17 (f) — KI-10 fixed: a ring round a whole screen is about it, and a green one approves it (ADR-006)
- **Why:** PR 1 round 1's only mark, a green loop round S01 meaning "S01 is fine", bound to a
  heading inside the screen, and nothing read S01 as approved (it had no room for a box).
- **What:** `attributeAnnotation`'s `encloses` skipped containers, against `findContainers`' own
  comment; it now targets the largest container a mark wholly rings, else the smallest component
  as before. ADR-006, the owner's call: a "fine" mark that rings a whole screen approves it, box or
  no box, and stays an annotation; `changes` adds `↳ approves screen`. Conventions § 8, SKILL.md,
  README.
- **Tests:** `tests/attribution.test.mjs` (4, two seen red), four in `tests/approval.test.mjs`
  (two seen red, two pinning what must not change); `human-round-1` flips to a hit that approves
  S01; baseline 8 / 9; no other binding moved. Live on port 3082: a green ring drawn in the tab
  round a frame reads `circles / marks [s01]` and `approves screen [s01]`. 207 / 207.
- **Rejected:** approving by a ring in any colour (a red ring round a screen means change it).

> Entries below dated 2026-07-31 were backfilled on 2026-08-01 from the commits and the baton; they
> are short by intent, not by neglect.
