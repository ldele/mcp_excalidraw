<!-- status: archived · updated: 2026-11-17 · class: append-only -->

# DEVLOG archive 002

Rotated DEVLOG entries — moved here from `docs/DEVLOG.md` once it held more than 3, **verbatim** per cpc ADR-023 rule 13b and cpc ADR-053. Newest entry on top. Append-only; never edited.

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
