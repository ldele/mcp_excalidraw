<!-- status: active · updated: 2026-07-31 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

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
