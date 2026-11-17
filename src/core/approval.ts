// A screen's approval box, which a person ticks when the screen is done (ADR-005, SPEC-007).
//
// The agent draws a small "Approved" box inside each screen and gives it the screen's id with
// `-approval` after it (`s01-approval`). It is not a component of the design. A person ticks it
// with a fill or with any mark drawn inside it, in any colour; ADR-004's green is what the legend
// suggests. Which marks count as a person's is the caller's to decide: this module only knows the
// id rule and the geometry.

import { ServerElement } from '../types.js';
import { Box, boxOf } from './box.js';

export type Approval = 'approved' | 'open';

export function isApprovalId(id: unknown): boolean {
  return typeof id === 'string' && id.length > '-approval'.length && id.endsWith('-approval');
}

export function isFilled(el: ServerElement): boolean {
  const bg = el.backgroundColor;
  return !!bg && bg !== 'transparent';
}

function holdsPoint(box: Box, x: number, y: number): boolean {
  return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
}

// The approval box a mark ticks: the first whose box holds the mark's centre.
export function approvalBoxHolding(
  mark: ServerElement,
  boxes: ServerElement[]
): ServerElement | undefined {
  const own = boxOf(mark);
  const cx = own.x + own.w / 2;
  const cy = own.y + own.h / 2;
  return boxes.find(box => box.id !== mark.id && holdsPoint(boxOf(box), cx, cy));
}

// The screen an approval box belongs to, among `screens`: its `frameId` when that names one,
// else the largest whose box holds the approval box's centre. Screens never nest, so among real
// screens that is the one; among every element (the change report's candidates) it is the
// screen rather than a header bar or a card the box sits on.
export function screenOfApprovalBox<T extends { id: string; box: Box }>(
  approvalBox: ServerElement,
  screens: T[]
): T | undefined {
  if (typeof approvalBox.frameId === 'string') {
    const framed = screens.find(screen => screen.id === approvalBox.frameId);
    if (framed) return framed;
  }
  const own = boxOf(approvalBox);
  const cx = own.x + own.w / 2;
  const cy = own.y + own.h / 2;
  return screens
    .filter(screen => holdsPoint(screen.box, cx, cy))
    .sort((a, b) => b.box.w * b.box.h - a.box.w * a.box.h)[0];
}
