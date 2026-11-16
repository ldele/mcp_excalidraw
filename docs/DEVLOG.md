<!-- status: active · updated: 2026-11-16 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: [`docs/archive/DEVLOG-archive-001.md`](archive/DEVLOG-archive-001.md). Rotation
began on 2026-10-08; the archive holds everything older than the entries kept here (three since
2026-11-16).

## 2026-11-16 (e) — T-027 and T-028 framed as three proposed ADRs; nothing built
- **What:** both tickets are design questions, so each was framed as decisions for the owner.
  ADR-003 covers how a screen shows its id. ADR-004 covers what a person's mark asks for. ADR-005
  covers approving a screen and ending a round. Each has four options with their costs, and none
  is marked recommended (cpc ADR-069). Both tickets carry a note pointing at their ADRs.
- **Found while framing T-028:** in dnd_crawler_rust's scene each screen's heading already starts
  with its number, at 22 px. Fitted to a 1,920 × 1,080 window (about 16 %), it is about 4 px tall,
  so the ask is about reading ids from an overview, not about adding them. Not checked: how the
  editor sizes a frame's name when zoomed out, which matters for ADR-003's option 2.
- **Opens:** CONTEXT's open question on frames is now ADR-003's option 2.

## 2026-11-16 (d) — T-026 and T-001 fixed: a tab's first sync leaves shapes the agent's; unsized text is read
- **T-026:** reproduced with the built-in browser as the tab, on a private canvas (BlackBox's WF-07
  is not on this machine). After the first click, unlabelled shapes drawn with `fontFamily`,
  `textAlign` or `fontSize` came back as "text styling changed, by human", and their origin
  flipped. Only text has a font, and the editor drops those keys from anything else, so
  `canonicalizeElement` (`src/core/changes.ts`) now compares them on text only. On the fixed build
  the same click sent 10 syncs and left 0 records, with every element still the agent's.
- **T-001:** `boxOf` gives text stored without a size the box export estimates, so with no tab
  the text is read and a heading names its screen. The entry says `size estimated` (SKILL.md
  says why). The server still stores no size, so a tab's measurement replaces the estimate.
  **Rejected:** measuring on the server, which would keep the estimate over the editor's.
- **Rule 2:** no file of upstream's touched.
- **Verified:** a test for each, both red before the fix. `npm test` gave 94 of 94 plus wire,
  bind, render and state; the corpus is unchanged; both type-checks pass. Not run: the browser
  suite. Seen in passing: one click gave 10 syncs, which looks like the autosync loop upstream's
  #142 stops.

## 2026-11-16 (c) — T-022 and T-025 fixed: `apply` can replace what it deletes, and a delete takes the label
- **T-022:** `apply` ran create, update, then delete, so a patch that deletes and re-creates an id
  deleted the new element. It now runs delete, create, update (`src/cli/commands/elements.ts`).
- **T-025:** `DELETE /api/elements/:id` left a shape's bound label drawn, and the reading, which
  skips bound text, never saw it. The route now deletes the labels too and returns every id it
  removed (`boundTextIds`, new `src/core/bound-text.ts`; one call in `src/server.ts`). The CLI
  skips an id the server already removed, so naming a label after its shape is not an error. The
  change feed reports one delete, the shape's, since a bound label is reported as its shape's
  (`isChangeTracked`). The reading now reads a label whose shape is gone as text (`wireframe.ts`).
- **Rule 2:** upstream 2.2.0 is still unmerged, with 14 commits and no change since this morning.
  Editing the delete route defers that merge, on the owner's "start T-022 and T-025". It adds one
  call to a hunk the dry merge already conflicts in.
- **Verified:** four tests in `tests/server-contract.test.mjs`; three failed on the unfixed
  build, and the fourth guards the 404 case. `npm test` gave 92 of 92 plus wire, bind, render and
  state. Both type-checks pass, and the corpus reads its five drawings as before. Live on port
  3047: `delete save` removed `save-label`, and a delete-and-create patch kept the new `cancel`.
  The screen was named, with 0 fallbacks and 0 orphans. Not run: the browser suite.

> Entries below dated 2026-07-31 were backfilled on 2026-08-01 from the commits and the baton; they
> are short by intent, not by neglect.
