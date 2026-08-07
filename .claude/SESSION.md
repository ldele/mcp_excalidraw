<!-- status: active · updated: 2026-07-31 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

## 2026-08-07 (close) — Claude Code — Lucas + agent
- **Correction to the entry below:** it says the fix was staged and uncommitted. Lucas reviewed and
  committed it as `3c60710` (9 files). `main` is **ahead of `origin/main` by 1 and unpushed**.
- **Also done since:** `docs/decisions/ADR-002-geometry-lint.md` written and **accepted** — PR 4's
  shape is settled (a `--lint` flag on `wireframe`, findings also in `--json`, two severities,
  reporting only). ADRs are immutable once accepted: supersede with a new one, never edit.
- **Next is unchanged in priority:** **PR 1's attribution number is still untaken** — the loop works,
  nobody has drawn an annotation through it. Then build PR 4 to ADR-002, and **calibrate the
  tolerances against the corpus first** (both ⚠ items in the ADR's Confidence block) rather than
  shipping guessed numbers.
- **Picks up:** any agent with a terminal; PR 1 additionally needs Lucas at a browser tab.

## 2026-08-07 — Claude Code — Lucas + agent
- **Done:** ran **PR 1**, the human markup round, for the first time (KI-3 — skipped four times
  before this). It broke before a single annotation was drawn, and the defect was the important
  kind: **opening the canvas in a browser restamped all 25 agent-drawn elements as `human`**, because
  Excalidraw echoes the whole scene back with unset style properties default-filled and text boxes
  re-measured, and the server stamps browser writes `human`. That collapsed
  `trustOrigin` (`src/core/wireframe.ts:531`) and **silently switched markup detection off for
  everything except freedraw** — the review loop's headline feature could not work in its own
  documented workflow. Fixed in `src/core/changes.ts` (`EDITOR_DEFAULTS` + `fieldsEqual`; text
  width/height dropped from the canonical projection), 8 new assertions in
  `tests/frontend-echo.test.mjs`. Also documented `watch`'s undocumented 240s ceiling in SKILL.md +
  cheatsheet and re-ran `npm run sync:skills`.
- **Proved it works:** stash the fix and 3 of the 8 new tests fail — and it is the right 3 (the echo
  guards; the five "real edits still report" assertions pass either way). Live end-to-end: *before*,
  opening the tab produced 25 phantom `human` records and `trustOrigin: false`; *after*, the same
  action produced `No changes`, `origins: {"agent":25}`, `trustOrigin: true`. 36/36 tests,
  `type-check` clean, no golden moved.
- **Found, not fixed:** **KI-5** — copy-pasting a component in the editor destroys its declared
  `role` (`button "General"` → `button? "General"`); real evidence for `customData` and the Phase 3
  library. **KI-6** — `changes` attributed a 1160x1180 screen frame as `annotates` a 540x48 input;
  `looksLikeAnnotation` has no size ceiling. Also: a copied footer landing **4.29px** outside its
  frame silently became a phantom third screen — the cause behind an "unnamed screen" warning, and
  the motivating case for PR 4.
- **Also:** a wireframe reading caught a mis-drawn flow arrow the screenshot hid — it looked like it
  landed on Billing, `endBinding` said Members, and Lucas confirmed Billing was intended. The
  round-trip thesis doing exactly what it claims.
- **Uncommitted:** everything above is staged for review, not committed — rule 1.
- **Next:** **PR 1 is still open** — the attribution accuracy number is *still* untaken, because the
  session pivoted to feature design once the loop was fixed. It is now genuinely unblocked and needs
  about one sitting. Then **PR 4**, the geometry lint (agreed this session: core first with a JSON
  contract, browser panel as a thin view over it) — **write the ADR before building**.
- **Picks up:** any agent, with a terminal. PR 1 needs **Lucas at a browser tab** on the canvas URL.
  `excalidraw-canvas` is still not on PATH — use `node dist/bin.js <cmd>`.
- **Watch out:** **rule 2 is live** — upstream moved for the first time since the fork (`2930519`
  export fidelity, `ecf3cac` `.passthrough()`), both touching `src/server.ts`, `merge-tree` says no
  conflicts, **decision deferred**. Decide before editing `src/server.ts` / `src/index.ts` /
  `src/core/normalize.ts`. It matters beyond hygiene: `.passthrough()` is the mechanism `customData`
  needs, which is what KI-5 and Phase 3 both want. Also: the canvas holds its scene **in memory** —
  restarting the server loses the drawing, so `export` before any restart. And `npm run sync:skills`
  warns that `.claude/skills/` is not a symlink; it simply does not exist (no stale copy), pre-dating
  this session.

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
- **Also done: PR 3** — `wireframe --score` (pre-flight counts as JSON), `score` added to
  `--json`, and a `### Reading quality` block in the plain reading that fires only when something
  is actually wrong. Put in the report as well as behind the flag because `describe_wireframe` (MCP)
  takes no arguments, and an agent is the main consumer. Skill + cheatsheet + conventions §9
  updated and `npm run sync:skills` run.
- **Uncommitted:** everything above is staged for review, not committed — rule 1.
- **Next:** **PR 1** — the human markup round, the only Phase 1 item left and still the one leg
  never exercised (KI-3, skipped a fourth time today for lack of 20 free minutes). After that,
  Phase 2 (`link`, frames, `groupIds`, z-order, `customData`) is the next real body of work.
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
