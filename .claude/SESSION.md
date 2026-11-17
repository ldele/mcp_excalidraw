<!-- status: active · updated: 2026-11-17 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

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

## 2026-11-17 (c) — Claude Code — ADR-004 and ADR-005 landed and pushed
- **Done:** ADR-005 committed as `a420ce5` on the owner's yes; the full gate (`npm test`) passed
  once, then both commits were pushed on the owner's yes. `origin/main` is at `a420ce5`.
- **Not done:** the Playwright browser suite (`test:canvas`) was not run, and no CI run was
  dispatched on the two commits (CI runs only by `workflow_dispatch`, KI-8).
- **Next:** PR 4 (ADR-002). ROADMAP PR 1, a person marking up through the loop, now has its
  conventions on the canvas: the legend, the intent colours, the approval boxes.
- **Picks up:** any session with a terminal.
