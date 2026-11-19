<!-- status: active · updated: 2026-11-19 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: [`docs/archive/DEVLOG-archive-001.md`](archive/DEVLOG-archive-001.md). Rotation
began on 2026-10-08; the archive holds everything older than the entries kept here (three since
2026-11-16).

## 2026-11-19 (a) — cpc deny rules laid in `.claude/settings.json`
- **Why:** the maintainer wants every project set up before cpc ADR-080 to carry the deny rules
  newer `cpc-init` profiles lay by default, so Claude Code refuses the agent's own commit, push,
  merge and tag.
- **What:** `cpc-init --root . --add deny-rules` created `.claude/settings.json` (22 entries:
  `git commit|push|merge|tag`, the `git -C` forms, `gh pr merge`, `gh release create`, and
  `CPC_PUSH_OK`, each for Bash and PowerShell). `docs_check --strict` and `init_check` pass.
- **Open:** `.claude/CONTEXT.md` rule 1 ("or gives explicit per-commit approval") and the project
  memory `commits-land-on-main` described an agent that commits after a yes. The owner chose to
  reword to match the deny rules: CONTEXT.md rule 1 and the memory now say the owner runs each
  commit, push, merge and tag; AGENTS.md:51 is held for the owner's own confirmation.

## 2026-11-18 (a) — Upstream's `claude_desktop_config.json` removed
- **Why:** the owner asked how agents reach the canvas. The answer is the `npm link`ed
  `excalidraw-canvas` CLI, and no MCP server is registered. That turned up the repo-root config
  left from upstream (`110bb19`). It ran `npx -y excalidraw-mcp`, a package that is neither this
  fork nor upstream, so pasting it into a client fetched a stranger's code.
- **What:** the file is deleted and logged in FORK.md § What we removed. README § MCP clients
  already gives the right config (`node <repo>/dist/index.js`, or `excalidraw-canvas`). Upstream
  has not edited the file since its second commit, so a merge conflict is unlikely; if it comes,
  keep the file deleted.

## 2026-11-17 (m) — ADR-007 proposed: a person's markup reaches the agent when they send it
- **Why:** the owner, after PR 1's round 1: the agent read the canvas mid-round and gave its view
  before the person had finished; it should wait for the end of the markup, perhaps with a
  Claude Docs-style "send to Claude" for one comment, without becoming intrusive.
- **What:** `docs/decisions/ADR-007-markup-is-sent-not-watched.md`, proposed, to decide
  2026-11-18: seven options (etiquette in the skill, a Send box on the canvas, a Send button in
  the page, a longer quiet period, holding unsent markup back from the reading, `@claude` for one
  comment, the agent answering on the canvas). Recommended: the Send box, unsent markup held back,
  and the skill's loop rewritten around the send; the button next, `@claude` only on evidence.
  Nothing built.
