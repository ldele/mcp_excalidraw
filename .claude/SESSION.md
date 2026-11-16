<!-- status: active · updated: 2026-11-16 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

## 2026-11-16 (b) — Claude Code — cpc untracked and gitignored, rule 5; STAGED
- **Done:** `tools/conventions/` is out of git and gitignored, CI's cpc job is removed, and the
  owner's rule is `.claude/CONTEXT.md` rule 5 (DEVLOG 2026-11-16 (b)). Entry (a) was committed as
  `cf11f24`.
- **Where:** `main`, staged, not committed; nothing pushed.
- **Mind:** a fresh clone or worktree has no gates until it re-vendors from a cpc tag. Never
  `git add -f` under `tools/conventions/`.
- **Next:** unchanged from entry (a). The cpc-wide default is being worked on in its own session,
  in the cpc repository.
- **Picks up:** any session with a terminal.

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
