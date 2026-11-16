<!-- status: active · updated: 2026-11-16 · class: living -->

# CONTEXT — mcp_excalidraw

**Stack:** Node ≥ 20, TypeScript, ESM (`"type": "module"`), built by `tsc` to `dist/`. Frontend is
React 18 + Vite wrapping `@excalidraw/excalidraw` (`^0.18.0`, resolving to 0.18.1). Express canvas
server on `http://127.0.0.1:3000`. Package manager: npm.
**Goal:** give a coding agent a live Excalidraw canvas it can draw on, read back *as a user
interface*, and share with a human who marks it up. The differentiator over upstream is the
wireframe layer: a drawing is finished when `wireframe` reads it back as what you meant, not when
the screenshot looks right.
**Current phase (2026-11-16):** the fork stands on its own (renamed, private, `FORK.md`) and has
taken two upstream merges (2026-08-07, clean; 2026-10-07, upstream 2.1.2 at `96d9c21`, fifteen
conflicts, SPEC-002). **Upstream 2.2.0 (2026-11-10) is not merged:** a dry merge conflicts in 14
files, `src/server.ts` the hard one, and it carries a file-path fix for the MCP file tools that we
lack (`FORK.md` § Upstream 2.2.0). Since the last merge the fork fixed what that merge left
(T-012 to T-014), the tab's echo edits (T-007, T-010), kept waypoints (T-009), refused other
origins (T-015) and kept the scene across a restart (T-023). PR 1, the human markup round, ran on
2026-08-07 and **still has not taken the attribution measurement it exists for** (KI-3). On
2026-11-16 the four top-ranked tickets were fixed: T-022 and T-025 (silent loss in `apply` and
delete), T-026 (a tab's first sync marking agent shapes human) and T-001 (unsized text dropped
from the reading with no tab). **Next:** the owner's call on 2.2.0; then PR 4 (ADR-002). T-027 and
T-028, a person's markup convention and visible screen ids, stand between the project and PR 1;
they are framed as ADR-003 to ADR-005, proposed and waiting on the owner. Each ticket's rank is in its 2026-11-16 note in `docs/TICKETS.md`. CI on this fork runs
only by `workflow_dispatch`; a push makes no run (KI-8).

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
5. **cpc is never made public.** The cpc tooling vendored in `tools/conventions/` (the gates,
   `run.py`, `cpc.just`, the templates) is proprietary: `tools/conventions/cpc/LICENSE` grants no
   licence. This repository is public on GitHub. So `tools/conventions/` is never committed,
   pushed, packed, attached to a pull request or an issue, or copied anywhere another person can
   read it. A fresh clone or worktree gets it back by a re-vendor from a cpc tag (cpc's own
   RELEASE.md, *Re-vendoring a project from a tag*). Its gates run locally, never in CI,
   since a CI checkout has no copy. **Enforced:** `.gitignore` keeps it out of `git add`. Nothing
   stops `git add -f`, so before staging check that `git diff --cached --stat` names no path under
   `tools/conventions/`. The owner's ruling, 2026-11-16.

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
- Whether `customData` should now carry the declared `role`. Upstream's `.passthrough()` landed in
  the 2026-08-07 merge, so unknown props survive the schema and the mechanism finally exists — this
  is what KI-5 and Phase 3 were blocked on. Still a decision (an ADR), not a given.
- Whether Excalidraw's own **frames** should replace the "screen = plain rectangle" convention.
  It is option 2 of ADR-003 (visible screen ids, T-028), proposed 2026-11-16.
- Whether the wireframe layer should ever emit code, or stop at the reading and leave generation to
  the calling agent. Currently the latter, deliberately — see `docs/ROADMAP.md`.
