<!-- status: active · updated: 2026-11-23 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

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

## 2026-11-18 (a) — Claude Code — how agents reach the canvas; stray config removed, pushed
- **Done:** the owner asked how agents call the toolkit. The answer: the `npm link`ed
  `excalidraw-canvas` CLI, found through the house-skills `wireframe-first` skill. No MCP server
  is registered. Upstream's `claude_desktop_config.json` (`npx -y excalidraw-mcp`, a stranger's
  package) is deleted as `e39b18d`, pushed (DEVLOG 2026-11-18 (a)).
- **Where:** `main` equals `origin/main` at `e39b18d`, apart from this entry. CI not checked.
- **Next:** unchanged from (p): the owner decides ADR-007, T-002 and T-003; then PR 1's round 2.
- **Picks up:** any session with a terminal, after the owner's decisions.
