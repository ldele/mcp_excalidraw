# AGENTS.md — mcp_excalidraw

Canonical entry file for agent sessions — the de-branded, tool-neutral instructions any agent
reads on session start (AGENTS.md is the open cross-tool standard; the sibling one-line `CLAUDE.md`
is just an `@AGENTS.md` import stub so Claude Code, which reads `CLAUDE.md`, picks this up too —
ADR-014). It **points** at the coordination files; it does not restate them. Conventions: the
claude-project-conventions standard (CONVENTIONS.md in that repo).

## What this is

A private fork of [yctimlin/mcp_excalidraw](https://github.com/yctimlin/mcp_excalidraw) that gives a
coding agent a live Excalidraw canvas: draw on it, screenshot it, and read it back **as a user
interface** rather than as a list of shapes. The north star is the wireframe layer — screens,
component roles, reading order, navigation flows — plus a review loop where a human marks the canvas
up and the agent reads the markup attributed to the component it refers to. What the fork adds and
why it must not be `npx`'d: **[FORK.md](FORK.md)**.

**State (2026-07-31):** fork stands on its own (renamed, private, inherited branches cut). Wireframe
reading and the review loop work; the two-way markup leg has never been exercised by a human.
Detail: `.claude/CONTEXT.md`.
**Stack:** Node ≥ 18 · TypeScript ESM → `dist/` · React 18 + Vite frontend on `@excalidraw/excalidraw`.
Full stack + constraints: `.claude/CONTEXT.md`.

## Coordination files (read in this order)
1. `.claude/SESSION.md` — handoff baton: **newest 3 entries** (who worked last, what's next, which agent picks up). Older entries are rotated to `docs/archive/`.
2. `.claude/CONTEXT.md` — canonical facts, locked settings, current phase.
3. `docs/DEVLOG.md` — running log, newest first: **newest 3 entries**.
4. `.claude/KNOWN_ISSUES.md` — open weaknesses / recurring failures.

Reference: `docs/ROADMAP.md` · `docs/architecture.md` · `docs/decisions/` (ADRs) · `docs/specs/`.

## Non-negotiables (digest — full text `.claude/CONTEXT.md`)
1. **Stage, never commit.** Default for every agent: stage the diff and hand it off for the
   owner's review; commit/push only on the owner's explicit, per-commit instruction (CONVENTIONS §13).
2. **Track upstream before editing the collision zone.** `git fetch upstream && git log --oneline HEAD..upstream/main`
   at session start, and always before touching `src/server.ts`, `src/index.ts` or
   `src/core/normalize.ts` (rule 2).
3. **Edit `skills/`, never `.agents/`**, then `npm run sync:skills` (rule 3).
4. **A wireframe change closes only when the round-trip does** — draw it, read it back, zero `shape`
   fallbacks (rule 4).

## Tool choice (no work-type split — ADR-025)
Any agent session may plan, review, document, or execute. Pick the surface by the **capability the
next action needs** (a terminal, a connector, a browser), never by work type; note a capability
need in the baton's "Picks up" line when it exists.

Specific to this project: screenshots, image export, Mermaid conversion and viewport control need an
**open browser tab** on the canvas URL — the CLI exits with code 4 when there isn't one.

## Engineering standards
- Engineering preferences (design + working protocol + file-level maintainability) live in
  CONVENTIONS **§12** (design principles) + **§13** (working protocol) + **§16** (split-by-concept
  file caps, test weight, frontend v1) — never commit/push without approval, name coupling across
  >1 module, copy-pasteable commands. Read them there; do not restate. Three ship a gate
  (`cpc-push-guard`, `cpc-coupling-check`, `cpc-test-api-check`) but **none fires by itself** —
  they are on-call unless this project wired hooks or runs them in CI (ADR-015/ADR-022).
- Verify loop: `npm run type-check` · `npm run build` · `npm run test:bind`, then a live CLI
  round-trip (`start` → `add` → `wireframe` → `stop`). Docs land with the code.
- Run `PYTHONPATH=tools/conventions python -m cpc.docs_check --root . --strict` on-call / before handoff (the vendored gate, ADR-015).

## Skills in play

| When | Use |
|------|-----|
| Drawing or reading any UI on the canvas | `skills/excalidraw-skill/SKILL.md` + `skills/excalidraw-skill/references/wireframe-conventions.md` |
| Recording a decision (frames vs rectangles, codegen or not) | `[[architecture-decision]]` |
| Planning the next wireframe increment | `[[iterative-planning]]` → `docs/ROADMAP.md` |
| A recurring wireframe misread or flaky round-trip | `[[known-issues]]` |
| Ending a session | `[[session-baton]]` → append to `.claude/SESSION.md` |

## Keypoints (run these; each routes to a skill when installed, else prints the inline checklist)

| When | Run |
|------|-----|
| Plan / increment start | `cpc-keypoint plan-start` |
| Session start | `cpc-keypoint session-start` |
| Sprint activation | `cpc-keypoint sprint-start` |
| Sprint checkpoint / closeout | `cpc-keypoint sprint-close` |
| Session end / handoff | `cpc-keypoint session-close` |

Vendored form: `PYTHONPATH=tools/conventions python -m cpc.keypoint <name>` (ADR-020).

> Rules changed? Edit `.claude/CONTEXT.md` (the canonical text). This file only points.
> An agent's project settings only point here — never restate rules there.
