<!-- status: active · updated: 2026-11-16 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: [`docs/archive/DEVLOG-archive-001.md`](archive/DEVLOG-archive-001.md). Rotation
began on 2026-10-08; the archive holds everything older than the entries kept here (three since
2026-11-16).

## 2026-11-16 (j) — ADR-003 built: screens are native frames, staged (SPEC-005, T-028)
- **What:** a top-level frame is a screen named by its `name`, held or empty; `frameId` decides
  membership, then geometry, so a scene with no frames reads as before. A rename is a label change
  in `changes`. The skill and conventions draw a screen as a frame.
- **The owner's calls:** the whole name is the label; the name is enough (an empty frame is an
  empty screen); `frameId`, then geometry. **Rejected:** splitting the name, a heading in every
  frame, geometry only (SPEC-005 § Open questions).
- **Found live, fixed:** an agent's arrow ending on a frame lost its binding in a tab (upstream
  #110 keeps frames out of the converter), and the reading took the navigation for markup.
  `prepareServerScene` binds it as the export does (`FORK.md`, SPEC-005 § Findings).
- **Verified:** both type-checks; `npm test` (corpus 123 / 123); Playwright 32 / 32, system Chrome. Old goldens
  unchanged; attribution 5 / 6; each new test failed first. Live on 3071 with a real tab: frame
  names read, 0 fallbacks; a tab note was one human record on `[s02-out]`; a tab rename was one
  record and the reading took it; navigation intact.
- **Not done:** ADR-004, ADR-005; `describe_scene` ignores frame names; no rectangle scene migrated.

## 2026-11-16 (h) — Upstream 2.2.0 merged on a branch, staged (SPEC-004)
- **What:** all 14 commits to `81720ac`, on `merge/upstream-2.2.0` in the worktree
  `C:\Projects\mcp_excalidraw-merge`. 14 conflicts; the Dockerfiles stay deleted. In
  `src/server.ts` our change log, the T-025 cascade and the per-element sync now sit inside
  upstream's `commitCanvasMutation`. 30 tools with `get_selection`.
- **Store, the owner's call:** ours stays the default; `EXCALIDRAW_DATA_DIR` switches to upstream's
  and turns ours off. **Rejected:** ours giving way, which would rewrite T-023's restart path and
  split the change log from the scene; refusing upstream's, which drops its check.
- **Found:** (1) upstream's rollback restores only the maps, so a refused write would have kept its
  change record; `commitTracked` puts the log back. (2) Upstream's new embedded-PNG test showed that
  after a tab's sync a labelled shape did not list its label; the untouched shape now takes the
  reference, no record. (3) Upstream's durable check cannot pass on Windows, its own copy included
  (`kill` is abrupt there); three assertions skip on Windows. (4) Its memory-only checks needed
  `EXCALIDRAW_NO_PERSIST=1`.
- **Verified:** both type-checks; `npm test` (corpus 100 / 100, wire, bind, render, state,
  durable, share, paths) and `check-selection`; Playwright 32 / 32 on the system Chrome. Each
  new test fails with its fix taken out. Live on port 3061 with a real tab: no sync on load or on
  a click (10 before #142), one per edit; a note and a drag were one human record each, on the
  right element; 0 fallbacks. `npm audit` 16, `main` 19.
- **Not done:** CI (dispatch after the push, KI-8); the version stays 1.3.0.

## 2026-11-16 (g) — ADR-003 to ADR-005 accepted; the 2.2.0 merge decided
- **Decided by the owner, one at a time:**
  - ADR-003: screens become native frames, and the reading takes the frame's name.
  - ADR-004: a mark's intent is its colour, with a legend frame.
  - ADR-005: each screen gets an approval box; a round still ends with `watch`'s quiet period.
  - Upstream 2.2.0: merge it next, before those builds.
  Each ADR records the choice; T-027 and T-028 carry a note.
- **Checked before ADR-003 was asked:** 25 screens, 13 of them named frames, opened in a real tab
  fitted to 1,600 × 900 at 10 %. The editor draws a frame's name as a page label at a fixed 14 px
  (`FRAME_STYLE.nameFontSize`), while the 22 px headings were about 2 px tall. Exports and renders
  draw the name at 14 px of the drawing, so there it shrinks.
- **Corrected in ADR-004 before acceptance:** the colour option's cost no longer says the agent's
  palette must avoid the four colours. Only a person's marks are read for intent.
- **Nothing built.**

> Entries below dated 2026-07-31 were backfilled on 2026-08-01 from the commits and the baton; they
> are short by intent, not by neglect.
