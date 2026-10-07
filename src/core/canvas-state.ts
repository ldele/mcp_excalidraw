import { ensureCanvasRunning } from './spawn.js';

// Canvas/scene bookkeeping that belongs to the *application*, not to a
// connection or a protocol session. MCP 2026-07-28 connections are pinned to a
// freshly built server instance per connection (and a discarded `server/discover`
// probe builds one too), so anything stored on a server instance would be lost
// between connections and would differ between the legacy and modern eras.
// Keeping it here means the canvas a caller sees is the same canvas regardless
// of how — or how often — a client connects.
export interface SceneState {
  theme: string;
  viewport: { x: number; y: number; zoom: number };
  selectedElements: Set<string>;
  groups: Map<string, string[]>;
}

export const sceneState: SceneState = {
  theme: 'light',
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedElements: new Set(),
  groups: new Map()
};

// Cursor into the canvas change feed (the fork's review loop), so an agent can
// call get_canvas_changes repeatedly with no arguments and keep getting only
// what is new since its last look. An explicit `since` always overrides it.
// It lives here for the reason sceneState does: a server instance is built per
// connection, so a cursor held on one would reset between calls.
let lastSeenRev = 0;

export function changeCursor(): number {
  return lastSeenRev;
}

export function advanceChangeCursor(payload: { rev: number; reset?: boolean }): void {
  lastSeenRev = payload.reset ? payload.rev : Math.max(lastSeenRev, payload.rev);
}

let canvasEnsurePromise: Promise<unknown> | null = null;

export async function ensureCanvasReadyForMcpTool(): Promise<void> {
  if (!canvasEnsurePromise) {
    canvasEnsurePromise = ensureCanvasRunning().finally(() => {
      canvasEnsurePromise = null;
    });
  }
  await canvasEnsurePromise;
}

export function toolNeedsCanvasBeforeDispatch(name: string): boolean {
  return name !== 'read_diagram_guide' && name !== 'get_resource';
}
