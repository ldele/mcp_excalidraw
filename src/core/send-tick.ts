// The tick the page's "Send to Claude" button draws in the legend's Send box (ADR-007 option 3).
// Ours; no imports, so the canvas page (frontend/src/App.tsx) and the reading
// (src/core/send-box.ts) share the box's id and the tick's shape.
//
// The button does what a person does by hand: it draws a tick inside the box, and the page's
// ordinary sync carries it to the server as the person's edit. Nothing on the agent's side tells
// the two apart, so the send rule stays one rule. A fresh tick per click, rather than a fill of the
// box, lets a person send again after more marks when no agent has reset the box in between.

export const SEND_BOX_ID = 'legend-send';

// Ticks drawn by the button carry this prefix: a `legend-` id, so a reading that leaves the
// legend out also leaves the tick out.
export const SEND_TICK_PREFIX = 'legend-send-tick-';

// The legend's example tick (markup-legend.json), so the button's mark looks like the key's. The
// first point is the origin: the editor moves a line so it is, and a line stored any other way
// reads as moved, by the person, once a tab has synced it.
export const SEND_TICK_POINTS: ReadonlyArray<readonly [number, number]> = [[0, 0], [5, 6], [14, -7]];
// How far the first point lies below the tick's top edge.
const FIRST_POINT_DROP = 7;
const TICK_WIDTH = 14;
const TICK_HEIGHT = 13;
const TICK_INSET = 14;

interface BoxLike {
  x: number;
  y: number;
  width?: number | null;
  height?: number | null;
}

export interface SendTickSkeleton {
  id: string;
  type: 'line';
  x: number;
  y: number;
  points: Array<[number, number]>;
  strokeColor: string;
  strokeWidth: number;
  backgroundColor: 'transparent';
  roughness: number;
}

// A tick near the box's left edge, centred on its height: left of the label, and its centre well
// inside the box (a tick whose centre falls outside is no send — PR 1 round 2).
export function sendTick(box: BoxLike, suffix: string): SendTickSkeleton {
  const height = box.height ?? 0;
  return {
    id: `${SEND_TICK_PREFIX}${suffix}`,
    type: 'line',
    x: box.x + TICK_INSET,
    y: box.y + (height - TICK_HEIGHT) / 2 + FIRST_POINT_DROP,
    points: SEND_TICK_POINTS.map(([px, py]) => [px, py] as [number, number]),
    strokeColor: '#2f9e44',
    strokeWidth: 2,
    backgroundColor: 'transparent',
    roughness: 0,
  };
}

export const SEND_TICK_SIZE = { width: TICK_WIDTH, height: TICK_HEIGHT };
