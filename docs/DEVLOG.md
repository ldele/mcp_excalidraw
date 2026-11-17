<!-- status: active · updated: 2026-11-17 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: [`docs/archive/DEVLOG-archive-001.md`](archive/DEVLOG-archive-001.md). Rotation
began on 2026-10-08; the archive holds everything older than the entries kept here (three since
2026-11-16).

## 2026-11-17 (b) — ADR-005 built: an approval box in each screen (SPEC-007)
- **Why:** T-027's second half. A person who was done with a screen had to say so in chat.
- **What:** `src/core/approval.ts`: an element whose id ends `-approval` is its screen's approval
  box (by `frameId`, else the screen holding it). The reading leaves it out of the components;
  a fill or a person's mark centred inside it ticks it, and the tick is no annotation. A screen
  reads `· approved` or `· not approved yet`, under `Approved: 1 of 2 screens.`; `changes` says a
  tick `approves screen [s01] …`, and a fill taken off `withdraws approval of`. The legend gains
  a line; conventions § 8 has the box recipe; SKILL.md's loop, the README and
  `describe_wireframe`'s description say how.
- **Tests:** a new fixture, approval-boxes, the tick drawn in a real tab on port 3072; 13 unit
  tests. Each failed first. Every other golden unchanged. 157 / 157.
- **Rejected:** a tick only in green (a person who ticks in black means it too); the smallest
  holder as the box's screen in `changes` (it would name a header bar the box sits on).
- **Opens:** T-027 closes with this. Next is PR 4 (ADR-002), and ROADMAP PR 1, a person marking up
  through the loop, now has its conventions on the canvas.

## 2026-11-17 (a) — ADR-004 built: a mark's intent is its colour, and the legend says so (SPEC-006)
- **Why:** T-027. A person marking up had nothing on the canvas telling them how, and the agent
  guessed what each mark wanted from its words. ADR-004 chose intent by colour with a legend.
- **What:** `src/core/markup-intent.ts` reads a person's mark in the red, orange (Excalidraw's
  yellow), blue or green family of the editor's palette as change, remove, question or fine.
  `wireframe` tags each mark `[change]` etc.; `changes` prints `by human · change`, and
  `intent change → fine` on a recolour. A legend, an element whose id is `legend` or begins
  `legend-`, is left out with its members and whatever is drawn inside it, and the reading says
  so in one line. The skill ships it as `references/markup-legend.json`; conventions § 8,
  SKILL.md's hand-over, the README (a new differences row) and two MCP descriptions say how.
  `boxOf` and its helpers moved, unchanged, to `src/core/box.ts` so the new module and
  `changes.ts` do not import each other.
- **Tests:** annotated's marks recoloured to pin one of each intent and one untagged; a new
  fixture, markup-legend, whose two marks were drawn in a real tab on port 3072; 11 unit tests.
  Each failed first. Attribution baseline 7 / 8 (was 5 / 6), re-reviewed by hand. The other six
  goldens unchanged byte for byte. 139 / 139.
- **Rejected:** an exact-hex match (a lighter red from the shade row would carry nothing); a
  declared `role` for the legend (a new role); a CLI command to draw the legend (a file is
  enough and testable).
- **Opens:** ADR-005, the approval box, builds on this and adds its line to the legend.

## 2026-11-16 (m) — The upstream-differences table is kept current with every change
- **Why:** the owner asked that the differences with upstream be updated as the work goes, not
  only at merges.
- **What:** FORK.md § Keeping current now says that a change a user would notice updates its row
  of the README table, or adds one, in the same commit; a merge still updates the upstream column.
  AGENTS.md's verify loop points to it. The table was checked as current: ADR-003's frames,
  T-022, T-024, T-025 and the arrow fixes are already in it.
- **Also:** the two nested sessions, the 2.2.0 merge and the ADR-003 build, were confirmed done
  and archived on the owner's word. Neither had a worktree, branch or stash left.

> Entries below dated 2026-07-31 were backfilled on 2026-08-01 from the commits and the baton; they
> are short by intent, not by neglect.
