<!-- status: active · updated: 2026-11-16 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

## 2026-11-16 — Claude Code — cpc 1.23.0, upstream 2.2.0 measured, docs cut, tickets triaged; STAGED
- **Done:** the cpc re-vendor and its follow-ups, the README and FORK.md cut, and the triage of 17
  open tickets, each ranked (DEVLOG 2026-11-16).
- **Where:** `main`, staged, not committed. `docs/TICKETS.md` also carries T-020 to T-022 and the
  T-006 note, which another session left unstaged in October.
- **Owner's calls:** whether to merge upstream 2.2.0 (`FORK.md` § Upstream 2.2.0), and whether to
  lay cpc's deny rules (cpc ADR-080).
- **Next:** T-022 and T-025, then T-026 and T-001, then PR 4.
- **Picks up:** any session with a terminal.

## 2026-10-23 — Claude Code — T-023 fixed: the scene is saved per port, a tab outlives a restart; STAGED, not committed
- **Done, from a drawing-app session on the owner's word ("fix it in the toolkit"):** T-023 filed
  and fixed. The server saves its scene to `scene-<port>.json` beside the pidfile and loads it on
  start (`src/core/scene-store.ts`, new); a tab that reconnects to a restarted process merges and
  sends its scene back (`frontend/src/App.tsx`, `frontend/src/utils/scene.ts`). Docs: README,
  `FORK.md`, the skill and cheatsheet (synced), KI-7. DEVLOG 2026-10-23.
- **Where:** the main checkout, `main` at `060139c`, staged (`git diff --cached`). In
  `docs/TICKETS.md` only T-023 is staged: T-020 to T-022, another session's (2026-10-21), stay
  unstaged in the working tree for their own commit.
- **Verified:** `npm test` 88 / 88 plus scripts; Playwright 22 / 22 with the system Chrome; seeded
  defects caught; a live kill-and-restart round on 3021. `dist/` is built, so `excalidraw-canvas`
  on PATH carries the fix.
- **Upstream moved** (7 commits, its own opt-in store among them, 12 conflicts in a dry merge);
  not merged. What to decide at the next merge is in `FORK.md`.
- **Mind:** port 3010 waits on the owner, who is exporting a tab still open on it from before
  this build; do not start a canvas there until they say so. Port 3000 belongs to a
  pharma-dq-validator session. The house skill `wireframe-first` (claude-skills) still said "the
  canvas is memory"; its edit is staged in that repository, not here.
- **Next:** the owner reviews and commits; push; dispatch CI by hand (KI-8). Then T-001 with no
  tab, then PR 4. The pull request to upstream stays held.
- **Picks up:** any session with a terminal.

## 2026-10-09 — Claude Code — the spare worktree and three merged branches are gone; the probes moved
- **Corrects every earlier line that names `C:\Projects\mcp_excalidraw-merge`** — the "Standing,
  local only" of entries (h) and (j) of 2026-10-08, the Where of entry (i), and the older ones.
  That worktree no longer exists. It was removed on 2026-10-08, on the owner's word, with the
  local branches
  `merge/upstream-2.1.2`, `t009-waypoints-fork` and `t015-origin-guard`: all three merged into
  `main`, deleted with `git branch -d`, none of them ever on GitHub.
- **The probes were kept, not lost.** The three scripts and two Playwright configs that sat
  untracked there are in `C:\Projects\mcp_excalidraw-upstream\tests\probe-fork\`, with a
  `README.txt` that says what each one answers and how to run it. Where the DEVLOG, the entries
  (e) to (j) of 2026-10-08, or T-015's Reproduce line say `mcp_excalidraw-merge\tests\probe`,
  read that folder.
- **What is left locally:** `main`, and `t009-waypoints-upstream` in
  `C:\Projects\mcp_excalidraw-upstream`, which holds the held upstream patch (`527500b`), its
  `PR_BODY.md`, the upstream tab probe and now `tests/probe-fork/`. All of that is untracked or
  unpushed, so removing that worktree loses it.
- **Next:** unchanged from entry (k) of 2026-10-08: T-001 with no tab, then PR 4. The pull
  request to upstream stays held.
- **Picks up:** any session with a terminal. No canvas is running.
