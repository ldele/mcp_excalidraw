<!-- status: active · updated: 2026-11-18 · class: living -->

# FRICTION

One line each time a tool or a rule got in the way: a retry, a workaround, a step done by hand
that a tool should have done. Written by `cpc-friction note`, without asking anyone (cpc ADR-060).
Nobody has to act on a line. A second line about the same subject is the signal: the digest shows
it, and it becomes a known issue here, or a ticket to the project that owns the tool.

- **2026-11-18** · `devlog rotation` — rotated a DEVLOG entry by hand into the wrong archive (001, not 002) before learning cpc-rotate does it
- **2026-11-17** · `docs_check` — Rule 13c passed a ~522-token DEVLOG entry while it was the newest, then failed it two entries later, forcing an edit to a past entry of an append-only log (2026-11-17).
- **2026-11-17** · `cpc-rotate` — With [rotate] write_index off, every DEVLOG rotation after the first rollover owed one DEVLOG-INDEX.md line, placed by hand: seven times in one session (2026-11-17).
