<!-- status: active · updated: 2026-11-23 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

## 2026-11-23 (b) — Claude Code — T-009 sent upstream as #153; session closed; FORK.md STAGED
- **Done:** (a)'s close-out is committed and pushed as `6cbd167`. T-009 was rebased onto upstream
  2.2.0 and the owner opened yctimlin/mcp_excalidraw#153 (open, no comments yet). T-014 was ported
  too but held: upstream declined that guard in #122 and fixed the cause in #142.
- **Plan:** https://claude.ai/artifact/8xXsn5ivRXzjkJswTMLZ1s, checked against all 145 upstream
  issues and PRs. Next candidate T-017 waits on #153; each PR needs the owner's yes.
- **Where:** FORK.md's T-009 row (now pointing to #153) is staged. The PR checkout is
  `C:\Projects\mcp_excalidraw-upstream`, branch `t009-waypoints-2.2.0`; `t014-empty-sync.patch` is there.
- **Next:** check #153; CI still unrun since `6414461` (KI-8); PR 1 round 3 (KI-3).
- **Picks up:** a session with a browser pane, the owner at it for round 3.

## 2026-11-23 (a) — Claude Code — session closed; open items compiled; close-out STAGED
- **Done (2026-11-20 to 21, DEVLOG):** T-029/T-030, ADR-007 decided and built, T-002/T-003,
  PR 1 round 2 (2 of 2 hits), the header's Send button, T-031: all pushed, last `550a0e0`. (19 a)'s
  staged deny rules were committed since. Today: FORK.md gained 8 missing rows for upstream files
  we change; README rows corrected; a FRICTION line (`cpc-rotate`, 2nd).
- **Owner's list:** artifact https://claude.ai/artifact/9ENqkvK1rPwCwNARrTgEp4 (checks, piled
  decisions, ranked upstream candidates). CI has not run since `6414461` (KI-8): dispatch.
- **Next:** PR 1 round 3, marks on single components (KI-3); KI-6's size ceiling first if wanted.
- **Picks up:** a session with a browser pane, the owner at it for the round.

## 2026-11-19 (a) — Claude Code — cpc deny rules laid; STAGED
- **Done:** `cpc-init --add deny-rules` laid `.claude/settings.json` (22 deny entries): the agent's
  own `git commit`, `push`, `merge`, `tag` are refused from the next session (DEVLOG 2026-11-19 (a)).
- **Where:** `main` at `3437a36`; `.claude/settings.json`, DEVLOG and this note staged, not committed.
- **Next:** CONTEXT.md rule 1 and the memory reworded to match; AGENTS.md rule 1 reworded too; nothing
  left to reword; ADR-007, T-002, T-003 unchanged.
- **Picks up:** any session with a terminal, after the owner's decisions.
