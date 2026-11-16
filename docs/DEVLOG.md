<!-- status: active · updated: 2026-11-16 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: [`docs/archive/DEVLOG-archive-001.md`](archive/DEVLOG-archive-001.md). Rotation
began on 2026-10-08; the archive holds everything older than the entries kept here (three since
2026-11-16).

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

## 2026-11-16 (b) — cpc is never made public: `tools/conventions/` untracked and gitignored
- **Why:** the owner ruled that the cpc tooling must never be made public. `gh` reports this repo
  as public, and `tools/conventions/cpc/LICENSE` grants no licence. The owner chose to keep the
  repo public and stop tracking cpc over making the repo private.
- **What:** `tools/conventions/` is in `.gitignore` and out of the index (`git rm -r --cached`);
  the files stay on disk, so the gates run as before here. CI's `docs` job, which ran the vendored
  gates from the checkout, is removed: a CI clone has no copy. The rule is `.claude/CONTEXT.md`
  rule 5, with a digest line in `AGENTS.md`; the justfile says the copy is local.
- **Rejected:** fetching cpc in CI. It would need a token for a private repository, for two
  ten-second checks.
- **Opens:** making this cpc's default for every project, in its own session in the cpc
  repository.

## 2026-11-16 — cpc 1.8.0 → 1.23.0; upstream 2.2.0 measured, not merged; README cut; tickets triaged
- **cpc:** re-vendored cpc 1.8.0 -> 1.23.0 (`tools/conventions/cpc/`, 67 modules) from a worktree
  of `v1.23.0`, no `--profile`. Then, per its release notes: known issues moved to
  `docs/KNOWN_ISSUES.md`; the four unedited template copies in `docs/` deleted; `entry_max_tokens`
  back to its laid 8000; `[tickets] archive_on_close` on; `## Releases` skipped; the baton and this
  log rotated to three entries. Not done: the deny rules (cpc ADR-080), the owner's call. T-020 closed.
- **Upstream (rule 2):** 2.2.0 at `81720ac`, 14 commits. A dry merge conflicts in 14 files;
  `src/server.ts` has 11 hunks, since upstream now wraps every store write in
  `commitCanvasMutation`. Not merged, and nothing in the collision zone edited. `FORK.md`
  § Upstream 2.2.0 says what it brings, including #148, a file-path fix we lack, and what to decide.
- **Docs:** README 652 → 265 lines. Upstream's changelog, comparison table, per-client configs and
  FAQ are gone, and the configs that said `npx -y mcp-excalidraw-server` (KI-1) now name the local
  binary. FORK.md 170 → 112, with a table of where we touch upstream's files. The AGENTS.md and
  CONTEXT.md state lines are brought to today.
- **Tickets:** three inbox reports admitted (T-026 to T-028); all 17 open tickets triaged with a
  rank; the 11 closed ones moved to `docs/archive/TICKETS-archive-001.md`.
- **Not run:** `npm test`, since no code changed.

> Entries below dated 2026-07-31 were backfilled on 2026-08-01 from the commits and the baton; they
> are short by intent, not by neglect.
