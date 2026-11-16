<!-- status: active · updated: 2026-11-16 · class: append-only -->

# SESSION — handoff baton

Append-only. Newest entry on top. Never rewrite a past entry; correct with a new one.

## 2026-11-16 (k) — Claude Code — ADR-003 landed on `main` as `6414461`; CI dispatched
- **Done:** entry (j)'s work was committed as `6414461` on the owner's yes, fast-forwarded onto
  `main` and pushed. The worktree `C:\Projects\mcp_excalidraw-adr003` and branch
  `adr-003-frame-screens` are removed. CI run 43952866891, dispatched on it: the three keypoint
  jobs passed; "Build + wireframe corpus" was still running when this was written.
- **Not done:** `npm ci && npm run build` in the main checkout. The owner's canvas on :3000 was
  running, so its `dist/` is the pre-ADR-003 build: it reads frames the old way until it is
  stopped, rebuilt and started again.
- **Next:** read CI run 43952866891's result; rebuild the main checkout with no canvas running.
  Then ADR-004 (its legend frame will read as a screen until it is left out) and ADR-005.
- **Picks up:** any session with a terminal; ADR-004 and ADR-005 need a browser tab.

## 2026-11-16 (j) — Claude Code — ADR-003 built: screens are native frames; STAGED
- **Done:** SPEC-005. A top-level frame is a screen named by its name; `frameId` decides
  membership, then geometry; rectangle screens read as before (the five old goldens unchanged).
  The owner settled three points first (DEVLOG 2026-11-16 (j)). Found live and fixed in the page:
  an agent's arrow ending on a frame lost its binding in a tab and turned into markup. T-028
  closed. The skill and the conventions draw a screen as a frame.
- **Where:** branch `adr-003-frame-screens`, worktree `C:\Projects\mcp_excalidraw-adr003`, cut
  from `main` at `98ac576`; everything staged, nothing committed. The main checkout and the owner's
  canvas on :3000 are untouched. The probe canvas on 3071 was stopped.
- **Next:** the owner reviews `git diff --cached` there and commits; `main` takes the branch;
  `npm ci && npm run build` in the main checkout with no canvas running; push, dispatch CI (KI-8).
  Then ADR-004 (its legend frame will read as a screen until it is left out) and ADR-005.
- **Picks up:** any session with a terminal; ADR-004 and ADR-005 need a browser tab.

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
