# Excalidraw + MCP: validation & setup (2026-07-24)

## Status
RUNNING on Lucas's machine (2026-07-24): cloned into `excalidraw-light-mcp`, built, canvas + MCP confirmed working.

## Decision
Adopt yctimlin/mcp_excalidraw as-is for local wireframe↔agent communication. Do NOT build a custom "Excalidraw Light" — the editor already ships cloud-free as the MIT npm component `@excalidraw/excalidraw` (proven by the `excalidraw-llm-poc`), and mcp_excalidraw already wires it to an MCP server.

## Verified in sandbox (built from source, v1.1.0)
- Architecture: Express canvas server (127.0.0.1:3000, in-memory scene) + Vite/React frontend embedding `@excalidraw/excalidraw` ^0.18 + MCP stdio server (26 tools).
- Drawing→app: manual canvas edits auto-sync (debounced POST /api/elements/sync); `describe_scene` over MCP stdio returns a compact element listing. CONFIRMED end-to-end.
- App→drawing: `create_element` via MCP appears live on canvas over WebSocket. CONFIRMED (screenshot: `canvas_roundtrip.png`).
- `get_canvas_screenshot` / `export_to_image` need a browser tab open on the canvas.

## Caveats found
- `label: {text}` on `create_element` did NOT produce a bound text element in test — add text elements explicitly, or investigate.
- Scene is in-memory; server restart clears it. Use `export_scene` / `import_scene` (.excalidraw files, also Obsidian .excalidraw.md) to persist into the repo. Auto-persist would be a small patch if needed.
- npm audit: run plain `npm audit fix` (28 → 18 vulns, 0 critical; build + round-trip re-verified after fix). Do NOT `--force` (semver-major jumps: express 5, MCP SDK 2.x — likely breaks build). Residual highs are localhost-only ReDoS/transitive, acceptable. Keep server on 127.0.0.1; vite dev-server advisories only apply to `npm run dev`.

## Setup (target: C:\Users\LDELEZ\Documents\GitHub\excalidraw-light-mcp)
```
cd C:\Users\LDELEZ\Documents\GitHub\excalidraw-light-mcp
git clone https://github.com/yctimlin/mcp_excalidraw.git .
npm install
npm audit fix
npm run production        # canvas at http://127.0.0.1:3000
```
Register in Claude Code (user scope):
```
claude mcp add excalidraw -s user -e EXPRESS_SERVER_URL=http://127.0.0.1:3000 -- node C:\Users\LDELEZ\Documents\GitHub\excalidraw-light-mcp\dist\index.js
```
Day-to-day: `npm run canvas` starts the canvas; MCP tools require it running.

## Context
Purpose: high-specificity intent communication in late project stages (UI/UX wireframes ↔ app, both directions). Prior art: `excalidraw-llm-poc` (selection+intent → op-vocab → applied ops; aimed at tiny local models — its scene-summary idea is worth reusing if describe_scene gets verbose on large scenes).

## Next
- First real workflow test: draw a rough screen, ask Claude Code to describe + extend it, `export_scene` into the target project repo.
- Watch for: describe_scene verbosity on large scenes (→ reuse PoC scene-summary idea), need for auto-persist patch, label quirk.
