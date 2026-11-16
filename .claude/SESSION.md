<!-- status: active · updated: 2026-11-16 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

## 2026-11-16 (d) — Claude Code — T-026 and T-001 fixed; STAGED
- **Done:** a tab's first sync no longer marks shapes drawn with a font key as a person's, and
  text added without a size is read with an estimated box. Both tickets are closed (DEVLOG
  2026-11-16 (d)). Entry (c) was committed and pushed; it is `d9dcbdf` since the rewrite below.
- **Where:** `main`, staged, not committed. `dist/` is rebuilt. No canvas is left running; probes
  used ports 3048 and 3049.
- **Mind:** the cpc session rewrote this repository's history on 2026-11-16 to take
  `tools/conventions/` out of every commit, and force-pushed it. The hashes named in older entries
  and the DEVLOG no longer exist; find those commits by their message.
- **Next:** the owner's call on 2.2.0; then PR 4.
- **Picks up:** any session with a terminal.

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
