// The thresholds and geometric rules the wireframe reader decides by, in one place so the geometry
// lint (wireframe-lint.ts, ADR-002) judges a drawing by exactly the numbers the reader uses. A lint
// that disagreed with the reader about what contains what would be worse than no lint.

import { ServerElement, COMPONENT_ROLES, ComponentRole } from '../types.js';
import { Box } from './box.js';

// How far an element may cross its container's edge and still nest inside it.
export const CONTAINMENT_TOLERANCE = 2;

// Role inference (`classify` in wireframe.ts).
export const EDGE_TOLERANCE = 10;
export const BAR_MAX_HEIGHT_RATIO = 0.2;
export const BAR_MIN_WIDTH_RATIO = 0.8;
export const SIDEBAR_MAX_WIDTH_RATIO = 0.35;
export const SIDEBAR_MIN_HEIGHT_RATIO = 0.7;
export const CONTROL_MAX_HEIGHT = 72;
export const HEADING_MIN_FONT_SIZE = 20;
export const TICKBOX_MAX_SIZE = 28;
export const AVATAR_MAX_SIZE = 72;
export const DIVIDER_MAX_THICKNESS = 6;

export function contains(outer: Box, inner: Box): boolean {
  return (
    outer.x - CONTAINMENT_TOLERANCE <= inner.x &&
    outer.y - CONTAINMENT_TOLERANCE <= inner.y &&
    outer.x + outer.w + CONTAINMENT_TOLERANCE >= inner.x + inner.w &&
    outer.y + outer.h + CONTAINMENT_TOLERANCE >= inner.y + inner.h
  );
}

// How much of the shorter of two vertical bands the other overlaps, 0 to 1. Two boxes share a row
// in the reading when this is over a half.
export function rowOverlapRatio(band: { top: number; bottom: number }, box: Box): number {
  const overlap = Math.min(band.bottom, box.y + box.h) - Math.max(band.top, box.y);
  if (overlap <= 0) return 0;
  const shorter = Math.min(band.bottom - band.top, box.h);
  return shorter <= 0 ? 1 : overlap / shorter;
}

export function sharesRow(band: { top: number; bottom: number }, box: Box): boolean {
  return rowOverlapRatio(band, box) > 0.5;
}

// Square enough to be a tickbox, a radio, an avatar or an icon.
export function isSquarish(box: Box): boolean {
  return box.w > 0 && box.h > 0 && Math.abs(box.w - box.h) / Math.max(box.w, box.h) < 0.25;
}

// An author who declares a role knows something inference cannot recover.
// Unknown strings fall through to inference rather than erroring — the API
// schema is where a typo gets rejected.
export function declaredRole(el: ServerElement): ComponentRole | undefined {
  const raw = (el as { role?: unknown }).role;
  if (typeof raw !== 'string') return undefined;
  const role = raw.trim().toLowerCase() as ComponentRole;
  return (COMPONENT_ROLES as readonly string[]).includes(role) ? role : undefined;
}
