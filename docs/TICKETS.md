<!-- status: active · updated: 2026-11-20 · class: living -->

# TICKETS — issues reported against mcp_excalidraw

One section per report, newest first (cpc ADR-047). A ticket is something somebody **reported** —
a consumer running a gate, a reader of a doc, a user of the app — and it is owed an answer. Open
one with `cpc-ticket new --title "…" --from "who" --at X.Y.Z`, the version the reporter was
running (`unknown` when they cannot say); close it with
`cpc-ticket close --id N --as fixed|declined|duplicate --note "where the answer went"`.
Before working on one, `cpc-ticket triage --id N` prints what was released since that version and
whether the lines it cites are still there (cpc ADR-055). Vendored, each verb is
`python tools/conventions/run.py ticket …`. `cpc-ticket check` fails when this file stops being a
ledger.

Not a known issue: that is a weakness this project found in itself, logged the second time it bit
(`docs/KNOWN_ISSUES.md`). A ticket may become one, or a fix, or a deliberate no — the
`Resolution` line says which. Once closed, a ticket leaves this file, word for word, for
`docs/archive/TICKETS-archive-NNN.md`, and `docs/archive/TICKETS-INDEX.md` lists it with its
status (cpc ADR-071, `[tickets] archive_on_close`), so this file holds what is still open.
Nothing is rewritten or deleted; a declined ticket keeps its reason.

T-001 to T-005 are one consumer's session, filed from
`docs/feedback/2026-08-21-provenote-wireframe-session.md` (its §1–§5) the day the ledger was
created.

<!-- Tickets below, newest first. The five lines are read by cpc-ticket and cpc-digest:
     ## T-NNN — title
     - **Status:** open | triaged | fixed | declined | duplicate  · date
     - **From:** who reported it, at what version · when
     - **Symptom:** one line: what was seen, and where
     - **Reproduce:** the command, or the file and line; `path:LINE at vX.Y.Z` can be traced
     - **Note:** date — what triage changed (optional; `cpc-ticket triage --id N --note` adds it)
     - **Resolution:** — (while open) | a DEVLOG date, a CHANGELOG version, KI-N, or why not -->

## T-031 — An agent's line whose first point is not the origin reads as a person's move
- **Status:** open · 2026-11-20
- **From:** self (unknown) · 2026-11-20
- **Symptom:** A line (seen; an arrow or freedraw likely too, unchecked) the agent stores with points[0] != [0,0] (the legend's example tick had [0,7]) is shifted by the tab so points[0] is the origin; the next sync records 'moved down 7px, path reshaped — by human', though nobody touched it. In PR 1 round 2 this was taken for the person moving the tick.
- **Reproduce:** Add {type:'line', x:0, y:0, points:[[0,7],[5,13],[14,0]]} by the API, open a tab, make any sync (Send button or a stroke), then 'changes': the line shows as moved by human
- **Resolution:** —
