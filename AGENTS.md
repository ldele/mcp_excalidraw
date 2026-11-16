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

**State (2026-11-16):** three upstream merges taken (2026-08-07; 2026-10-07, upstream 2.1.2,
SPEC-002; 2026-11-16, upstream 2.2.0, SPEC-004). The 2.2.0 merge is on `main` as `c800fa8`,
pushed, with CI green (`FORK.md` § Upstream 2.2.0). The two-way markup leg has run with a human
and works, but the attribution accuracy it
exists to measure is **still untaken** (ROADMAP PR 1, KI-3). 11 tickets are open in
`docs/TICKETS.md`, each ranked in its 2026-11-16 triage note; T-001, T-022, T-024, T-025 and T-026
were fixed the same day, and ADR-003 to ADR-005 (T-027, T-028) were decided. ADR-003 (screens as
named frames, T-028) is on `main` as `6414461`, pushed (SPEC-005). **Next: build ADR-004 and
ADR-005; then PR 4.** Detail: `.claude/CONTEXT.md`.
**Stack:** Node ≥ 20 · TypeScript ESM → `dist/` · React 18 + Vite frontend on `@excalidraw/excalidraw`.
Full stack + constraints: `.claude/CONTEXT.md`.

## Coordination files (read in this order)
1. `.claude/SESSION.md` — handoff baton: **newest 3 entries** (who worked last, what's next, which
   agent picks up); `python tools/conventions/run.py baton` prints them. Older entries are rotated
   to `docs/archive/`.
2. `.claude/CONTEXT.md` — canonical facts, locked settings, current phase.
3. `.claude/NORTH_STAR.md` — what the project is for.

Open when the task needs them: `docs/DEVLOG.md` (running log, newest first) ·
`docs/KNOWN_ISSUES.md` (weaknesses this project found in itself) · `GLOSSARY.md`.

Reference: `docs/ROADMAP.md` · `docs/architecture.md` · `docs/decisions/` (ADRs) · `docs/specs/` ·
`docs/TICKETS.md` (issues reported against the fork; closed ones are in `docs/archive/TICKETS-INDEX.md`;
`python tools/conventions/run.py ticket new|triage|close|check` keeps the ledger).

## Non-negotiables (digest — full text `.claude/CONTEXT.md`)
1. **Stage, never commit.** Default for every agent: stage the diff and hand it off for the
   owner's review; commit/push only on the owner's explicit, per-commit instruction (CONVENTIONS §13).
2. **Track upstream before editing the collision zone.** `git fetch upstream && git log --oneline HEAD..upstream/main`
   at session start, and always before touching `src/server.ts`, `src/index.ts` or
   `src/core/normalize.ts` (rule 2).
3. **Edit `skills/`, never `.agents/`**, then `npm run sync:skills` (rule 3).
4. **A wireframe change closes only when the round-trip does** — draw it, read it back, zero `shape`
   fallbacks (rule 4).
5. **cpc is never made public.** `tools/conventions/` is gitignored: never commit, push, pack or
   attach it; a clone gets it back by a re-vendor from a cpc tag (rule 5).

## Tool choice (no work-type split — ADR-025)
Any agent session may plan, review, document, or execute. Pick the surface by the **capability the
next action needs** (a terminal, a connector, a browser), never by work type; note a capability
need in the baton's "Picks up" line when it exists.

Specific to this project: Mermaid conversion, viewport control and anything a *person* does — the
markup round, `watch` — need an **open browser tab** on the canvas URL; the CLI exits with code 4
when a command needs one and there is none. Screenshots and image export render headless since the
2.1.2 merge, and `render <file>` needs no canvas server at all.

## Engineering standards
- Engineering preferences (design + working protocol + file-level maintainability) live in
  CONVENTIONS **§12** (design principles) + **§13** (working protocol) + **§16** (split-by-concept
  file caps, test weight, frontend v1) — never commit/push without approval, name coupling across
  >1 module, copy-pasteable commands. Read them there; do not restate. Three ship a gate
  (`cpc-push-guard`, `cpc-coupling-check`, `cpc-test-api-check`) but **none fires by itself** —
  they are on-call unless this project wired hooks or runs them in CI (ADR-015/ADR-022).
- Verify loop: `npm run type-check` · `npm run build` · `npm run test:bind`, then a live CLI
  round-trip (`start` → `add` → `wireframe` → `stop`). Docs land with the code, the README's
  "How it differs from upstream" table included whenever a user would notice the change
  (`FORK.md` § Keeping current).
- Before handoff run the vendored gates (cpc 1.23.0, ADR-015; local only, CI has no copy, rule 5):
  `python tools/conventions/run.py docs_check --root . --strict` and
  `python tools/conventions/run.py init_check --root .`.

## Skills in play

| When | Use |
|------|-----|
| Drawing or reading any UI on the canvas | `skills/excalidraw-skill/SKILL.md` + `skills/excalidraw-skill/references/wireframe-conventions.md` |
| Starting a new React app beside the canvas (a viewer, a demo, a client of the CLI) | `[[ts-react-scaffold]]`: the Vite + React + TypeScript stack `frontend/` uses; screens drawn first, then checked in a browser |
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

Vendored form: `python tools/conventions/run.py keypoint <name>` (ADR-020).

> Rules changed? Edit `.claude/CONTEXT.md` (the canonical text). This file only points.
> An agent's project settings only point here — never restate rules there.
