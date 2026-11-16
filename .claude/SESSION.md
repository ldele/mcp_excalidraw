<!-- status: active · updated: 2026-11-16 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

## 2026-11-16 (h) — Claude Code — upstream 2.2.0 merged on a branch; STAGED
- **Done:** SPEC-004. Upstream 2.2.0 merged; ours stays the default store, `EXCALIDRAW_DATA_DIR`
  switches to upstream's (owner's call). Four findings, one sync fix (DEVLOG 2026-11-16 (h)).
  Entry (g) was committed as `09cd3e2` and pushed.
- **Where:** branch `merge/upstream-2.2.0`, worktree `C:\Projects\mcp_excalidraw-merge`, merge in
  progress, everything staged, nothing committed. The main checkout is untouched. No canvas left
  running; probes used 3061 and 51917.
- **Next:** the owner reviews `git diff --cached` there and commits the merge; `main` takes the
  branch; `npm ci && npm run build` in the main checkout with no canvas running; push, then
  dispatch CI (KI-8). Then build ADR-003 to ADR-005.
- **Picks up:** any session with a terminal; the ADR builds need a browser tab.

## 2026-11-16 (g) — Claude Code — ADR-003 to ADR-005 accepted; 2.2.0 merge decided; STAGED
- **Done:** the owner decided ADR-003 (frames), ADR-004 (colour intent) and ADR-005 (approval
  boxes), and decided to merge upstream 2.2.0 next. Recorded in the ADRs, the tickets, CONTEXT,
  FORK.md and DEVLOG 2026-11-16 (g). Entry (f) was committed as `d2a1045` and pushed.
- **Where:** `main`, staged, not committed. Nothing built.
- **Next:** the 2.2.0 merge as its own piece of work: a spec like SPEC-002, a branch, the store
  question settled first, and our tracking and sync rebuilt inside `commitCanvasMutation`. Then
  build ADR-003 to ADR-005, then PR 4.
- **Picks up:** any session with a terminal; the ADR builds need a browser tab for their round
  trips.

## 2026-11-16 (f) — Claude Code — T-024 fixed; STAGED
- **Done:** elbowed arrows keep their bindings through export, import and a tab (DEVLOG 2026-11-16
  (f)). T-024 is closed. Entry (e) was committed as `9c15c1f` and pushed.
- **Where:** `main`, staged, not committed. `dist/` and `dist/frontend` are rebuilt. No canvas is
  left running; the probes used port 3050.
- **Mind:** Playwright's bundled headless shell is not installed here. Run the browser suite
  against the system Chrome with a config that sets `use.channel` to `chrome`; `PW_CHANNEL` is not
  read.
- **Next:** the owner's calls on the 2.2.0 merge and ADR-003 to ADR-005; then PR 4.
- **Picks up:** any session with a terminal.
