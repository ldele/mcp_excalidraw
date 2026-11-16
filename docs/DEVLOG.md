<!-- status: active · updated: 2026-11-16 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: [`docs/archive/DEVLOG-archive-001.md`](archive/DEVLOG-archive-001.md). Rotation
began on 2026-10-08; the archive holds everything older than the entries kept here (three since
2026-11-16).

## 2026-11-16 (m) — The upstream-differences table is kept current with every change
- **Why:** the owner asked that the differences with upstream be updated as the work goes, not
  only at merges.
- **What:** FORK.md § Keeping current now says that a change a user would notice updates its row
  of the README table, or adds one, in the same commit; a merge still updates the upstream column.
  AGENTS.md's verify loop points to it. The table was checked as current: ADR-003's frames,
  T-022, T-024, T-025 and the arrow fixes are already in it.
- **Also:** the two nested sessions, the 2.2.0 merge and the ADR-003 build, were confirmed done
  and archived on the owner's word. Neither had a worktree, branch or stash left.

## 2026-11-16 (l) — README § How it differs from upstream: the differences at a glance
- **Why:** the owner asked for a document, reachable from the README, that sums up how this
  project differs from upstream. FORK.md holds the detail, but it is written for whoever merges
  upstream next.
- **What:** a table in the README, upstream 2.2.0 against this fork, by what a user would notice:
  install, reading the canvas, a person's edits, MCP tools, restart, other sites' requests, a
  tab's sync, `apply`, deleting a labelled shape, arrows, the skill. The README's opening note
  points to it. FORK.md § Keeping current says to bring it up to date at every merge.
- **Checked:** each upstream claim against `upstream/main` (`81720ac`). Its sync clears the store
  and rewrites it; `cors()` answers every origin, and nothing refuses an empty sync; `apply` runs
  create, update, delete; no waypoints are kept; it has 27 tools; its store needs
  `EXCALIDRAW_DATA_DIR`.
- **Before this:** both nested sessions, the 2.2.0 merge and the ADR-003 build, had finished and
  closed out, on the owner's word that they should first. Their work is on `main` up to `e4e2bb4`.

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

> Entries below dated 2026-07-31 were backfilled on 2026-08-01 from the commits and the baton; they
> are short by intent, not by neglect.
