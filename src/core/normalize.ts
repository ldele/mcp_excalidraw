import path from 'path';
import { generateId, ServerElement, ElementLabel, LABEL_STYLE_KEYS, normalizeFontFamily } from '../types.js';
import { ALLOWED_EXPORT_DIR } from './config.js';

// Safe file path validation to prevent path traversal attacks
export function sanitizeFilePath(filePath: string): string {
  const resolved = path.resolve(filePath);
  const allowedDir = path.resolve(ALLOWED_EXPORT_DIR);
  if (!resolved.startsWith(allowedDir + path.sep) && resolved !== allowedDir) {
    throw new Error(
      `Path traversal blocked: "${filePath}" resolves outside the allowed directory "${allowedDir}". ` +
      `Set EXCALIDRAW_EXPORT_DIR to change the allowed base directory.`
    );
  }
  return resolved;
}

// Normalize points to [x, y] tuple format that Excalidraw expects
export function normalizePoints(points: Array<{ x: number; y: number } | [number, number]>): [number, number][] {
  return points.map(p => {
    if (Array.isArray(p)) return p as [number, number];
    return [p.x, p.y] as [number, number];
  });
}

// Lift the label style keys off `source` (mutating it) and return them.
// Excalidraw reads a label's typography off the bound text child it creates,
// never off the container, so leaving these on the shape renders the label in
// the default font while the element still reports the size that was asked for.
function extractLabelStyle(source: Record<string, unknown>): Partial<ElementLabel> {
  const style: Record<string, unknown> = {};
  for (const key of LABEL_STYLE_KEYS) {
    if (source[key] !== undefined) {
      style[key] = source[key];
      delete source[key];
    }
  }
  return style as Partial<ElementLabel>;
}

// Normalize a label's fontFamily name ("helvetica") to Excalidraw's numeric id.
function normalizeLabelFont(label: ElementLabel): ElementLabel {
  if (label.fontFamily === undefined) return label;
  return { ...label, fontFamily: normalizeFontFamily(label.fontFamily) };
}

// Convert the agent-friendly `text` shorthand on a shape into Excalidraw's
// `label` format, carrying any label typography passed alongside it. An
// explicit `label` object wins over the shorthand, key by key.
export function convertTextToLabel(element: ServerElement): ServerElement {
  // Standalone text elements own their text and typography directly.
  if (element.type === 'text') return element;

  const { text, label: explicitLabel, ...rest } = element;
  if (!text && !explicitLabel) return element;

  const style = extractLabelStyle(rest as Record<string, unknown>);
  const labelText = explicitLabel?.text ?? text;
  if (labelText === undefined) return element;

  return {
    ...rest,
    label: normalizeLabelFont({ ...style, ...explicitLabel, text: labelText })
  } as ServerElement;
}

export interface ElementInput {
  id?: string;
  type: string;
  points?: Array<{ x: number; y: number } | [number, number]>;
  startElementId?: string;
  endElementId?: string;
  fontFamily?: string | number;
  [key: string]: unknown;
}

// Shared element preparation: id generation, arrow binding conversion,
// fontFamily normalization, default points for bound arrows, timestamps,
// and text→label conversion. Used by create/batch-create in both the MCP
// server and the CLI so the two front-ends produce identical elements.
export function prepareElement(elementData: ElementInput): ServerElement {
  const { startElementId, endElementId, id: customId, ...elementProps } = elementData;
  const id = customId || generateId();
  const element: ServerElement = {
    id,
    ...elementProps,
    points: elementProps.points ? normalizePoints(elementProps.points) : undefined,
    // Convert binding IDs to Excalidraw's start/end format
    ...(startElementId ? { start: { id: startElementId } } : {}),
    ...(endElementId ? { end: { id: endElementId } } : {}),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1
  } as ServerElement;

  // Normalize fontFamily from string names to numeric values
  if (element.fontFamily !== undefined) {
    element.fontFamily = normalizeFontFamily(element.fontFamily);
  }

  // For bound arrows without explicit points, set a default
  if ((startElementId || endElementId) && !elementProps.points) {
    (element as any).points = [[0, 0], [100, 0]];
  }

  // Convert text to label format for Excalidraw
  return convertTextToLabel(element);
}

// Shared update-payload preparation (points, fontFamily, text→label,
// updatedAt) — used by the MCP update_element tool and the CLI.
//
// `existing` is the element as it currently stands on the canvas. Update
// payloads usually don't carry `type`, and text→label conversion must only
// happen for non-text elements — converting a standalone text element's `text`
// into `label` silently fails to change the visible text. The existing label
// also matters because the server merges an update shallowly: writing
// `label: {text}` alone would drop the styling the label already had.
export function prepareElementUpdate(
  id: string,
  updates: Record<string, unknown>,
  existing?: Pick<ServerElement, 'type' | 'label'>
): Partial<ServerElement> & { id: string } {
  const { points: rawPoints, ...rest } = updates as {
    points?: Array<{ x: number; y: number } | [number, number]>;
    [key: string]: unknown;
  };

  const updatePayload: Partial<ServerElement> & { id: string } = {
    id,
    ...rest,
    points: rawPoints ? normalizePoints(rawPoints) : undefined,
    updatedAt: new Date().toISOString()
  };

  if (updatePayload.fontFamily !== undefined) {
    updatePayload.fontFamily = normalizeFontFamily(updatePayload.fontFamily);
  }

  // Restyle/relabel a shape's label only when the element is known to be a
  // non-text shape. Unknown type keeps `text` and the typography as-is (the
  // safe direction for text elements, which own both directly; when the canvas
  // is up, callers always know the type).
  const effectiveType = (updates.type as string | undefined) ?? existing?.type;
  if (!effectiveType || effectiveType === 'text') return updatePayload;

  const { text, label: explicitLabel, ...withoutText } = updatePayload;
  const style = extractLabelStyle(withoutText as Record<string, unknown>);
  const labelText = explicitLabel?.text ?? text ?? existing?.label?.text;

  // Nothing to attach the styling to — a bare shape with no label. Leave the
  // payload untouched rather than dropping the caller's keys.
  const restyling = Object.keys(style).length > 0 || explicitLabel !== undefined;
  if (labelText === undefined || (text === undefined && !restyling)) return updatePayload;

  return {
    ...withoutText,
    label: normalizeLabelFont({ ...existing?.label, ...style, ...explicitLabel, text: labelText })
  } as Partial<ServerElement> & { id: string };
}
