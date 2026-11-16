<!-- status: active · updated: 2026-11-16 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

## 2026-11-16 (f) — Claude Code — T-024 fixed; STAGED
- **Done:** elbowed arrows keep their bindings through export, import and a tab (DEVLOG 2026-11-16
  (f)). T-024 is closed. Entry (e) was committed as `9c15c1f` and pushed.
- **Where:** `main`, staged, not committed. `dist/` and `dist/frontend` are rebuilt. No canvas is
  left running; the probes used port 3050.
- **Mind:** Playwright's bundled headless shell is not installed here. Run the browser suite
  against the system Chrome with a config that sets `use.channel` to `chrome`; `PW_CHANNEL` is not
  read.
- **Next:** the owner's calls on the 2.2.0 merge and ADR-003 to ADR-005; then PR 4.
- **Picks up:** any session with a terminal.

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
