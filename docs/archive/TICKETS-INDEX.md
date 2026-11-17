<!-- status: archived · updated: 2026-11-17 · class: living -->

# TICKETS archive index

One row per closed ticket, by id, newest first. Each left `docs/TICKETS.md` when it was closed
(cpc ADR-071); its text is verbatim in the archive its row names. Written by `cpc-ticket close`
and `cpc-rotate --file tickets`; `cpc-ticket list --all` adds the release that names each one.

| Ticket | Status | Closed | Title | Archive |
|---|---|---|---|---|
| T-028 | fixed | 2026-11-16 | Screens on a large canvas are hard to tell apart and to name in a message | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
| T-027 | fixed | 2026-11-17 | A person marking up a wireframe has no convention to follow, so markup falls back to chat messages | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
| T-026 | fixed | 2026-11-16 | A tab connecting re-marks agent shapes as human, and the reading then reorders a row and reads an icon as markup | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
| T-025 | fixed | 2026-11-16 | Deleting a labelled shape leaves its bound label on the canvas, and the reading does not count it | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
| T-024 | fixed | 2026-11-16 | A tab opening the canvas drops the bindings of an elbowed arrow made through the API, so the reading loses its flows | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
| T-023 | fixed | 2026-10-23 | A restarted canvas comes back empty, and a tab still open on it replaces its drawing with the empty scene | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
| T-022 | fixed | 2026-11-16 | apply runs create before delete, so a patch that replaces elements under the same ids deletes the new ones, silently | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
| T-021 | fixed | 2026-11-17 | A tall sibling merges a stacked checkbox column into one row, so each checkbox loses its label | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
| T-020 | fixed | 2026-11-16 | Update cpc from 1.8.0 to 1.18.1 at the start of the next session | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
| T-019 | fixed | 2026-11-17 | The first test run after an install or a build does not start: the server is not ready within the wait | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
| T-018 | fixed | 2026-11-17 | The browser probes for tab sync and for cross-origin access live outside the repository | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
| T-017 | fixed | 2026-11-17 | npm run dev was never run under the T-015 guard: the Vite page on port 5173 is another origin | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
| T-016 | fixed | 2026-10-08 | The conventions' list of valid roles leaves out icon, which the toolkit accepts and a small glyph needs | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
| T-015 | fixed | 2026-10-08 | Any origin can read, change and wipe a running canvas; a write through sync is logged as a person's | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
| T-014 | fixed | 2026-10-07 | A sync with no elements deletes the whole drawing: 98 elements lost to a tab that had failed to load | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
| T-013 | fixed | 2026-10-07 | Export writes every shape label in font 1 at 16 px and in the border colour, whatever the label says | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
| T-012 | fixed | 2026-10-07 | Opening a tab stamps an element human when it was drawn without a stroke colour or a font | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
| T-011 | fixed | 2026-10-08 | A tab that is panned or clicked rewrites an imported scene: every free-standing text moves by half its size and the reading loses half its components | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
| T-010 | fixed | 2026-10-08 | changes reports the tab's own label-fitting resize as an edit by human, and the write-back has a trigger: the first pan or click | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
| T-009 | fixed | 2026-10-08 | A bound arrow's waypoints are dropped when it is created; update keeps them | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
| T-007 | fixed | 2026-10-08 | changes reports the first routing of a bound arrow as an edit by human | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
| T-006 | fixed | 2026-11-17 | A corner-to-corner sidebar merges every sibling into one row, so the reading order goes column-major | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
| T-001 | fixed | 2026-11-16 | A text element without width/height silently disappears from the reading, including the screen heading | [TICKETS-archive-001.md](TICKETS-archive-001.md) |
