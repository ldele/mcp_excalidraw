<!-- status: active · updated: 2026-11-17 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: [`docs/archive/DEVLOG-archive-001.md`](archive/DEVLOG-archive-001.md). Rotation
began on 2026-10-08; the archive holds everything older than the entries kept here (three since
2026-11-16).

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

## 2026-11-17 (e) — The lint recalibrated on a real drawing: 14 false errors to none (SPEC-008)
- **Why:** on the owner's dnd_crawler wireframe, which reads with all zeros and was ruled right,
  PR 4's lint gave 14 errors and 24 advisories (DEVLOG 2026-11-17 (d)).
- **What:** `bar-short` judges rectangles only (six errors were cards' heading text);
  `row-split` needs boxes of a size, the shorter ≥ 75% of the taller (eight errors were short
  items grazing taller cards in the next column); `sibling-overlap` ignores overlaps within the
  reader's 2px slack (22 advisories were headings touching their notes by 0.6px). Conventions § 9
  says so.
- **Result:** that scene 0 errors and 2 advisories (S09's buttons, overlapping by 6px, real).
  UI-Wizard's dashboard still none; every golden unchanged; `human-round-1` loses its pinned 0.6px
  advisory. Four tests, three seen red first. 199 / 199.
- **Rejected:** dropping `row-split` (the ragged row it targets is real); a tolerance on
  `bar-short`'s span (the misfires were text, not near misses).
- **Opens:** the 0.75 rests on one scene; KI-10 is next.

> Entries below dated 2026-07-31 were backfilled on 2026-08-01 from the commits and the baton; they
> are short by intent, not by neglect.
