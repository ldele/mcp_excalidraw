<!-- status: active · updated: 2026-11-17 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

## 2026-11-17 (g) — Claude Code — round 1 committed (`3d5c383`); the lint recalibrated; STAGED
- **Done:** round 1 committed on the owner's yes, not pushed. The lint's three misfiring rules
  fixed on the dnd_crawler scene: 14 errors and 24 advisories down to 0 and 2, both real
  (DEVLOG 2026-11-17 (e), SPEC-008 § Recalibration). 199 / 199.
- **Where:** `main` at `3d5c383`, one ahead of `origin/main`; the fix staged.
- **Next:** commit the fix; the full gate; push both on the owner's yes; then KI-10.
- **Picks up:** any session with a terminal.

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
