<!-- status: active · updated: 2026-07-31 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

## 2026-09-07 (c) — Claude Code — upstream is four commits ahead (2.0.0); merge deferred past T-001
- **Done:** state read (clean at `70a3329`, level with `origin/main`); upstream fetched — four
  commits, `0db05c4`..`ff42de9`, the 2.0.0 release: MCP SDK v2, `src/index.ts` split into four
  core files, Node floor 20. Dry-run merge: eight conflicting files, `src/index.ts` whole-file.
  **Decision (Lucas): defer the merge until T-001 is answered, then take it as its own reviewed
  step.** Recorded with the port plan and its trap: DEVLOG 2026-09-07 (c).
- **Verified at HEAD:** type-check clean; `docs_check --strict` and `integrity_check --strict` 0/0;
  corpus and bind covered by the 2026-09-07 dispatch (the two commits since were docs-only).
- **Not done:** no code change. `.claude/CONTEXT.md:13` still says the upstream merge is deferred —
  that was August's, which landed the same day. KI-1/KI-2 still sit as full entries over an empty
  Resolved index (the 2026-08-07 review request, item 2).
- **Committed and pushed by Lucas:** `65b6452`, the DEVLOG entry. Its push made no run either —
  the third: three pushes, zero runs; a dispatch on `899c365` at 09:34Z ran green (KI-8 holds).
- **Uncommitted, staged:** this entry, and the rotation the session-close gate asked for (rule 11b,
  11 entries > 10): the 2026-08-01 entry moved verbatim to `docs/archive/SESSION-archive-001.md`.
- **Next:** (1) Lucas commits. (2) KI-8: Lucas, logged in, opens the fork's Actions tab — an
  enable banner, or none; until the trigger fires, `gh workflow run ci.yml --ref main` after each
  push. (3) T-001: a standalone text element passes `src/core/normalize.ts:52` unmeasured and
  `src/server.ts:426` stores it with a null bbox; the ticket's fix order is measure server-side,
  else reject at the API, at minimum name the cause at `src/core/wireframe.ts:752`. (4) Then the
  upstream merge, as its own reviewed step — plan and trap in DEVLOG 2026-09-07 (c). (5)
  Pre-existing: KI-3, PR 4 (ADR-002), `share` untested since the August merge.
- **Picks up:** any session; (2) needs the owner's browser; (4) needs a terminal and, for the MCP
  round-trip, a client with the MCP server configured.

## 2026-09-07 (b) — Claude Code — the push trigger is dead on this fork; dispatch after each push
- **Done:** the second push (`899c365`, 08:46Z) made no run either; the morning's enable-after-push
  cause is retracted; logged as a known issue. Detail: DEVLOG 2026-09-07 (b).
- **Uncommitted, staged:** DEVLOG, KNOWN_ISSUES, this entry.
- **Next:** (1) Lucas, logged in, opens the fork's Actions tab: an enable banner, or none. (2) Until
  the trigger fires, `gh workflow run ci.yml --ref main` after each push. (3) T-001 first — the
  silent text-size drop. (4) KI-3, PR 4, `share` untested since the upstream merge.
- **Picks up:** any session; step (1) needs the owner's browser.

## 2026-09-07 — Claude Code — CI proven by a dispatch; the push trigger waits for the next push
- **Done:** run 34097250095 (`workflow_dispatch` on `main`) — all six jobs green, the compat
  matrix included. The push of `49afba0` made no run. Detail: DEVLOG 2026-09-07.
- **Uncommitted, staged:** DEVLOG, this entry.
- **Next:** (1) Lucas commits; on the next push, check that a run appears by itself. (2) T-001
  first — the silent text-size drop. (3) KI-3, PR 4, `share` untested since the upstream merge.
- **Picks up:** any session.

## 2026-09-06 — Claude Code — CI is two jobs per push; the Node range waits for a tag
- **Done:** `ci.yml` rewritten (6 jobs per push → 2, plus a keypoint matrix), NORTH_STAR date
  bumped, strict docs gate green, the exact CI commands run green locally (corpus 43/43). Detail:
  DEVLOG 2026-09-06.
- **Uncommitted, staged:** `ci.yml`, `.claude/NORTH_STAR.md`, DEVLOG, this entry — on top of the
  still-uncommitted (b) entries.
- **Next:** (1) Lucas commits and pushes; **read the run**. (2) `workflow_dispatch` the `compat` job
  once before the next `v*` tag. (3) T-001 first — the silent text-size drop. (4) KI-3, PR 4,
  `share` untested since the upstream merge.
- **Picks up:** any session.

## 2026-09-05 (b) — Claude Code — `npm link` done; the CLI answers from PATH
- **Corrects the entry below's "Not on this machine":** `npm link` ran from this repo;
  `excalidraw-canvas status` resolves via the npm global prefix and reports the canvas not running,
  which is the expected idle answer. Nothing in the tree changed — the link lives in npm's global
  prefix, not in git. The MCP server is still not configured in Claude Code; the CLI is the
  skill's documented default when no MCP tools are present.
- **Committed and pushed by Lucas:** `bed553e`. Its subject reads *Lay the ticket ledger; file the
  2026-08-21 feedback as T-001–T-005" -- docs/TICKETS.md …* — the suggested command's closing quote
  and pathspec were swallowed under PowerShell, so nothing limited the commit and the **older staged
  cpc 1.5.0 → 1.8.0 re-vendor (29 files) rode in** beside this session's five (34 files, +975/−23).
  Already on `origin/main`. DEVLOG 2026-09-05 (b) explains the commit so history need not be
  rewritten. **Decided by Lucas the same day: `bed553e` stays as is.** No amend, no force-push.
- **Uncommitted:** this entry and that DEVLOG entry, staged.
- **Next:** as below, minus items (1) and (3).
- **Picks up:** any session.

## 2026-09-05 — Claude Code — the ledger is laid; five tickets open; the tree still carries an older staged re-vendor
- **Done:** `docs/TICKETS.md` with T-001–T-005 from the 2026-08-21 feedback note; `AGENTS.md`
  Reference line; a pointer atop the note. Detail: DEVLOG 2026-09-05. Staged, not committed (rule 1).
- **Found in the index, not this session's:** a **staged re-vendor of cpc 1.5.0 → 1.8.0** (29 files
  under `tools/conventions/cpc/`, +755/−22) plus `b6eaa3f fix(justfile)` already committed. Nobody
  wrote it up; review it separately from this session's three files before committing either.
- **Not on this machine:** `excalidraw-canvas` is not on PATH (`npm link` never ran here) and no
  excalidraw MCP server is configured in Claude Code; `dist/bin.js` (2026-08-07) exists, so
  `node dist/bin.js` works. The `wireframe-first` skill in `claude-skills` (v0.56.0) finds the toolkit
  by that ladder and files wrong readings here.
- **Next, in order:** (1) Lucas reviews the three files and the re-vendor, and commits. (2) Answer
  T-001 first — the documented screen-heading path silently does nothing. (3) `npm link`.
  (4) Pre-existing: KI-3's attribution measurement, PR 4's geometry lint (ADR-002), `share` untested
  since the upstream merge.
- **Picks up:** any session.

## 2026-08-07 (close 3) — Claude Code — Lucas + agent
- **Done: the upstream merge** (`1c5925b`), the first since the fork, at 14 commits of divergence —
  clean, no conflicts. **Rule 2's open deferral is now closed.**
- **It was not hygiene — it fixed a live bug.** Reproduced *before* merging: our schema lacked
  `containerId`, and zod strips unknown keys, so `import` turned 10 bound text children into **0**.
  Every label detached, and the reading changed silently — `input? "Project name"` became `card?`,
  23 components/5 inferred became 33/7, with `--score` reporting `fallbacks: 0` throughout.
  `snapshot restore` had the same defect. Both documented recovery paths were corrupting drawings.
  After the merge the same file round-trips **35/10 in → 35/10 out** and the reading is identical to
  the original.
- **Unlocked:** `.passthrough()` means `customData` is finally possible — what **KI-5** and Phase 3
  were waiting on. Needs an ADR (moving `role` into `customData` changes the element contract).
- **Not tested: `share`.** It publishes the scene to excalidraw.com, and `share-url.ts` is the file
  upstream rewrote most heavily — so it is both the most-changed path and the one needing a
  deliberate choice to upload. Smoke-test before relying on it.
- **Uncommitted:** the doc updates for this merge are **staged, not committed** — rule 1. The merge
  commit itself is in (`1c5925b`); `main` is **ahead of `origin/main` by 3, unpushed**.
- **Also fixed at close:** `AGENTS.md`'s State line still read 2026-07-31 and claimed the markup leg
  "has never been exercised by a human" — wrong for a week, in the first file every agent reads.
  Nothing enforces that line; it is judgment, so it goes stale silently.
- **Next:** **PR 1 is still the open item** — three attempts on 2026-08-07, never measured. Then
  PR 4 to ADR-002 (calibrate tolerances against the corpus first), and a `customData` ADR.
- **Picks up:** any agent with a terminal; PR 1 needs Lucas at a browser tab — **exactly one tab**.

### Requested for next session: a documentation review (Lucas, 2026-08-07)

Concrete targets, strongest first — the docs grew a lot in one day (3 DEVLOG entries, 3 KIs, an ADR,
3 baton entries) and none of it has been read back critically.

1. **Rotation is switched off and nothing will ever say so.** `devlog_max_entries` and
   `session_max_entries` are both `0` (= disabled) in the cpc defaults, so `docs_check` stays silent
   while the files grow: `docs/DEVLOG.md` is at **8 entries / 223 lines**, `.claude/SESSION.md` at
   **7 / 163**, and `AGENTS.md` tells agents to read only the **newest 3** of each. Either set the
   caps and rotate to `docs/archive/` as ADR-023 describes, or decide unbounded growth is fine and
   say so — right now it is neither, just unexamined.
2. **`.claude/KNOWN_ISSUES.md` (7 entries).** KI-1 is "done for our own docs" and KI-2 is
   explicitly "descoped", yet both still sit as full entries while the Resolved index at the bottom
   holds nothing but its commented-out template line. The file documents its own process for this
   and it has never been used.
3. **Entry length.** Today's DEVLOG entries are long. They are append-only so this is not about
   editing them — it is about agreeing the right level for the next ones.
4. **`docs/ROADMAP.md`** gained a PR 4 section and rewritten measures 3 and 4; worth one read for
   coherence rather than accretion.
5. **ADR-002's two ⚠ Confidence items** are the gate on PR 4 starting — every numeric tolerance is
   currently a guess, and the error/advisory split is asserted rather than demonstrated.

## 2026-08-07 (close 2) — Claude Code — Lucas + agent
- **Correction:** the entry below says PR 1 needs "one sitting". Two further attempts were made the
  same day and **both failed**, for new reasons each time. PR 1's number is *still* untaken.
- **Attempt 2** died on **KI-7**: two browser tabs open at once, each POSTing its whole scene, deleted
  each other's elements — 386 adds against 385 deletes — and silently destroyed a complete round of
  human markup (a note, an ellipse, four scribbles). Unrecoverable; change records carry no geometry.
  Caused by my own instructions ("open the canvas", then later "open or reload"). Guarded now:
  `changes`/`watch` warn on stderr and in-band when `websocket_clients > 1`, in `watch` *before* the
  wait. The protocol fix is still open (KI-7).
- **Attempt 3** never got drawn — the tab was closed and the canvas went quiet.
- **Also fixed: a regression I introduced this morning.** Suppressing the browser echo meant the
  first sync produced no delta, which skips the branch that drops a shape's `label` once Excalidraw
  has expanded it into a bound text child. Every client load then re-expanded it: 10 shapes × 4 tab
  loads = 40 stray text elements. `boundChildSupersedesLabel` now applies on the no-delta path.
  Verified across two reloads: 0 duplicates, 0 stale labels, rev unchanged at 25.
- **Uncommitted:** the guard, the label fix, KI-7, this baton and the DEVLOG entry are **staged for
  review, not committed** — rule 1. (Commit `3c60710`, the morning's echo fix, is already in and is
  what the label regression came from.)
- **Rule 2 — read this before touching the collision zone.** This work **edited `src/server.ts`**.
  Upstream's two commits were re-checked (still no conflicts) and the merge was **deliberately
  deferred**, so a bug fix and a five-file upstream merge would not be reviewed together. That
  deferral is the decision rule 2 requires. The merge is still owed and Lucas asked for it explicitly.
- **Next, in order:** (1) the upstream merge, as its own reviewed step; (2) **PR 1** — one sitting
  with a person, everything blocking it is now fixed; (3) PR 4 to ADR-002, calibrating tolerances
  against the corpus first.
- **Picks up:** any agent with a terminal; PR 1 needs Lucas at a browser tab — **exactly one tab**.

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

