// The box an element occupies on the canvas, as the reading and the change report measure it.
// Its own module so that markup-intent.ts and changes.ts can both use it without importing each
// other.

import { ServerElement } from '../types.js';

export function normalizePoints(points: unknown): [number, number][] | null {
  if (!Array.isArray(points)) return null;
  const out: [number, number][] = [];
  for (const point of points) {
    const px = Array.isArray(point) ? point[0] : (point as any)?.x;
    const py = Array.isArray(point) ? point[1] : (point as any)?.y;
    if (typeof px !== 'number' || typeof py !== 'number') continue;
    out.push([Math.round(px * 10) / 10, Math.round(py * 10) / 10]);
  }
  return out;
}

export interface Box { x: number; y: number; w: number; h: number }

export function boxOf(el: ServerElement): Box {
  // Arrows and freedraw carry their extent in `points` relative to (x, y);
  // width/height are frequently absent or stale on them.
  const points = normalizePoints((el as any).points);
  if (points && points.length > 0) {
    let minX = 0, minY = 0, maxX = 0, maxY = 0;
    for (const [px, py] of points) {
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }
    return { x: el.x + minX, y: el.y + minY, w: maxX - minX, h: maxY - minY };
  }
  if (isUnsizedText(el)) {
    // T-001: text added with no size is stored with none until a tab measures it, and a 0x0 box
    // dropped it from the reading, screen headings included. Estimate it as export does
    // (src/core/expand-elements.ts): ~0.6 x fontSize per character, 1.25 x fontSize per line.
    const lines = String(el.text ?? (el as any).originalText ?? '').split('\n');
    const fontSize = typeof (el as any).fontSize === 'number' ? (el as any).fontSize : 20;
    const longest = Math.max(...lines.map(line => line.length));
    return {
      x: el.x,
      y: el.y,
      w: el.width || (longest > 0 ? Math.ceil(longest * fontSize * 0.6) : 0),
      h: el.height || (longest > 0 ? Math.ceil(lines.length * fontSize * 1.25) : 0)
    };
  }
  return { x: el.x, y: el.y, w: el.width || 0, h: el.height || 0 };
}

// A text element with no stored width or height: an agent's `add` without them, before any tab
// has measured it. Its box is an estimate (boxOf), and the reading says so.
export function isUnsizedText(el: ServerElement): boolean {
  return el.type === 'text' && (!el.width || !el.height);
}
