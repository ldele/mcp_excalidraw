#!/usr/bin/env python3
"""Make a tool's own output survive text cpc did not write (KI-9; SPRINT-021 before it).

Scope: the process's stdout/stderr error handler, and nothing else. No formatting, no colour, no
message text — those belong to the tool that prints them.

**The rule this enforces is already stated elsewhere and was only ever half-kept:** a cpc tool must
never crash on its own report line (`findings.from_tagged` says it for a gate's own strings). This
says it for text a *user* wrote — a DEVLOG heading, a glossary title, another repo's gate output.
On a stock Windows console the encoder is cp1252, so `print()` of a `→` (U+2192) raises
UnicodeEncodeError and the tool dies *after* its work is on disk: a rotation that moved every entry
correctly reads as a crash.

**Fixed twice at the call site, re-opened twice.** SPRINT-021 reworded `sprint_check`'s own messages
to stay inside cp1252 and added `test_findings_are_console_safe`. `rotate.py` was written after that
fix and inherited neither, which is KI-9. Rewording cannot generalise: `rotate` echoes a heading its
user chose, so there is no cpc string left to reword. Four tools echo user-authored text today
(`rotate`, `docs_index`, `glossary_check`, `verdict_diff`), against 171 print sites in 26 modules —
too many places to keep a per-string discipline in.

So the fix is at the **stream**: one call per `main()` swaps the encoder from `strict` to `replace`.

**The cost, stated plainly:** an out-of-range glyph now prints as `?` rather than raising, so
`984 → 186` reads as `984 ? 186` on a cp1252 console. That is the trade and it is the right way
round — a lossy line beats a traceback over a run that succeeded, and `git diff` remains the
authority on what moved. Nothing changes under UTF-8, and cpc's own `—`/`·` are inside cp1252
either way. `backslashreplace` would keep the codepoint (`\\u2192`) at the price of a less readable
report; KI-9 filed `replace` and a heading identifies its entry either way.

`tests/test_console_safe.py` asserts **every** `cpc-*` console entry calls this, so console script
number 24 cannot inherit the bug the way `rotate` did.

stdlib only (Python 3.11+).
"""
from __future__ import annotations

import sys


def make_console_safe() -> None:
    """Swap stdout/stderr to `errors="replace"`. Idempotent, and a no-op where it cannot apply.

    Guarded with `getattr` rather than wrapping the call in a bare `except`: under pytest's capture
    — and under any caller that replaced the streams with a plain `StringIO` — there is no
    `reconfigure` at all, and a tool must not fail to start merely because its output is captured.
    """
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is None:
            continue
        try:
            reconfigure(errors="replace")
        except (ValueError, OSError):   # detached or closed stream — nothing left to make safe
            pass
