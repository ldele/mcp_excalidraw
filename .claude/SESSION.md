<!-- status: active · updated: 2026-11-17 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

## 2026-11-17 (c) — Claude Code — ADR-004 and ADR-005 landed and pushed
- **Done:** ADR-005 committed as `a420ce5` on the owner's yes; the full gate (`npm test`) passed
  once, then both commits were pushed on the owner's yes. `origin/main` is at `a420ce5`.
- **Not done:** the Playwright browser suite (`test:canvas`) was not run, and no CI run was
  dispatched on the two commits (CI runs only by `workflow_dispatch`, KI-8).
- **Next:** PR 4 (ADR-002). ROADMAP PR 1, a person marking up through the loop, now has its
  conventions on the canvas: the legend, the intent colours, the approval boxes.
- **Picks up:** any session with a terminal.

## 2026-11-17 (b) — Claude Code — ADR-004 committed (`1a5f530`); ADR-005 built (SPEC-007), STAGED
- **Done:** ADR-004 committed on the owner's yes as `1a5f530`, not pushed. ADR-005: each screen's
  "Approved" box (`s01-approval`), ticked by a person in a real tab, reads `· approved` in
  `wireframe` and `approves screen` in `changes`. 157 / 157 node tests; round trip closed on port
  3072 (DEVLOG 2026-11-17 (b), SPEC-007 § Verified). T-027 closed.
- **Where:** `main` at `1a5f530`, one commit ahead of `origin/main`; ADR-005 staged.
- **Next:** commit ADR-005 on the owner's yes; the full gate (`npm test`) once, then push both on
  the owner's yes; then PR 4 (ADR-002).
- **Picks up:** any session with a terminal.

## 2026-11-17 (a) — Claude Code — ADR-004 built (SPEC-006); STAGED, not committed
- **Done:** a person's mark in red, orange, blue or green reads as change, remove, question or
  fine in `wireframe` and `changes`; the skill ships a "How to mark up" legend
  (`references/markup-legend.json`) that the reading leaves out. Round trip closed on port 3072
  with a real tab; 139 / 139 node tests (DEVLOG 2026-11-17 (a), SPEC-006 § Verified).
- **Where:** `main` at `82ef3ed`; this change is staged, waiting on the owner's yes to commit.
  `dist/` is rebuilt (the baton's open item from (m) is done).
- **Next:** commit ADR-004; build ADR-005 (an approval box per screen, its line in the legend,
  its README row); then PR 4.
- **Picks up:** any session with a terminal; ADR-005's round trip needs a browser tab.
