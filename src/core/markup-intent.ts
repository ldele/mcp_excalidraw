// What a person's mark asks for, read from its colour, and the legend frame that tells them which
// colour is which (ADR-004, SPEC-006).
//
// Four colour families of the editor's own palette carry an intent. The one-click picks beside
// black in the stroke picker are the shade a person reaches first: red #e03131 change, the
// orange-looking #f08c00 (Excalidraw's "yellow") remove, blue #1971c2 question, green #2f9e44
// fine. Every other shade of a family means the same, so a person who picks a lighter red from
// the shade row still says "change". Only a person's marks (origin `human`) are read: the agent's
// own colours mean nothing here.
//
// The legend is the agent's, and the reading leaves it out: an element whose id is `legend` or
// begins `legend-`, with everything that is a member of it or drawn inside it.

import { ServerElement } from '../types.js';
import { Box, boxOf } from './box.js';

export type MarkIntent = 'change' | 'remove' | 'question' | 'fine';

export const MARK_INTENTS: readonly MarkIntent[] = ['change', 'remove', 'question', 'fine'];

// open-color shades 0, 2, 4, 6 and 8 of each family, as `COLOR_PALETTE` in
// @excalidraw/excalidraw 0.18 builds them (ELEMENTS_PALETTE_SHADE_INDEXES). The last shade of
// each is the picker's one-click swatch.
const FAMILIES: Record<MarkIntent, readonly string[]> = {
  change: ['#fff5f5', '#ffc9c9', '#ff8787', '#fa5252', '#e03131'], // red
  remove: [
    '#fff9db', '#ffec99', '#ffd43b', '#fab005', '#f08c00', // yellow, whose swatch looks orange
    '#fff4e6', '#ffd8a8', '#ffa94d', '#fd7e14', '#e8590c' // orange
  ],
  question: ['#e7f5ff', '#a5d8ff', '#4dabf7', '#228be6', '#1971c2'], // blue
  fine: ['#ebfbee', '#b2f2bb', '#69db7c', '#40c057', '#2f9e44'] // green
};

// The swatch to name in a legend or a hand-over, one per intent.
export const INTENT_SWATCH: Record<MarkIntent, string> = {
  change: '#e03131',
  remove: '#f08c00',
  question: '#1971c2',
  fine: '#2f9e44'
};

const BY_COLOR = new Map<string, MarkIntent>(
  MARK_INTENTS.flatMap(intent => FAMILIES[intent].map(hex => [hex, intent] as [string, MarkIntent]))
);

// The intent a colour carries, whoever drew it; none for any colour outside the four families.
export function intentOfColor(color: unknown): MarkIntent | undefined {
  if (typeof color !== 'string') return undefined;
  return BY_COLOR.get(color.trim().toLowerCase());
}

// The intent of a mark: its stroke colour, read only when a person drew it.
export function markIntent(el: ServerElement): MarkIntent | undefined {
  if (el.origin !== 'human') return undefined;
  return intentOfColor(el.strokeColor);
}

export function isLegendId(id: unknown): boolean {
  return typeof id === 'string' && (id === 'legend' || id.startsWith('legend-'));
}

function within(outer: Box, inner: Box): boolean {
  return inner.x >= outer.x && inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;
}

// Every element the legend takes: the legend itself, its members (`frameId`), anything drawn
// wholly inside it, and the bound text of any of those. Empty when the scene has no legend.
export function legendElementIds(elements: ServerElement[]): Set<string> {
  const legends = elements.filter(el => isLegendId(el.id));
  const ids = new Set(legends.map(el => el.id));
  if (ids.size === 0) return ids;

  const boxes = legends.map(boxOf).filter(box => box.w > 0 && box.h > 0);
  for (const el of elements) {
    if (ids.has(el.id)) continue;
    if (typeof el.frameId === 'string' && ids.has(el.frameId)) {
      ids.add(el.id);
      continue;
    }
    const box = boxOf(el);
    if ((box.w > 0 || box.h > 0) && boxes.some(legend => within(legend, box))) ids.add(el.id);
  }
  for (const el of elements) {
    if (el.type === 'text' && typeof el.containerId === 'string' && ids.has(el.containerId)) {
      ids.add(el.id);
    }
  }
  return ids;
}
