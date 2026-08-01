<!-- status: active · updated: 2026-07-31 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

## 2026-08-01 — Claude Code — Lucas + agent
- **Done:** `docs/ROADMAP.md` **PR 2** — the repo's first test harness. Five `.excalidraw` fixtures
  drawn through the real CLI (`dashboard`, `two-screen-flow`, `list-detail`, `annotated`,
  `undeclared-content`), each with a hand-authored expectation and a golden reading; 28 assertions
  on `node:test`; `scoreWireframe()` exported from `src/core/wireframe.ts`; `npm test` wired and a
  CI `test` job added (CI previously ran no tests at all). ADR-001 + SPEC-001 written. Backfilled
  the two missing DEVLOG entries — the file was still the unedited template.
- **Proved it works:** moving `HEADING_MIN_FONT_SIZE` 20 → 24 fails all five golden readings.
  Reverted. A suite that has never failed is not evidence of anything.
- **Found:** markup attribution is 4/5 — a note level with a card binds to the input above it
  (now **KI-4**). Recorded rather than tuned: fitting attribution to one agent-drawn sample of 5
  would be fitting to noise.
- **Uncommitted:** everything above is staged for review, not committed — rule 1.
- **Next:** **PR 1** — the human markup round, still the one leg never exercised (KI-3, skipped a
  fourth time today for lack of 20 free minutes). Then PR 3, which is now only a CLI flag over
  `scoreWireframe()`.
- **Picks up:** any agent, with a terminal. PR 1 also needs **Lucas at a browser tab** on the canvas
  URL. `excalidraw-canvas` is still not on PATH — use `node dist/bin.js <cmd>` (what this session
  did) or `npm link` first.
- **Watch out:** don't regenerate `tests/expected/*.json` — only the `.txt` goldens are generated
  (`npm run corpus:update`). `undeclared-content` scores 3 fallbacks *on purpose*. And do not use
  PowerShell `Set-Content` on `src/core/*.ts` — it re-encodes the UTF-8 box-drawing comment rules
  into mojibake; this session did that and had to `git checkout` the file.

## 2026-07-31 (close) — Claude Code — Lucas + agent
- **Correction:** the entry below says the cpc adoption was staged and uncommitted. Lucas reviewed
  and committed it. Working tree is clean and `main` is level with `origin/main`.
- **Next is unchanged:** `docs/ROADMAP.md` PR 1, the two-way markup round with a human (also KI-3).
- **Picks up:** any agent, with a terminal and a browser tab on the canvas URL. `npm link` first —
  `excalidraw-canvas` is still not on PATH here.

## 2026-07-31 — Claude Code — Lucas + agent
- **Done:** adopted the cpc standard (`cpc-init --profile standard`) and filled `AGENTS.md`,
  `.claude/CONTEXT.md`, `docs/ROADMAP.md`, `.claude/KNOWN_ISSUES.md`. Cut the 8 branches inherited
  from upstream off `origin` — each verified byte-identical to its `upstream/` counterpart first, so
  nothing became unrecoverable — and deleted the merged local `fix/wireframe-role-inference`. Only
  `main` remains.
- **Committed earlier the same day:** the fork audit (`FORK.md`, rename to
  `@ldele/mcp-excalidraw-server`, `private: true`, v1.2.0, Docker and npm-publish removal) and the
  wireframe drawing conventions (`skills/excalidraw-skill/references/wireframe-conventions.md`).
- **Uncommitted:** everything `cpc-init` laid, plus the filled docs. Staged for review, not
  committed — rule 1.
- **Next:** `docs/ROADMAP.md` PR 1 — run the two-way markup round with a human end to end. It is
  the one leg of the review loop never exercised; the markup round was skipped three times on
  2026-07-31. Then PR 2 (fixture corpus), which is what makes role-inference changes safe to touch.
- **Picks up:** any agent. Needs a terminal, and a **browser tab open on the canvas URL** for the
  markup round — screenshots, exports and Mermaid exit with code 4 without one.
- **Watch out:** `excalidraw-canvas` is not on PATH on this machine; `npm link` from the repo or the
  skill's commands will not resolve. Never `npx mcp-excalidraw-server` — that is upstream's package
  and carries none of this fork's features (`FORK.md`).
