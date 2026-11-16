<!-- status: active · updated: 2026-11-16 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

## 2026-11-16 (e) — Claude Code — T-027 and T-028 framed as ADR-003 to ADR-005; STAGED
- **Done:** three proposed ADRs in `docs/decisions/`, with pointers from both tickets and CONTEXT
  (DEVLOG 2026-11-16 (e)). Entry (d) was committed as `bd24f30` and pushed. No code changed.
- **Where:** `main`, staged, not committed.
- **Owner's calls:** one option in each of ADR-003, ADR-004 and ADR-005, and the 2.2.0 merge.
- **Next:** build what the ADRs decide; options that change the reading need rule 4's round trip.
  Then PR 4.
- **Picks up:** any session with a terminal. ADR-003's option 2 needs a browser tab to check how
  a frame's name looks when zoomed out.

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
