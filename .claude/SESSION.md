<!-- status: active · updated: 2026-11-16 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

## 2026-11-16 (i) — Claude Code — upstream 2.2.0 landed on `main`; CI green
- **Done:** entry (h)'s merge was committed as `c800fa8`, fast-forwarded onto `main` and pushed.
  CI run 43914224879, dispatched on it, is green: `check` and Node 20, 22 and 24, with the
  durable check's lock assertions running on Linux. The main checkout is installed and built. The
  worktree `C:\Projects\mcp_excalidraw-merge` and branch `merge/upstream-2.2.0` are removed.
- **Mind:** the canvas on :3000 was stopped for the build. Another process started it again from
  the new code mid-build (pid 46536, not this session); a tab's first sync then added 58 bound
  labels, with no records.
- **Next:** build ADR-003 to ADR-005; then PR 4.
- **Picks up:** any session with a terminal; the ADR builds need a browser tab.

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
