<!-- status: active · updated: 2026-11-17 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

## 2026-11-17 (f) — Claude Code — PR 1 round 1 recorded; STAGED
- **Done:** the owner marked up the dnd_crawler wireframe on port 3080: one mark, a green loop
  round S01 meaning "S01 is fine", read `fine` but attached to a heading inside (KI-10). Pinned as
  `human-round-1`; baseline 7 / 9; KI-3 stays open (DEVLOG 2026-11-17 (d)).
- **Where:** `main` at `135a1ab`; the record is staged. The canvas on 3080 keeps the round
  (`scene-3080.json`); 3081 held the fixture's draft.
- **Next:** fix the lint's misfires on that real scene (14 errors on a drawing that reads right);
  then KI-10; then a round 2.
- **Picks up:** any session with a terminal.

## 2026-11-17 (e) — Claude Code — PR 4 landed and pushed (`5c5daf6`)
- **Done:** PR 4 committed on the owner's yes; the full gate (`npm test`) passed once; pushed on
  the owner's yes. `origin/main` is at `5c5daf6`.
- **Not done:** the Playwright browser suite, and a CI dispatch on the day's commits (KI-8).
- **Next:** ROADMAP PR 1: a person marks a canvas up through the loop, with the legend, the intent
  colours and the approval boxes, and the attribution accuracy is measured on what they drew.
- **Picks up:** a session with a terminal and a browser tab, and the owner at the canvas.

## 2026-11-17 (d) — Claude Code — PR 4 built: the geometry lint (SPEC-008); STAGED
- **Done:** `wireframe --lint` and a `### Drawing quality` block in the reading: five errors,
  three advisories, every tolerance calibrated on the corpus first. 189 / 189 node tests
  (DEVLOG 2026-11-17 (c), SPEC-008 § Verified). KI-9 logged (a test canvas dying at boot on
  Windows, seen twice).
- **Where:** `main` at `b2792cc`, equal to `origin/main`; PR 4 staged, waiting on the owner's yes.
- **Next:** commit PR 4; the full gate once, then push on the owner's yes; then ROADMAP PR 1, the
  attribution measurement, which needs a person.
- **Picks up:** any session with a terminal; PR 1 needs a person and a browser tab.
