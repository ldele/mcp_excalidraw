<!-- status: active · updated: 2026-08-01 · class: living -->

# CONTEXT — mcp_excalidraw

**Stack:** Node ≥ 18, TypeScript, ESM (`"type": "module"`), built by `tsc` to `dist/`. Frontend is
React 18 + Vite wrapping `@excalidraw/excalidraw` (`^0.18.0`, resolving to 0.18.1). Express canvas
server on `http://127.0.0.1:3000`. Package manager: npm.
**Goal:** give a coding agent a live Excalidraw canvas it can draw on, read back *as a user
interface*, and share with a human who marks it up. The differentiator over upstream is the
wireframe layer: a drawing is finished when `wireframe` reads it back as what you meant, not when
the screenshot looks right.
**Current phase (2026-08-07):** the fork stands on its own — renamed, private, `FORK.md` published,
inherited branches cut. PR 2 and PR 3 landed 2026-08-01 (test harness, five fixtures, `--score`).
PR 1 — the human markup round — finally ran on 2026-08-07 and found the review loop broken at the
browser boundary: opening a tab restamped every agent element `human`, which collapsed `trustOrigin`
and silently switched markup detection off. Fixed and verified live the same day; markup detection
now works for the first time. **The attribution measurement PR 1 exists to take is still untaken**,
so PR 1 stays open (KI-3). Agreed next: PR 4, a geometry lint (core first, browser panel over it) —
needs an ADR. Upstream moved for the first time since the fork; merge decision deferred, see rule 2.

## Locked settings
<!-- change only via an experiment/ADR; list the setting + its locked value + where enforced -->
- **Package `@ldele/mcp-excalidraw-server`, `"private": true`** — the unscoped name on npm belongs to
  upstream. Enforced: `private` makes a stray `npm publish` fail. Rationale in `FORK.md`.
- **Binary is `excalidraw-canvas`, and only that** — `npx mcp-excalidraw-server` silently fetches
  upstream's build, which has no `wireframe` or `changes` command. Nothing enforces this; the skill
  carries a warning instead.
- **Canvas binds IPv4 loopback only** — guarded by `npm run test:bind`.

## Non-negotiable rules
1. **Stage, never commit or push.** The agent stages and hands the diff off; the owner reviews
   (`git diff --cached`) and commits, or gives explicit per-commit approval — one approval is not
   standing permission (CONVENTIONS §13). **Nothing enforces this** — no cpc gate fires by itself
   (ADR-015/ADR-022). `cpc-push-guard` is available as an opt-in accident guard if this project wires
   it (§13 has the recipe); it stops the push you didn't mean to make, not one you did.
2. **Track upstream; never drift silently.** This is a fork with a live parent
   (`yctimlin/mcp_excalidraw`). At session start, and before touching `src/server.ts`,
   `src/index.ts` or `src/core/normalize.ts`, run
   `git fetch upstream && git log --oneline HEAD..upstream/main`. If upstream moved, decide merge
   or defer *before* editing those three files — that is where our diff and upstream's changes
   collide. Record the decision in `docs/DEVLOG.md`.
3. **The skill is the source of truth; `.agents/` is a copy.** Edit `skills/excalidraw-skill/`, then
   `npm run sync:skills`. Never edit `.agents/skills/` directly — it is gitignored and replaced
   wholesale on every sync.
4. **A wireframe change is not done until the round-trip closes.** Any change to role inference,
   `src/core/wireframe.ts`, or the drawing conventions must be validated by drawing a scene and
   reading it back: zero `shape` fallbacks, zero unintended `?`, every screen named. A screenshot
   passing is not the bar. Since 2026-08-01 this is also enforced mechanically —
   `npm run test:corpus` reads five stored drawings back and diffs them against known-good
   readings. Green tests are the floor, not the ceiling: draw the new thing too (ADR-001,
   `docs/specs/SPEC-001-fixture-corpus.md`).

## Familiarity map
- fork / upstream merge policy: **high** — the owner decides when to take upstream changes.
- wireframe semantics (roles, reading order, flows): **high** — this is the project's own design.
- Excalidraw internals (bound text, `versionNonce` churn, scene reconciliation): **low** — read the
  library source or its docs; do not ask the owner to recall them.
- MCP protocol details: **low** — check the SDK and spec, recommend with a citation.
- npm registry / publishing policy: **medium** — the decision is settled (private); mechanics are
  lookup-able.

## Open questions
- Whether markup attribution holds up with a human in it. The loop itself has now been exercised
  (2026-08-07) and the browser-boundary defect it exposed is fixed — but no person has yet drawn an
  annotation through the working loop, so every attribution number we have is still agent-drawn.
- Whether to take upstream's `.passthrough()` + export-fidelity commits. Both touch `src/server.ts`;
  `merge-tree` says no conflicts. Relevant because `.passthrough()` is what would let `customData`
  survive the editor, which is what KI-5 and Phase 3 both need.
- Whether Excalidraw's own **frames** should replace the "screen = plain rectangle" convention.
- Whether the wireframe layer should ever emit code, or stop at the reading and leave generation to
  the calling agent. Currently the latter, deliberately — see `docs/ROADMAP.md`.
