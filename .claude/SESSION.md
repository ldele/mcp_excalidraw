<!-- status: active · updated: 2026-11-19 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

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

## 2026-11-17 (p) — Claude Code — session closed; everything committed and pushed
- **Done today (DEVLOG 2026-11-17):** ADR-004, ADR-005, ADR-006 built; PR 4 (geometry lint), then
  recalibrated on a real drawing; PR 1 round 1 (one mark, KI-10, fixed); T-004, T-005, T-006,
  T-008, T-017, T-018, T-019, T-021, T-027 closed; ADR-007 proposed. Entry (o) said ADR-007 was
  staged: it is pushed, as `012396f`.
- **Where:** `main` equals `origin/main` at `012396f`, apart from this entry and
  `docs/FRICTION.md` (two notes, new). No CI run dispatched on the day's commits (KI-8).
- **Next:** the owner decides ADR-007, T-002 and T-003 (2026-11-18); then PR 1's round 2 from
  the next real review (KI-3), run as ADR-007 settles.
- **Picks up:** any session with a terminal, after the owner's decisions.
