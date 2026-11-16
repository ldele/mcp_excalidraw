<!-- status: active · updated: 2026-11-16 · class: append-only -->

# DEVLOG

One entry per logical change, newest first. Bounded (ADR-023): past `[budgets] devlog_max_entries`
the oldest entries rotate **verbatim** to `docs/archive/DEVLOG-archive-NNN.md` — see the pointer
below; never edit or summarize a past entry.

Older entries: [`docs/archive/DEVLOG-archive-001.md`](archive/DEVLOG-archive-001.md). Rotation
began on 2026-10-08; the archive holds everything older than the entries kept here (three since
2026-11-16).

## 2026-11-16 — cpc 1.8.0 → 1.23.0; upstream 2.2.0 measured, not merged; README cut; tickets triaged
- **cpc:** re-vendored cpc 1.8.0 -> 1.23.0 (`tools/conventions/cpc/`, 67 modules) from a worktree
  of `v1.23.0`, no `--profile`. Then, per its release notes: known issues moved to
  `docs/KNOWN_ISSUES.md`; the four unedited template copies in `docs/` deleted; `entry_max_tokens`
  back to its laid 8000; `[tickets] archive_on_close` on; `## Releases` skipped; the baton and this
  log rotated to three entries. Not done: the deny rules (cpc ADR-080), the owner's call. T-020 closed.
- **Upstream (rule 2):** 2.2.0 at `81720ac`, 14 commits. A dry merge conflicts in 14 files;
  `src/server.ts` has 11 hunks, since upstream now wraps every store write in
  `commitCanvasMutation`. Not merged, and nothing in the collision zone edited. `FORK.md`
  § Upstream 2.2.0 says what it brings, including #148, a file-path fix we lack, and what to decide.
- **Docs:** README 652 → 265 lines. Upstream's changelog, comparison table, per-client configs and
  FAQ are gone, and the configs that said `npx -y mcp-excalidraw-server` (KI-1) now name the local
  binary. FORK.md 170 → 112, with a table of where we touch upstream's files. The AGENTS.md and
  CONTEXT.md state lines are brought to today.
- **Tickets:** three inbox reports admitted (T-026 to T-028); all 17 open tickets triaged with a
  rank; the 11 closed ones moved to `docs/archive/TICKETS-archive-001.md`.
- **Not run:** `npm test`, since no code changed.

## 2026-10-23 — T-023 fixed: the canvas saves its scene per port, and a tab that outlives a restart keeps its drawing
- **What** (owner, through a drawing-app session: *fix the underlying problem in the toolkit*):
  T-023 filed and fixed on both sides. A canvas on 3010 held a wireframe exported at rev 357 and
  a round of the owner's markup in one tab. The PC restarted overnight; the server, which held
  the scene in memory only, died with it, and `changes --since 357` auto-started an empty one.
  The page applies the server's scene on every socket open, so the tab, the last copy, would
  wipe itself on reconnect.
- **Server — `src/core/scene-store.ts` (new, ours):** saves the elements in store order, image
  files, snapshots, the change log (revision and records) and a scene id to `scene-<port>.json`
  beside the pidfile (`%LOCALAPPDATA%\Excalidraw-Canvas` here), and loads it before `listen`.
  A write goes to a temporary file renamed over the last one (a copy when Windows refuses the
  rename), 250 ms after the writes pause and 2 s at most into a burst, and is flushed on
  SIGINT, SIGTERM and exit. A file that does not parse is moved aside as
  `scene-<port>.unreadable-<ms>.json` and never written over; one that cannot be read at all
  leaves that process in memory only. `EXCALIDRAW_NO_PERSIST=1` is the opt-out,
  `EXCALIDRAW_SCENE_DIR` the location. In `src/server.ts`: an import, the save middleware after
  `express.json`, the revision on every broadcast, the identity on `initial_elements`,
  `GET /api/elements` and `/health`, the load before `listen`, the flush. `start` prints the
  elements it came back with and the file; `status` the file.
- **Page:** a process has an `instanceId`, a drawing a `sceneId` (born with an empty change log,
  saved with the scene), and the page tracks the revision it has seen. Every full scene goes
  through `adoptServerScene` (`frontend/src/App.tsx`). When the process changed and the tab holds
  a live element, `mergeAfterRestart` (`frontend/src/utils/scene.ts`) keeps the tab's copy, takes
  in what only the server holds, and lets the server's copy win only where it changed after the
  tab last heard from it in the same drawing; the union is applied and synced back. It is never
  empty (T-014's rule holds) and leaves out nothing the server holds, so the send deletes
  nothing (KI-7, entry added). A socket drop to the same process loads as before. A reconnect no
  longer starts a second full load beside `initial_elements`, which could decide twice.
- **Rule 2: upstream moved, not merged.** `HEAD..upstream/main` holds 7 commits, among them
  upstream's own opt-in store (`95b0248` #130, `4c0ed4e` #133, `3e98424` #140); `git merge-tree`
  gives 12 conflicts, `src/server.ts` among them. That merge is the owner's to take. Upstream's
  store would not have prevented this loss as it stands: it is off unless `EXCALIDRAW_DATA_DIR`
  is set (nothing was set), locks one directory for every port (3000 and 3010 run side by side
  here), saves no change log (`changes --since` would read `reset`), and has no page side. The
  decision for the next merge is written in `FORK.md`.
- **Rejected:** asking in the tab before sending back (the brief's "or ask"): the union drops
  nothing either side holds, so there is nothing to choose. Refusing to start on an unreadable
  file, as upstream does: the CLI auto-starts, and a canvas that will not start blocks the agent
  while the file is safe aside anyway.
- **Tests:** `tests/server-contract.test.mjs` +3 (a kill keeps elements, roles, files, snapshots
  and the feed, the revision goes on, another port starts empty; `EXCALIDRAW_NO_PERSIST=1` writes
  nothing and comes back empty; an unreadable file is moved aside and left alone).
  `tests/browser/server-restart.spec.mjs` +3, each with its own server killed under an open tab:
  it came back empty and the tab gives the drawing back; it came back from disk without the last
  edit and the tab gives that back; an agent's change after the restart is not undone by the
  tab. Seeded defects: with the page rule off, the first two fail; with the tab always winning,
  the third fails. Every test spawner now sets `EXCALIDRAW_NO_PERSIST=1`: Playwright's 51910 and
  the parity check's 51999 are fixed ports, and a saved scene would carry over between runs.
- **Verified:** `npm run type-check` and the frontend's; `npm run build`; `npm test` 88 / 88
  `node:test` (85 before) plus wire 6, bind, render, state (the first run after the build hit
  T-019, the second was green); Playwright 22 / 22 with the system Chrome (19 before). A live
  round on 3021 with `excalidraw-canvas` from PATH: `start`, two `add`, `wireframe --score`
  clean, `taskkill /F`, then `changes --since 0` auto-started a server that reported both adds
  at rev 2 under the same scene id; `stop`; that scene file deleted. The tests wrote no scene
  file to the real state directory.
- **Not verified:** Linux and macOS (paths follow the pidfile's); a real reboot under a person's
  drawing; a tab opened before this build, which runs the old page and loads whatever the server
  holds — now its restored scene rather than an empty one.
- **Left open:** a reconnect to the same process still loads the server's scene, so an edit made
  in the 1.2 s before a socket drop, never synced, is lost (no restart involved; outside T-023).
- **Mind:** ports 3000 and 3010 were not touched. No canvas was running during the build.

## 2026-10-14 — `ts-react-scaffold` joins the skills in play
- **What** (owner, 2026-10-14, from a claude-skills session): `AGENTS.md`'s `## Skills in play` gains a
  row for starting a new React app beside the canvas, pointing at `[[ts-react-scaffold]]`.
- **Why:** the claude-skills listing had dropped that skill's description as the least used, and
  the owner chose to keep it and link it to the two projects that run React. claude-skills 0.66.0
  names this project in the skill, with its Playwright browser checks as the example to follow.
- **Rejected:** a row for work on `frontend/` itself; the skill scaffolds new apps only.

> Entries below dated 2026-07-31 were backfilled on 2026-08-01 from the commits and the baton; they
> are short by intent, not by neglect.
