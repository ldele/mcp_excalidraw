<!-- status: active · updated: 2026-11-17 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: [`docs/archive/DEVLOG-archive-001.md`](archive/DEVLOG-archive-001.md). Rotation
began on 2026-10-08; the archive holds everything older than the entries kept here (three since
2026-11-16).

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

## 2026-11-17 (d) — PR 1, round 1: one mark by a person, a miss; the lint misfires on a real drawing
- **Why:** the attribution measurement (ROADMAP measure 3, KI-3) needs marks a person drew.
- **What ran:** the owner's dnd_crawler_rust wireframe (29 screens, read-only from that repo)
  imported on port 3080, with the markup legend and approval boxes on the 23 screens with room;
  the owner drew in the browser pane. The tab's load made no human record. The owner drew one
  mark: a green loop round all of S01, confirmed as "S01 is fine". Intent read right; the target
  was a heading inside the screen: 0 of 1. Logged as KI-10; pinned as `human-round-1` (S01's
  geometry with neutral words, since this repository is public, and the owner's stroke as drawn).
  Baseline 7 / 9. KI-3 stays open: one mark is no measurement.
- **Also found:** the geometry lint (PR 4) gives 14 errors and 24 advisories on that scene, which
  reads with all zeros and which the owner ruled correct: `bar-short` judges text, `row-split`
  fires on a column beside a taller panel, `sibling-overlap` on a 0.6px touch. Calibration on the
  corpus missed them; fixing them is the next change (the list is in the scene's lint output).
- **Opens:** KI-10's fix (a mark round a whole screen targets it, and a `fine` one approves it);
  the lint's misfires; a round 2 with more marks.

## 2026-11-17 (c) — PR 4 built: the geometry lint (ADR-002, SPEC-008)
- **Why:** `--score` says whether the reading succeeded; nothing said whether the drawing follows
  the conventions, and on 2026-08-07 a footer 4.29px outside its frame surfaced only as "1 screen
  could not be named".
- **What:** `src/core/wireframe-lint.ts` reads the reader's own model into findings with a stable
  `ruleId`, `severity`, `elementId`, `message` and `measured` value. Five errors
  (`containment-near-miss`, `row-split`, `bar-short`, `threshold-edge`, `oversized-annotation`)
  and three advisories (`frame-overflow`, `sibling-overlap`, `small-text`). The plain reading,
  and so `describe_wireframe`, shows `### Drawing quality` when there is an error;
  `wireframe --lint` lists all; `--json` carries `lint`. Reporting only. The reader's thresholds
  moved to `src/core/reader-rules.ts`, which the lint shares.
- **Calibration:** every tolerance measured on the corpus first (SPEC-008 § Calibration). Off-grid
  coordinates, frame width and inset were rejected: the conventions' own 1px inset and the
  phone-sized fixtures make them fire on drawings that read right. Zero errors on every clean
  fixture and on UI-Wizard's 98-element dashboard.
- **Tests:** a new fixture, lint-near-misses, with the 2026-08-07 footer and one case of each
  other error; 17 unit tests; the corpus now asserts each fixture's lint. 189 / 189.
- **Also:** conventions § 4 said a header must span 90% of its edge; the reader uses 80% (70% for
  a sidebar's height), and the conventions now say so. KI-9 logged: a canvas a test boots
  sometimes dies at boot on Windows (`0xC0000409`), seen twice.
- **Opens:** a `--check` exit code once the rules have met more real drawings (ADR-002); the
  browser panel as a view over `lint`.

> Entries below dated 2026-07-31 were backfilled on 2026-08-01 from the commits and the baton; they
> are short by intent, not by neglect.
