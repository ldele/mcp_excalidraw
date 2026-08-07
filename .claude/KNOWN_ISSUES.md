<!-- status: active · updated: 2026-08-07 · class: living -->

# KNOWN ISSUES

Open weaknesses, recurring failures, workarounds. Log a bug the second time it appears.

## KI-1 — `npx mcp-excalidraw-server` silently runs upstream's build
- **Symptom:** `wireframe` and `changes` fail as unknown commands, or a command behaves like a
  build without any of this fork's features.
- **Cause:** the unscoped name on npm is yctimlin's package. This fork is `@ldele/…` and unpublished,
  so `npx` resolves to upstream. It was the skill's own documented entry point until 2026-07-31.
- **Workaround:** `npm link` from the repo, then use `excalidraw-canvas`; or call
  `node <repo>/dist/bin.js` directly.
- **Real fix:** done for our own docs (skill, cheatsheet, evals, README all point at the binary).
  Anything outside this repo that memorised the old `npx` line is still wrong. See `FORK.md`.

## KI-2 — `.git` still carries the 2.8 MB `demo.gif`
- **Symptom:** the repo clones heavier than its working tree suggests.
- **Cause:** `demo.gif` was removed from the tree on 2026-07-31, but deleting a file does not remove
  its blob from history.
- **Workaround:** none needed; it is a clone-size cost, not a correctness one.
- **Real fix:** descoped. Evicting it means rewriting history, which is not worth it at this size.

## KI-3 — markup attribution has never been measured with a human
- **Symptom:** the attribution accuracy figure in `docs/ROADMAP.md` (measure 3) still rests on
  markup an *agent* drew imitating a human — 4 of 5. No person has drawn annotations and had them
  read back.
- **Cause:** the round was skipped three times on 2026-07-31 and once on 2026-08-01. It ran on
  2026-08-07 and got further than ever — but the loop was broken in a way that made annotations
  undetectable (below), and once that was fixed the session moved to feature design before any
  annotation was drawn.
- **Was:** "the loop has never run with a human." It has now, and it paid for itself before a single
  mark was made: the round exposed that opening a browser tab restamps every agent element `human`,
  collapsing `trustOrigin` and silently disabling markup detection for everything but freedraw.
  Fixed 2026-08-07 (`EDITOR_DEFAULTS` / `fieldsEqual` in `src/core/changes.ts`; DEVLOG same date) and
  verified live — elements now stay `agent` after a tab syncs. Detection works; nobody has yet drawn
  markup through it.
- **Workaround:** none needed. `tests/fixtures/annotated.excalidraw` pins all four attribution
  relations and `tests/frontend-echo.test.mjs` now pins the browser echo.
- **Real fix:** `docs/ROADMAP.md` PR 1 — one sitting with a person, now unblocked.

## KI-4 — a note beside a card can bind to the wrong component
- **Symptom:** in `tests/fixtures/annotated.excalidraw`, the note "show VAT breakdown" sits level
  with the £48.00 totals card and binds to the CVC input two rows above it. 4 of 5 annotations in
  the corpus bind where a person would; this is the fifth.
- **Cause:** attribution measures edge-to-edge distance from a point outside every candidate. The
  totals card is wider, so its nearest edge is further from the note's centre than the smaller
  input's is, even though the note is vertically level with the card and not with the input.
  Vertical alignment carries intent here and is not weighted.
- **Workaround:** none needed yet — the reading names the target, so a wrong bind is visible rather
  than silent.
- **Real fix:** not attempted. Worth doing only on evidence from a real human round
  (`docs/ROADMAP.md` PR 1) — tuning attribution against one agent-drawn sample of 5 would be
  fitting to noise. Baseline and method: `tests/expected/attribution-baseline.json`.

## KI-5 — copy-pasting a component in the browser destroys its declared `role`
- **Symptom:** on 2026-08-07 a screen was duplicated in the canvas. The original tabs read
  `button "General"`; the copies read `button? "General"`. Copied header and footer bands lost their
  declared roles too and survived only because inference happened to re-guess them.
- **Cause:** `role` is our own property. Excalidraw does not carry it, so a copy made in the editor
  is a brand-new element built from the editor's representation and arrives via
  `POST /api/elements/sync` with no `role` at all. The original keeps its role because sync *merges*
  over the stored element; a copy has no stored element to merge with.
- **Workaround:** re-declare the role via `update <id> --set '{"role": "..."}'` after copying, or
  draw duplicates with `arrange duplicate` (server-side, preserves the role) instead of the editor.
- **Real fix:** `customData` (`docs/ROADMAP.md` Phase 2) is Excalidraw's sanctioned slot for
  app-specific metadata and would survive the editor's own copy path. **Unblocked 2026-08-07** —
  upstream's `.passthrough()` (`ecf3cac`) merged, so unknown props now survive the schema and the
  mechanism exists. Still needs building, and needs an ADR: moving `role` into `customData` changes
  the element contract. This KI is the concrete evidence for both that and the Phase 3 component
  library, which exists precisely to stop a role being a guess.

## KI-6 — `changes` will attribute a whole screen frame as an annotation
- **Symptom:** on 2026-08-07 a duplicated 1160x1180 screen frame was reported as
  `annotates [in-slug] rectangle "Slug" (192px away)` — a screen described as a comment on a 540x48
  input. `wireframe` did not make the same claim.
- **Cause:** `looksLikeAnnotation` (`src/core/changes.ts`) accepts any rectangle, ellipse or diamond
  whose background is unset or transparent, with **no size ceiling**. A screen frame is transparent
  by convention, so it qualifies. `findContainers` guards the *target* side ("a note beside a big
  panel is about something inside it") but nothing guards the *source* side — the thing doing the
  annotating.
- **Workaround:** none needed; the report names the target, so a wrong bind is visible rather than
  silent. `wireframe` was unaffected here only because `trustOrigin` was false at the time, which is
  now fixed — so this may become visible in `wireframe` too.
- **Real fix:** not attempted. The obvious rule is that anything large enough to *hold* components
  is structure, not markup — the same reasoning `findContainers` already applies to targets, applied
  to sources. Worth folding into the geometry lint rather than patching alone.

## KI-7 — two browser tabs on one canvas silently destroy each other's work
- **Symptom:** with two tabs open, elements are added and deleted in a loop and the canvas becomes
  unusable to draw on. On 2026-08-07 a full round of human markup — a text note, an ellipse and four
  freedraw strokes — was wiped this way; the change log showed **386 adds against 385 deletes**, the
  rev climbed past 700, and `changes` reported "1 change" because the adds and deletes cancelled.
  Nothing in any report said why. The markup is unrecoverable: change records store
  `id`/`kind`/`origin`/`at`/`elementType`, no geometry.
- **Cause:** every tab POSTs its *whole scene* to `/api/elements/sync`, and the handler treats an
  element absent from that payload as a human deletion (`src/server.ts`, "1. Elements the human
  deleted in the browser"). With one client that is correct. With two, each sync asserts its own
  view as complete truth, so tab A's sync deletes what tab B just added, and back again.
- **Workaround:** keep exactly one tab open. Since 2026-08-07 `changes` and `watch` warn loudly —
  on stderr and in-band in the report — when `/health` shows `websocket_clients > 1`, so the
  condition is visible before someone spends a round drawing into it. That is a guard, not a fix.
- **Real fix:** not attempted. The server has to stop inferring deletion from absence in a single
  client's snapshot — a per-client baseline, or a scene sequence number carried on the sync. That is
  a protocol change in `src/server.ts` (collision zone, rule 2) and wants an ADR of its own.

## Resolved index

One line per resolved issue (ADR-023): mark the entry's heading `(RESOLVED 2026-07-31)` on the day
it is fixed; once it has aged past `[staleness] resolved_ki_days`, replace the full entry with a
line here and move its text verbatim to docs/archive/KNOWN_ISSUES-archive-NNN.md (backtick the
path once the archive file exists — the route gate then keeps the link honest). Numbers are never
reused; the archive keeps the detail.

- <!-- KI-N (RESOLVED 2026-07-31) — <one-line summary> → docs/archive/KNOWN_ISSUES-archive-001.md -->
