<!-- status: active · updated: 2026-11-16 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

## 2026-11-16 (c) — Claude Code — T-022 and T-025 fixed; STAGED
- **Done:** `apply` deletes before it creates, and a delete takes a shape's bound label with it.
  Both tickets are closed (DEVLOG 2026-11-16 (c)). Entry (b) was committed as `e5c58ef` and pushed.
- **Where:** `main`, staged, not committed. `dist/` is rebuilt, so `excalidraw-canvas` on PATH has
  both fixes.
- **Mind:** the delete route in `src/server.ts` is one more touch for the 2.2.0 merge (`FORK.md`).
- **Next:** the owner's call on 2.2.0; T-026 and T-001; then PR 4.
- **Picks up:** any session with a terminal.

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
