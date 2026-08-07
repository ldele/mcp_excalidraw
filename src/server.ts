import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import {
  elements,
  files,
  snapshots,
  generateId,
  EXCALIDRAW_ELEMENT_TYPES,
  ServerElement,
  ExcalidrawElementType,
  ExcalidrawFile,
  WebSocketMessage,
  ElementCreatedMessage,
  ElementUpdatedMessage,
  ElementDeletedMessage,
  BatchCreatedMessage,
  SyncStatusMessage,
  InitialElementsMessage,
  Snapshot,
  normalizeFontFamily,
  changeLog,
  CHANGE_LOG_LIMIT,
  ChangeRecord,
  ChangeKind,
  ChangeOrigin,
  COMPONENT_ROLES
} from './types.js';
import { z } from 'zod';
import WebSocket from 'ws';
import { isMainModule } from './core/entry.js';
import { writePidFile, removePidFile } from './core/pidfile.js';
import {
  canonicalizeElement,
  diffCanonical,
  isChangeTracked,
  effectiveLabel,
  buildBoundLabelIndex,
  boundChildSupersedesLabel,
  CanonicalElement
} from './core/changes.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from the build directory
const staticDir = path.join(__dirname, '../dist');
app.use(express.static(staticDir));
// Also serve frontend assets
app.use(express.static(path.join(__dirname, '../dist/frontend')));
// Serve Excalidraw fonts so the font subsetting worker can fetch them for export
app.use('/assets/fonts', express.static(
  path.join(__dirname, '../node_modules/@excalidraw/excalidraw/dist/prod/fonts')
));

// WebSocket connections
const clients = new Set<WebSocket>();

// Broadcast to all connected clients
function broadcast(message: WebSocketMessage): void {
  const data = JSON.stringify(message);
  clients.forEach(client => {
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    } catch (err) {
      logger.warn('Failed to send to client, removing');
      clients.delete(client);
    }
  });
}

function normalizeLineBreakMarkup(text: string): string {
  return text
    .replace(/<\s*b\s*r\s*\/?\s*>/gi, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

// ─── Change tracking ───────────────────────────────────────────
//
// Every mutation bumps the canvas revision and appends a record, so an agent
// can ask "what changed since rev N" and perceive a human's edits in the
// browser instead of re-reading the whole scene and guessing.

// Agents waiting on GET /api/changes/wait, woken by the next change.
const changeWaiters = new Set<() => void>();
let lastChangeAt = 0;

function notifyChangeWaiters(): void {
  lastChangeAt = Date.now();
  const waiters = [...changeWaiters];
  changeWaiters.clear();
  for (const wake of waiters) wake();
}

function appendChange(record: ChangeRecord): void {
  changeLog.records.push(record);
  if (changeLog.records.length > CHANGE_LOG_LIMIT) {
    changeLog.records.splice(0, changeLog.records.length - CHANGE_LOG_LIMIT);
  }
  notifyChangeWaiters();
}

function track(
  kind: ChangeKind,
  element: ServerElement,
  origin: ChangeOrigin,
  delta?: { before: Record<string, unknown>; after: Record<string, unknown> }
): void {
  // Bound text children are reported through their container's label instead
  // of as changes in their own right.
  if (!isChangeTracked(element)) return;

  const rev = ++changeLog.revision;
  if (kind !== 'delete') {
    element.rev = rev;
    element.origin = origin;
  }

  // Resolved while the element is still in the store, so a delete record can
  // still name what was removed.
  const label = effectiveLabel(element, elements);

  appendChange({
    rev,
    kind,
    id: element.id,
    origin,
    at: new Date().toISOString(),
    elementType: element.type,
    ...(label ? { label } : {}),
    ...(delta ? { before: delta.before, after: delta.after } : {})
  });
}

// Canonical form of an element as the store currently sees it.
function canonicalOf(element: ServerElement, context: Map<string, ServerElement> = elements): CanonicalElement {
  return canonicalizeElement(element, context);
}

export interface ChangePayload {
  success: true;
  since: number;
  rev: number;
  truncated: boolean;
  reset: boolean;
  records: ChangeRecord[];
}

function buildChangePayload(since: number): ChangePayload {
  const records = changeLog.records.filter(record => record.rev > since);
  const oldestRetained = changeLog.records.length > 0 ? changeLog.records[0]!.rev : 1;

  return {
    success: true,
    since,
    rev: changeLog.revision,
    // History has been trimmed past the caller's cursor — the report will be
    // incomplete and the caller should fall back to a full scene read.
    truncated: changeLog.records.length > 0 && since < oldestRetained - 1,
    // A cursor ahead of the canvas means the server restarted under the agent.
    reset: since > changeLog.revision,
    records
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
}

function nextChange(timeoutMs: number): Promise<void> {
  return new Promise(resolve => {
    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      changeWaiters.delete(finish);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, Math.max(0, timeoutMs));
    changeWaiters.add(finish);
  });
}

// Block until the canvas moves past `since`, then hold for a quiet window so a
// burst of human edits (drag, type, drag again) is delivered as one batch
// rather than waking the agent on the first brush stroke.
async function awaitCanvasChanges(since: number, timeoutMs: number, settleMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (changeLog.revision <= since && Date.now() < deadline) {
    await nextChange(deadline - Date.now());
  }

  if (changeLog.revision <= since) return; // timed out with nothing to report

  while (settleMs > 0 && Date.now() < deadline) {
    const quietFor = Date.now() - lastChangeAt;
    if (quietFor >= settleMs) break;
    await sleep(Math.min(settleMs - quietFor, deadline - Date.now()));
  }
}

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
  clients.add(ws);
  logger.info('New WebSocket connection established');

  // Send current elements to new client
  const filesObj: Record<string, ExcalidrawFile> = {};
  files.forEach((f, id) => { filesObj[id] = f; });
  const initialMessage: InitialElementsMessage & { files?: Record<string, ExcalidrawFile> } = {
    type: 'initial_elements',
    elements: Array.from(elements.values()),
    ...(files.size > 0 ? { files: filesObj } : {})
  };
  ws.send(JSON.stringify(initialMessage));

  // Send sync status to new client
  const syncMessage: SyncStatusMessage = {
    type: 'sync_status',
    elementCount: elements.size,
    timestamp: new Date().toISOString()
  };
  ws.send(JSON.stringify(syncMessage));

  ws.on('close', () => {
    clients.delete(ws);
    logger.info('WebSocket connection closed');
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Schema validation
// A shape's label and the typography Excalidraw applies to the bound text
// child it creates for it. The style keys have to be declared here or zod
// strips them, which would leave every label rendering in the default font.
// Author's declared role for `wireframe`, validated here so a typo is rejected
// at the boundary rather than silently ignored by the reader.
const RoleSchema = z.enum(COMPONENT_ROLES);

const LabelSchema = z.object({
  text: z.string(),
  fontSize: z.number().optional(),
  fontFamily: z.union([z.string(), z.number()]).optional(),
  textAlign: z.string().optional(),
  verticalAlign: z.string().optional(),
  strokeColor: z.string().optional()
});

const CreateElementSchema = z.object({
  id: z.string().optional(), // Allow passing ID for MCP sync
  type: z.enum(Object.values(EXCALIDRAW_ELEMENT_TYPES) as [ExcalidrawElementType, ...ExcalidrawElementType[]]),
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  backgroundColor: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  strokeStyle: z.string().optional(),
  roughness: z.number().optional(),
  opacity: z.number().optional(),
  text: z.string().optional(),
  label: LabelSchema.optional(),
  role: RoleSchema.optional(),
  fontSize: z.number().optional(),
  fontFamily: z.union([z.string(), z.number()]).optional(),
  // Bound-text back-pointer — without it, zod strips containerId on import
  // and re-imported bound labels detach from their containers
  containerId: z.string().nullable().optional(),
  // Excalidraw identity fields — preserve through import so re-exported
  // scenes keep their stacking order, roughness seeds, and timestamps, and
  // no-op import→export cycles stay byte-stable
  index: z.string().nullable().optional(),
  seed: z.number().optional(),
  versionNonce: z.number().optional(),
  updated: z.number().optional(),
  groupIds: z.array(z.string()).optional(),
  locked: z.boolean().optional(),
  roundness: z.object({ type: z.number(), value: z.number().optional() }).nullable().optional(),
  fillStyle: z.string().optional(),
  // Arrow-specific properties
  points: z.any().optional(),
  start: z.object({ id: z.string() }).optional(),
  end: z.object({ id: z.string() }).optional(),
  startArrowhead: z.string().nullable().optional(),
  endArrowhead: z.string().nullable().optional(),
  elbowed: z.boolean().optional(),
  // Arrow binding properties (preserved for Excalidraw frontend)
  startBinding: z.object({
    elementId: z.string(),
    focus: z.number().optional(),
    gap: z.number().optional(),
    fixedPoint: z.tuple([z.number(), z.number()]).nullable().optional(),
    mode: z.string().optional(),
  }).nullable().optional(),
  endBinding: z.object({
    elementId: z.string(),
    focus: z.number().optional(),
    gap: z.number().optional(),
    fixedPoint: z.tuple([z.number(), z.number()]).nullable().optional(),
    mode: z.string().optional(),
  }).nullable().optional(),
  boundElements: z.array(z.object({
    id: z.string(),
    type: z.enum(['arrow', 'text']),
  })).nullable().optional(),
  // Image-specific properties
  fileId: z.string().optional(),
  status: z.string().optional(),
  scale: z.tuple([z.number(), z.number()]).optional(),
}).passthrough();

const UpdateElementSchema = z.object({
  id: z.string(),
  type: z.enum(Object.values(EXCALIDRAW_ELEMENT_TYPES) as [ExcalidrawElementType, ...ExcalidrawElementType[]]).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  backgroundColor: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  strokeStyle: z.string().optional(),
  roughness: z.number().optional(),
  opacity: z.number().optional(),
  text: z.string().optional(),
  originalText: z.string().optional(),
  label: LabelSchema.optional(),
  role: RoleSchema.optional(),
  fontSize: z.number().optional(),
  fontFamily: z.union([z.string(), z.number()]).optional(),
  // Bound-text back-pointer — without it, zod strips containerId on import
  // and re-imported bound labels detach from their containers
  containerId: z.string().nullable().optional(),
  // Excalidraw identity fields — preserve through import so re-exported
  // scenes keep their stacking order, roughness seeds, and timestamps, and
  // no-op import→export cycles stay byte-stable
  index: z.string().nullable().optional(),
  seed: z.number().optional(),
  versionNonce: z.number().optional(),
  updated: z.number().optional(),
  groupIds: z.array(z.string()).optional(),
  locked: z.boolean().optional(),
  roundness: z.object({ type: z.number(), value: z.number().optional() }).nullable().optional(),
  fillStyle: z.string().optional(),
  points: z.array(z.union([
    z.tuple([z.number(), z.number()]),
    z.object({ x: z.number(), y: z.number() })
  ])).optional(),
  start: z.object({ id: z.string() }).optional(),
  end: z.object({ id: z.string() }).optional(),
  startArrowhead: z.string().nullable().optional(),
  endArrowhead: z.string().nullable().optional(),
  elbowed: z.boolean().optional(),
  // Arrow binding properties (preserved for Excalidraw frontend)
  startBinding: z.object({
    elementId: z.string(),
    focus: z.number().optional(),
    gap: z.number().optional(),
    fixedPoint: z.tuple([z.number(), z.number()]).nullable().optional(),
    mode: z.string().optional(),
  }).nullable().optional(),
  endBinding: z.object({
    elementId: z.string(),
    focus: z.number().optional(),
    gap: z.number().optional(),
    fixedPoint: z.tuple([z.number(), z.number()]).nullable().optional(),
    mode: z.string().optional(),
  }).nullable().optional(),
  boundElements: z.array(z.object({
    id: z.string(),
    type: z.enum(['arrow', 'text']),
  })).nullable().optional(),
  // Image-specific properties
  fileId: z.string().optional(),
  status: z.string().optional(),
  scale: z.tuple([z.number(), z.number()]).optional(),
}).passthrough();

// API Routes

// Get all elements
app.get('/api/elements', (req: Request, res: Response) => {
  try {
    const elementsArray = Array.from(elements.values());
    res.json({
      success: true,
      elements: elementsArray,
      count: elementsArray.length
    });
  } catch (error) {
    logger.error('Error fetching elements:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Create new element
app.post('/api/elements', (req: Request, res: Response) => {
  try {
    const params = CreateElementSchema.parse(req.body);
    logger.info('Creating element via API', { type: params.type });

    // Prioritize passed ID (for MCP sync), otherwise generate new ID
    const id = params.id || generateId();
    const element: ServerElement = {
      id,
      ...params,
      fontFamily: normalizeFontFamily(params.fontFamily),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    // Resolve arrow bindings against existing elements
    if (element.type === 'arrow' || element.type === 'line') {
      resolveArrowBindings([element]);
    }

    elements.set(id, element);
    track('add', element, 'agent');

    // Broadcast to all connected clients
    const message: ElementCreatedMessage = {
      type: 'element_created',
      element: element
    };
    broadcast(message);

    res.json({
      success: true,
      element: element
    });
  } catch (error) {
    logger.error('Error creating element:', error);
    res.status(400).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Update element
app.put('/api/elements/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const updates = UpdateElementSchema.parse({ id, ...body });

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Element ID is required'
      });
    }

    const existingElement = elements.get(id);
    if (!existingElement) {
      return res.status(404).json({
        success: false,
        error: `Element with ID ${id} not found`
      });
    }

    const beforeCanonical = canonicalOf(existingElement);

    const updatedElement: ServerElement = {
      ...existingElement,
      ...updates,
      fontFamily: updates.fontFamily !== undefined ? normalizeFontFamily(updates.fontFamily) : existingElement.fontFamily,
      updatedAt: new Date().toISOString(),
      version: (existingElement.version || 0) + 1
    };

    // Keep Excalidraw text source in sync when clients update text via REST.
    // If originalText lags behind text, rendered wrapping/position can drift.
    const hasTextUpdate = Object.prototype.hasOwnProperty.call(body, 'text');
    const hasOriginalTextUpdate = Object.prototype.hasOwnProperty.call(body, 'originalText');
    if (updatedElement.type === EXCALIDRAW_ELEMENT_TYPES.TEXT && hasTextUpdate && !hasOriginalTextUpdate) {
      const incomingText = updates.text ?? '';
      const existingText = typeof existingElement.text === 'string' ? existingElement.text : '';
      const existingOriginalText = typeof existingElement.originalText === 'string'
        ? existingElement.originalText
        : '';
      const existingOriginalHasBr = /<\s*b\s*r\s*\/?\s*>/i.test(existingOriginalText);
      const normalizedExistingText = normalizeLineBreakMarkup(existingText);
      const normalizedExistingOriginalText = normalizeLineBreakMarkup(existingOriginalText);

      // Handle common cleanup flow: caller normalizes the rendered text value.
      // In this case, prefer normalized originalText so words aren't split by stale wraps.
      if (existingOriginalHasBr && incomingText === normalizedExistingText && normalizedExistingOriginalText) {
        updatedElement.text = normalizedExistingOriginalText;
        updatedElement.originalText = normalizedExistingOriginalText;
      } else {
        updatedElement.originalText = incomingText;
      }
    }

    elements.set(id, updatedElement);

    const delta = diffCanonical(beforeCanonical, canonicalOf(updatedElement));
    if (delta) track('update', updatedElement, 'agent', delta);

    // Broadcast to all connected clients
    const message: ElementUpdatedMessage = {
      type: 'element_updated',
      element: updatedElement
    };
    broadcast(message);

    // Moving/resizing a shape must drag its bound arrows along
    const geometryChanged = ['x', 'y', 'width', 'height']
      .some(key => Object.prototype.hasOwnProperty.call(body, key));
    if (geometryChanged && updatedElement.type !== 'arrow' && updatedElement.type !== 'line') {
      for (const { arrow, delta: arrowDelta } of rerouteBoundArrows(id)) {
        if (arrowDelta) track('update', arrow, 'agent', arrowDelta);
        broadcast({ type: 'element_updated', element: arrow } as ElementUpdatedMessage);
      }
    }

    res.json({
      success: true,
      element: updatedElement
    });
  } catch (error) {
    logger.error('Error updating element:', error);
    res.status(400).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Clear all elements (must be before /:id route)
app.delete('/api/elements/clear', (req: Request, res: Response) => {
  try {
    const count = elements.size;
    // Recorded before the wipe so the change log can still name what went.
    for (const element of elements.values()) {
      track('delete', element, 'agent');
    }
    elements.clear();

    broadcast({
      type: 'canvas_cleared',
      timestamp: new Date().toISOString()
    });

    logger.info(`Canvas cleared: ${count} elements removed`);

    res.json({
      success: true,
      message: `Cleared ${count} elements`,
      count
    });
  } catch (error) {
    logger.error('Error clearing canvas:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Delete element
app.delete('/api/elements/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Element ID is required'
      });
    }

    const doomed = elements.get(id);
    if (!doomed) {
      return res.status(404).json({
        success: false,
        error: `Element with ID ${id} not found`
      });
    }

    track('delete', doomed, 'agent');
    elements.delete(id);

    // Broadcast to all connected clients
    const message: ElementDeletedMessage = {
      type: 'element_deleted',
      elementId: id!
    };
    broadcast(message);

    res.json({
      success: true,
      message: `Element ${id} deleted successfully`
    });
  } catch (error) {
    logger.error('Error deleting element:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Query elements with filters
app.get('/api/elements/search', (req: Request, res: Response) => {
  try {
    const { type, x_min, x_max, y_min, y_max, ...filters } = req.query;
    let results = Array.from(elements.values());

    // Filter by type if specified
    if (type && typeof type === 'string') {
      results = results.filter(element => element.type === type);
    }

    // Filter by bounding box if specified
    if (x_min !== undefined || x_max !== undefined || y_min !== undefined || y_max !== undefined) {
      const xMin = x_min !== undefined ? Number(x_min) : -Infinity;
      const xMax = x_max !== undefined ? Number(x_max) : Infinity;
      const yMin = y_min !== undefined ? Number(y_min) : -Infinity;
      const yMax = y_max !== undefined ? Number(y_max) : Infinity;

      results = results.filter(el =>
        el.x >= xMin &&
        el.x <= xMax &&
        el.y >= yMin &&
        el.y <= yMax
      );
    }

    // Apply additional exact-match filters
    if (Object.keys(filters).length > 0) {
      results = results.filter(element => {
        return Object.entries(filters).every(([key, value]) => {
          return (element as any)[key] === value;
        });
      });
    }

    res.json({
      success: true,
      elements: results,
      count: results.length
    });
  } catch (error) {
    logger.error('Error querying elements:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Get element by ID
app.get('/api/elements/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Element ID is required'
      });
    }

    const element = elements.get(id);

    if (!element) {
      return res.status(404).json({
        success: false,
        error: `Element with ID ${id} not found`
      });
    }

    res.json({
      success: true,
      element: element
    });
  } catch (error) {
    logger.error('Error fetching element:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Helper: compute edge point for an element given a direction toward a target
function computeEdgePoint(
  el: ServerElement,
  targetCenterX: number,
  targetCenterY: number
): { x: number; y: number } {
  const cx = el.x + (el.width || 0) / 2;
  const cy = el.y + (el.height || 0) / 2;
  const dx = targetCenterX - cx;
  const dy = targetCenterY - cy;

  if (el.type === 'diamond') {
    // Diamond edge: use diamond geometry (rotated square)
    const hw = (el.width || 0) / 2;
    const hh = (el.height || 0) / 2;
    if (dx === 0 && dy === 0) return { x: cx, y: cy + hh };
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    // Scale factor to reach diamond edge
    const scale = (absDx / hw + absDy / hh) > 0
      ? 1 / (absDx / hw + absDy / hh)
      : 1;
    return { x: cx + dx * scale, y: cy + dy * scale };
  }

  if (el.type === 'ellipse') {
    // Ellipse edge: parametric intersection
    const a = (el.width || 0) / 2;
    const b = (el.height || 0) / 2;
    if (dx === 0 && dy === 0) return { x: cx, y: cy + b };
    const angle = Math.atan2(dy, dx);
    return { x: cx + a * Math.cos(angle), y: cy + b * Math.sin(angle) };
  }

  // Rectangle: find intersection with edges
  const hw = (el.width || 0) / 2;
  const hh = (el.height || 0) / 2;
  if (dx === 0 && dy === 0) return { x: cx, y: cy + hh };
  const angle = Math.atan2(dy, dx);
  const tanA = Math.tan(angle);
  // Check if ray intersects top/bottom edge or left/right edge
  if (Math.abs(tanA * hw) <= hh) {
    // Intersects left or right edge
    const signX = dx >= 0 ? 1 : -1;
    return { x: cx + signX * hw, y: cy + signX * hw * tanA };
  } else {
    // Intersects top or bottom edge
    const signY = dy >= 0 ? 1 : -1;
    return { x: cx + signY * hh / tanA, y: cy + signY * hh };
  }
}

// Helper: resolve arrow bindings in a batch
function resolveArrowBindings(batchElements: ServerElement[]): void {
  const elementMap = new Map<string, ServerElement>();
  batchElements.forEach(el => elementMap.set(el.id, el));

  // Also check existing elements for cross-batch references
  elements.forEach((el, id) => {
    if (!elementMap.has(id)) elementMap.set(id, el);
  });

  for (const el of batchElements) {
    if (el.type !== 'arrow' && el.type !== 'line') continue;
    const startRef = (el as any).start as { id: string } | undefined;
    const endRef = (el as any).end as { id: string } | undefined;

    if (!startRef && !endRef) continue;

    const startEl = startRef ? elementMap.get(startRef.id) : undefined;
    const endEl = endRef ? elementMap.get(endRef.id) : undefined;

    // Calculate arrow path from edge to edge
    const startCenter = startEl
      ? { x: startEl.x + (startEl.width || 0) / 2, y: startEl.y + (startEl.height || 0) / 2 }
      : { x: el.x, y: el.y };
    const endCenter = endEl
      ? { x: endEl.x + (endEl.width || 0) / 2, y: endEl.y + (endEl.height || 0) / 2 }
      : { x: el.x + 100, y: el.y };

    const GAP = 8;
    const startPt = startEl
      ? computeEdgePoint(startEl, endCenter.x, endCenter.y)
      : startCenter;
    const endPt = endEl
      ? computeEdgePoint(endEl, startCenter.x, startCenter.y)
      : endCenter;

    // Apply gap: move start point slightly away from source, end point slightly away from target
    const startDx = endPt.x - startPt.x;
    const startDy = endPt.y - startPt.y;
    const startDist = Math.sqrt(startDx * startDx + startDy * startDy) || 1;
    const endDx = startPt.x - endPt.x;
    const endDy = startPt.y - endPt.y;
    const endDist = Math.sqrt(endDx * endDx + endDy * endDy) || 1;

    const finalStart = {
      x: startPt.x + (startDx / startDist) * GAP,
      y: startPt.y + (startDy / startDist) * GAP
    };
    const finalEnd = {
      x: endPt.x + (endDx / endDist) * GAP,
      y: endPt.y + (endDy / endDist) * GAP
    };

    // Set arrow position and points
    el.x = finalStart.x;
    el.y = finalStart.y;
    el.points = [[0, 0], [finalEnd.x - finalStart.x, finalEnd.y - finalStart.y]];

    // Do NOT delete `start` and `end` here.
    // Excalidraw's frontend `convertToExcalidrawElements` method looks for these exact properties
    // to calculate mathematically sound `startBinding`, `endBinding`, `focus`, `gap`, and `boundElements`.
  }
}

// After a shape's geometry changes, recompute every arrow bound to it so the
// visual connection follows the shape — bindings are otherwise only resolved
// at creation time, which left arrows floating at stale coordinates when
// update/align/distribute moved their endpoints. Returns the re-routed arrows.
function rerouteBoundArrows(movedId: string): { arrow: ServerElement; delta: ReturnType<typeof diffCanonical> }[] {
  const rerouted: { arrow: ServerElement; delta: ReturnType<typeof diffCanonical> }[] = [];
  elements.forEach(el => {
    if (el.type !== 'arrow' && el.type !== 'line') return;
    const startRef = (el as any).start as { id: string } | undefined;
    const endRef = (el as any).end as { id: string } | undefined;
    if (startRef?.id !== movedId && endRef?.id !== movedId) return;
    const beforeCanonical = canonicalOf(el);
    resolveArrowBindings([el]);
    el.updatedAt = new Date().toISOString();
    el.version = (el.version || 0) + 1;
    rerouted.push({ arrow: el, delta: diffCanonical(beforeCanonical, canonicalOf(el)) });
  });
  return rerouted;
}

// Batch create elements
app.post('/api/elements/batch', (req: Request, res: Response) => {
  try {
    const { elements: elementsToCreate } = req.body;

    if (!Array.isArray(elementsToCreate)) {
      return res.status(400).json({
        success: false,
        error: 'Expected an array of elements'
      });
    }

    const createdElements: ServerElement[] = [];

    elementsToCreate.forEach(elementData => {
      const params = CreateElementSchema.parse(elementData);
      // Prioritize passed ID (for MCP sync), otherwise generate new ID
      const id = params.id || generateId();
      const element: ServerElement = {
        id,
        ...params,
        fontFamily: normalizeFontFamily(params.fontFamily),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      };

      createdElements.push(element);
    });

    // Resolve arrow bindings (computes positions, startBinding, endBinding, boundElements)
    resolveArrowBindings(createdElements);

    // Store all elements after binding resolution
    createdElements.forEach(el => elements.set(el.id, el));
    // Tracked only once the whole batch is stored, so a shape's bound label
    // is already resolvable when its change record is written.
    createdElements.forEach(el => track('add', el, 'agent'));

    // Broadcast to all connected clients
    const message: BatchCreatedMessage = {
      type: 'elements_batch_created',
      elements: createdElements
    };
    broadcast(message);

    res.json({
      success: true,
      elements: createdElements,
      count: createdElements.length
    });
  } catch (error) {
    logger.error('Error batch creating elements:', error);
    res.status(400).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Convert Mermaid diagram to Excalidraw elements
app.post('/api/elements/from-mermaid', (req: Request, res: Response) => {
  try {
    const { mermaidDiagram, config } = req.body;

    if (!mermaidDiagram || typeof mermaidDiagram !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Mermaid diagram definition is required'
      });
    }

    logger.info('Received Mermaid conversion request', {
      diagramLength: mermaidDiagram.length,
      hasConfig: !!config
    });

    // Broadcast to all WebSocket clients to process the Mermaid diagram
    broadcast({
      type: 'mermaid_convert',
      mermaidDiagram,
      config: config || {},
      timestamp: new Date().toISOString()
    });

    // Return the diagram for frontend processing
    res.json({
      success: true,
      mermaidDiagram,
      config: config || {},
      message: 'Mermaid diagram sent to frontend for conversion.'
    });
  } catch (error) {
    logger.error('Error processing Mermaid diagram:', error);
    res.status(400).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Sync elements from the frontend — a human editing the canvas in a browser.
//
// This reconciles rather than wipes. The old implementation cleared the store
// and rewrote every element with version 1, which meant an agent could never
// tell what a person had actually changed: after any edit the entire scene
// looked new. Diffing each element against its stored canonical form is what
// makes the two-way review loop possible.
app.post('/api/elements/sync', (req: Request, res: Response) => {
  try {
    const { elements: frontendElements, timestamp } = req.body;

    // Validate input data
    if (!Array.isArray(frontendElements)) {
      return res.status(400).json({
        success: false,
        error: 'Expected elements to be an array'
      });
    }

    logger.info(`Sync request received: ${frontendElements.length} elements`, {
      timestamp,
      elementCount: frontendElements.length
    });

    const beforeCount = elements.size;
    const syncedAt = new Date().toISOString();

    // Snapshot of the pre-sync store: canonical "before" values (including a
    // shape's label, which lives on a bound text child) must be resolved
    // against the old scene, not the half-updated one.
    const previous = new Map(elements);

    const incoming = new Map<string, any>();
    for (const element of frontendElements) {
      if (!element || typeof element !== 'object') continue;
      const id = element.id || generateId();
      incoming.set(id, { ...element, id });
    }
    // Context for resolving canonical "after" values across the incoming scene.
    const incomingContext = incoming as Map<string, ServerElement>;

    // Label indexes built once per scene — resolving a shape's bound-text
    // label per element would otherwise make each sync quadratic.
    const previousLabels = buildBoundLabelIndex(previous);
    const incomingLabels = buildBoundLabelIndex(incomingContext);

    let added = 0;
    let updated = 0;
    let removed = 0;

    // 1. Elements the human deleted in the browser.
    for (const [id, existing] of previous) {
      if (incoming.has(id)) continue;
      track('delete', existing, 'human');
      elements.delete(id);
      if (isChangeTracked(existing)) removed++;
    }

    // 2. Elements added or edited.
    for (const [id, raw] of incoming) {
      const existing = previous.get(id);

      if (!existing) {
        const element: ServerElement = {
          ...raw,
          id,
          createdAt: syncedAt,
          updatedAt: syncedAt,
          syncedAt,
          source: 'frontend_sync',
          syncTimestamp: timestamp,
          version: 1
        };
        elements.set(id, element);
        track('add', element, 'human');
        if (isChangeTracked(element)) added++;
        continue;
      }

      const delta = diffCanonical(
        canonicalizeElement(existing, previous, previousLabels),
        canonicalizeElement(raw as ServerElement, incomingContext, incomingLabels)
      );

      if (!delta) {
        // Untouched: keep the stored element (and its rev/origin/createdAt)
        // so an agent's authorship is not overwritten by a passive echo.
        existing.syncedAt = syncedAt;
        // The merge path below drops a superseded `label`, but a passive echo
        // never reaches it — and since the echo stopped producing a delta
        // (changes.ts EDITOR_DEFAULTS), that is now the common case. Left here,
        // the stale label is re-expanded into a fresh bound text child on every
        // client load, duplicating the label without bound.
        if (boundChildSupersedesLabel(!!(raw as any).label, id, incomingLabels)) {
          delete (existing as any).label;
        }
        continue;
      }

      // Merge rather than replace: fields the frontend does not echo back
      // (the agent-format `start`/`end` arrow refs that rerouteBoundArrows
      // relies on) must survive a human's edit elsewhere in the scene.
      const element: ServerElement = {
        ...existing,
        ...raw,
        id,
        createdAt: existing.createdAt ?? syncedAt,
        updatedAt: syncedAt,
        syncedAt,
        source: 'frontend_sync',
        syncTimestamp: timestamp,
        version: (existing.version || 0) + 1
      };

      // The frontend is authoritative for content. Once Excalidraw has
      // expanded a shape's agent-format `label` into a bound text child,
      // keeping the original `label` would leave two competing sources of
      // truth — and every later sync would re-report the same edit.
      if (!(raw as any).label) delete (element as any).label;

      elements.set(id, element);
      track('update', element, 'human', delta);
      if (isChangeTracked(element)) updated++;
    }

    logger.info(
      `Sync reconciled: ${added} added, ${updated} updated, ${removed} removed ` +
      `(${elements.size} elements, rev ${changeLog.revision})`
    );

    // 3. Broadcast sync event to all WebSocket clients
    broadcast({
      type: 'elements_synced',
      count: elements.size,
      timestamp: syncedAt,
      source: 'manual_sync'
    });

    // 4. Return sync results
    res.json({
      success: true,
      message: `Synced ${elements.size} elements (${added} added, ${updated} updated, ${removed} removed)`,
      count: elements.size,
      added,
      updated,
      removed,
      rev: changeLog.revision,
      syncedAt,
      beforeCount,
      afterCount: elements.size
    });

  } catch (error) {
    logger.error('Sync error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
      details: 'Internal server error during sync operation'
    });
  }
});

// ─── Change feed (the design-review loop) ──────────────────────

// What changed since a given revision.
app.get('/api/changes', (req: Request, res: Response) => {
  try {
    const since = Number(req.query.since ?? 0);
    if (!Number.isFinite(since) || since < 0) {
      return res.status(400).json({ success: false, error: 'since must be a non-negative number' });
    }
    res.json(buildChangePayload(since));
  } catch (error) {
    logger.error('Error building change payload:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

const WAIT_MAX_TIMEOUT_MS = 600_000;
const WAIT_MAX_SETTLE_MS = 30_000;

// Long-poll: hold the request until a human (or another agent) touches the
// canvas. This is the "hand the pen over and wait" half of the loop.
app.get('/api/changes/wait', async (req: Request, res: Response) => {
  try {
    const since = Number(req.query.since ?? 0);
    if (!Number.isFinite(since) || since < 0) {
      return res.status(400).json({ success: false, error: 'since must be a non-negative number' });
    }

    const timeoutMs = Math.min(
      Math.max(Number(req.query.timeout ?? 60_000) || 0, 1_000),
      WAIT_MAX_TIMEOUT_MS
    );
    const settleMs = Math.min(
      Math.max(Number(req.query.settle ?? 1_500) || 0, 0),
      WAIT_MAX_SETTLE_MS
    );

    let clientGone = false;
    req.on('close', () => { clientGone = true; });

    await awaitCanvasChanges(since, timeoutMs, settleMs);

    if (clientGone) return;

    res.json({
      ...buildChangePayload(since),
      timedOut: changeLog.revision <= since
    });
  } catch (error) {
    logger.error('Error waiting for changes:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ─── Files API (for image elements) ───────────────────────────
// GET all files
app.get('/api/files', (_req: Request, res: Response) => {
  const filesObj: Record<string, ExcalidrawFile> = {};
  files.forEach((f, id) => { filesObj[id] = f; });
  res.json({ files: filesObj });
});

// POST add/update files (batch)
app.post('/api/files', (req: Request, res: Response) => {
  const body = req.body;
  const fileList: ExcalidrawFile[] = Array.isArray(body) ? body : (body?.files || []);
  for (const f of fileList) {
    if (f.id && f.dataURL) {
      files.set(f.id, { id: f.id, dataURL: f.dataURL, mimeType: f.mimeType || 'image/png', created: f.created || Date.now() });
    }
  }
  // Broadcast files to connected clients
  broadcast({ type: 'files_added', files: fileList });
  res.json({ success: true, count: fileList.length });
});

// DELETE a file
app.delete('/api/files/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (files.delete(id)) {
    broadcast({ type: 'file_deleted', fileId: id });
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, error: `File with ID ${id} not found` });
  }
});

// Image export: request (MCP -> Express -> WebSocket -> Frontend)
interface PendingExport {
  resolve: (data: { format: string; data: string }) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  collectionTimeout: ReturnType<typeof setTimeout> | null;
  bestResult: { format: string; data: string } | null;
}
const pendingExports = new Map<string, PendingExport>();

app.post('/api/export/image', (req: Request, res: Response) => {
  try {
    const { format, background } = req.body;

    if (!format || !['png', 'svg'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'format must be "png" or "svg"'
      });
    }

    if (clients.size === 0) {
      return res.status(503).json({
        success: false,
        error: 'No frontend client connected. Open the canvas in a browser first.'
      });
    }

    const requestId = generateId();

    const exportPromise = new Promise<{ format: string; data: string }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const pending = pendingExports.get(requestId);
        pendingExports.delete(requestId);
        // If we collected any result during the window, use it
        if (pending?.bestResult) {
          resolve(pending.bestResult);
        } else {
          reject(new Error('Export timed out after 30 seconds'));
        }
      }, 30000);

      pendingExports.set(requestId, { resolve, reject, timeout, collectionTimeout: null, bestResult: null });
    });

    // Re-broadcast current elements so all connected clients (including stale ones)
    // sync to the canonical server state before exporting
    const filesObj: Record<string, ExcalidrawFile> = {};
    files.forEach((f, id) => { filesObj[id] = f; });
    broadcast({
      type: 'initial_elements',
      elements: Array.from(elements.values()),
      ...(files.size > 0 ? { files: filesObj } : {})
    } as InitialElementsMessage & { files?: Record<string, ExcalidrawFile> });

    // Give browsers time to process the reload before requesting export
    setTimeout(() => {
      broadcast({
        type: 'export_image_request',
        requestId,
        format,
        background: background ?? true
      });
    }, 800);

    exportPromise
      .then(result => {
        res.json({
          success: true,
          format: result.format,
          data: result.data
        });
      })
      .catch(error => {
        res.status(500).json({
          success: false,
          error: (error as Error).message
        });
      });
  } catch (error) {
    logger.error('Error initiating image export:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Image export: result (Frontend -> Express -> MCP)
app.post('/api/export/image/result', (req: Request, res: Response) => {
  try {
    const { requestId, format, data, error } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'requestId is required'
      });
    }

    const pending = pendingExports.get(requestId);
    if (!pending) {
      // Already resolved by another client, or expired — ignore silently
      return res.json({ success: true });
    }

    if (error) {
      // Don't reject on error — another WebSocket client may still succeed.
      logger.warn(`Export error from one client (requestId=${requestId}): ${error}`);
      return res.json({ success: true });
    }

    // Keep the largest response (most complete canvas state wins)
    if (!pending.bestResult || data.length > pending.bestResult.data.length) {
      pending.bestResult = { format, data };
    }

    // Start a short collection window on the first response, then resolve with best
    if (!pending.collectionTimeout) {
      pending.collectionTimeout = setTimeout(() => {
        const p = pendingExports.get(requestId);
        if (p?.bestResult) {
          clearTimeout(p.timeout);
          pendingExports.delete(requestId);
          p.resolve(p.bestResult);
        }
      }, 3000);
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error processing export result:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Viewport control: request (MCP -> Express -> WebSocket -> Frontend)
interface PendingViewport {
  resolve: (data: { success: boolean; message: string }) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}
const pendingViewports = new Map<string, PendingViewport>();

const viewportRequestSchema = z.object({
  scrollToContent: z.boolean().optional(),
  scrollToElementIds: z.array(z.string().min(1)).min(1).optional(),
  viewportZoomFactor: z.number().positive().max(1).optional(),
  scrollToElementId: z.string().min(1).optional(),
  zoom: z.number().min(0.1).max(10).optional(),
  offsetX: z.number().optional(),
  offsetY: z.number().optional()
}).superRefine((params, ctx) => {
  const modes = [
    params.scrollToContent === true,
    params.scrollToElementIds !== undefined,
    params.scrollToElementId !== undefined,
    params.zoom !== undefined || params.offsetX !== undefined || params.offsetY !== undefined
  ].filter(Boolean).length;

  if (modes !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Specify exactly one viewport mode: scrollToContent, scrollToElementIds, scrollToElementId, or manual zoom/offset'
    });
  }
  if (params.viewportZoomFactor !== undefined &&
      params.scrollToContent !== true &&
      params.scrollToElementIds === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['viewportZoomFactor'],
      message: 'viewportZoomFactor requires scrollToContent or scrollToElementIds'
    });
  }
});

app.post('/api/viewport', (req: Request, res: Response) => {
  try {
    const {
      scrollToContent,
      scrollToElementIds,
      scrollToElementId,
      viewportZoomFactor,
      zoom,
      offsetX,
      offsetY
    } = viewportRequestSchema.parse(req.body);

    if (clients.size === 0) {
      return res.status(503).json({
        success: false,
        error: 'No frontend client connected. Open the canvas in a browser first.'
      });
    }

    const requestId = generateId();

    const viewportPromise = new Promise<{ success: boolean; message: string }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingViewports.delete(requestId);
        reject(new Error('Viewport request timed out after 10 seconds'));
      }, 10000);

      pendingViewports.set(requestId, { resolve, reject, timeout });
    });

    broadcast({
      type: 'set_viewport',
      requestId,
      scrollToContent,
      scrollToElementIds,
      scrollToElementId,
      viewportZoomFactor,
      zoom,
      offsetX,
      offsetY
    });

    viewportPromise
      .then(result => {
        res.json(result);
      })
      .catch(error => {
        res.status(500).json({
          success: false,
          error: (error as Error).message
        });
      });
  } catch (error) {
    logger.error('Error initiating viewport change:', error);
    res.status(error instanceof z.ZodError ? 400 : 500).json({
      success: false,
      error: error instanceof z.ZodError
        ? error.issues.map(issue => issue.message).join('; ')
        : (error as Error).message
    });
  }
});

// Viewport control: result (Frontend -> Express -> MCP)
app.post('/api/viewport/result', (req: Request, res: Response) => {
  try {
    const { requestId, success, message, error } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'requestId is required'
      });
    }

    const pending = pendingViewports.get(requestId);
    if (!pending) {
      return res.json({ success: true });
    }

    if (error || success === false) {
      clearTimeout(pending.timeout);
      pendingViewports.delete(requestId);
      pending.reject(new Error(error || message || 'Viewport update failed'));
      return res.json({ success: true });
    }

    clearTimeout(pending.timeout);
    pendingViewports.delete(requestId);
    pending.resolve({ success: true, message: message || 'Viewport updated' });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error processing viewport result:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Snapshots: save
app.post('/api/snapshots', (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Snapshot name is required'
      });
    }

    const snapshot: Snapshot = {
      name,
      elements: Array.from(elements.values()),
      createdAt: new Date().toISOString()
    };

    snapshots.set(name, snapshot);
    logger.info(`Snapshot saved: "${name}" with ${snapshot.elements.length} elements`);

    res.json({
      success: true,
      name,
      elementCount: snapshot.elements.length,
      createdAt: snapshot.createdAt
    });
  } catch (error) {
    logger.error('Error saving snapshot:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Snapshots: list
app.get('/api/snapshots', (req: Request, res: Response) => {
  try {
    const list = Array.from(snapshots.values()).map(s => ({
      name: s.name,
      elementCount: s.elements.length,
      createdAt: s.createdAt
    }));

    res.json({
      success: true,
      snapshots: list,
      count: list.length
    });
  } catch (error) {
    logger.error('Error listing snapshots:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Snapshots: get by name
app.get('/api/snapshots/:name', (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const snapshot = snapshots.get(name!);

    if (!snapshot) {
      return res.status(404).json({
        success: false,
        error: `Snapshot "${name}" not found`
      });
    }

    res.json({
      success: true,
      snapshot
    });
  } catch (error) {
    logger.error('Error fetching snapshot:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Serve the frontend
app.get('/', (req: Request, res: Response) => {
  const htmlFile = path.join(__dirname, '../dist/frontend/index.html');
  res.sendFile(htmlFile, (err) => {
    if (err) {
      logger.error('Error serving frontend:', err);
      res.status(404).send('Frontend not found. Please run "npm run build" first.');
    }
  });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    elements_count: elements.size,
    websocket_clients: clients.size,
    // Current canvas revision — the cursor for GET /api/changes
    rev: changeLog.revision,
    // Identity for `stop`: it must only ever signal a process that both
    // identifies as this service AND self-reports its pid — never a pid
    // from a stale pidfile or an unrelated app squatting on the port.
    service: 'mcp-excalidraw-canvas',
    pid: process.pid
  });
});

// Sync status endpoint
app.get('/api/sync/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    elementCount: elements.size,
    timestamp: new Date().toISOString(),
    memoryUsage: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // MB
    },
    websocketClients: clients.size
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '127.0.0.1';
const LOOPBACK_GUARD_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', '::']);
const LOOPBACK_ADDRESSES = ['127.0.0.1', '::1'];

function formatHostForUrl(host: string): string {
  return host.includes(':') ? `[${host}]` : host;
}

function canConnect(host: string, port: number): Promise<boolean> {
  return new Promise(resolve => {
    let settled = false;
    const socket = net.createConnection({ host, port });

    const finish = (isOpen: boolean): void => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(isOpen);
    };

    socket.setTimeout(250);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

async function findExistingLoopbackListener(port: number): Promise<string | null> {
  for (const host of LOOPBACK_ADDRESSES) {
    if (await canConnect(host, port)) {
      return host;
    }
  }
  return null;
}

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    const address = (error as NodeJS.ErrnoException & { address?: string }).address || HOST;
    logger.error(`Canvas server port ${PORT} is already in use on ${formatHostForUrl(address)}.`);
  } else if (error.code === 'EACCES') {
    logger.error(`Canvas server cannot bind ${formatHostForUrl(HOST)}:${PORT}: permission denied.`);
  } else {
    logger.error('Failed to start canvas server:', error);
  }
  process.exit(1);
});

async function startServer(): Promise<void> {
  if (LOOPBACK_GUARD_HOSTS.has(HOST)) {
    const existingHost = await findExistingLoopbackListener(PORT);
    if (existingHost) {
      logger.error(
        `Refusing to start canvas server on ${formatHostForUrl(HOST)}:${PORT}: ` +
        `${formatHostForUrl(existingHost)}:${PORT} is already listening. ` +
        'This prevents duplicate IPv4/IPv6 canvas servers from splitting state.'
      );
      process.exit(1);
    }
  }

  // Only the process that actually wrote the pidfile may remove it —
  // a concurrent-start loser exiting on EADDRINUSE must not delete the
  // winner's pidfile.
  let ownsPidFile = false;

  server.listen(PORT, HOST, () => {
    const hostForUrl = formatHostForUrl(HOST);
    logger.info(`POC server running on http://${hostForUrl}:${PORT}`);
    logger.info(`WebSocket server running on ws://${hostForUrl}:${PORT}`);

    // Written only after listen succeeds so stale files can't shadow a
    // server that never came up; lets `excalidraw-canvas stop` find us.
    writePidFile(PORT, process.pid);
    ownsPidFile = true;
  });

  const shutdown = (signal: NodeJS.Signals): void => {
    logger.info(`Received ${signal}, shutting down canvas server`);
    if (ownsPidFile) removePidFile(PORT);
    server.close(() => process.exit(0));
    // Force-exit if open sockets keep the server from closing promptly
    setTimeout(() => process.exit(0), 2000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('exit', () => {
    if (ownsPidFile) removePidFile(PORT);
  });
}

// Start the canvas server only when this file is the process entry point
// (`node dist/server.js`, `npm run canvas`, or spawned by the CLI/MCP
// auto-start). Importing this module must never start the server.
if (isMainModule(import.meta.url)) {
  void startServer();
}

export { startServer };
export default app;
