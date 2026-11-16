// The fixed point of an elbowed arrow's binding (T-024). Ours; no imports, so the canvas page
// (frontend/src/utils/scene.ts) and the export (src/core/expand-elements.ts) share it.
//
// Excalidraw binds an elbowed arrow to a shape at a fixed point: where on the shape's box the
// arrow meets it, as a fraction of the box. When it restores a scene it drops the binding of an
// elbowed arrow whose `fixedPoint` is null (`repairBinding`, Excalidraw 0.18.1). This toolkit
// wrote exactly that: an export of an agent's elbowed arrow, bound by `start`/`end` refs, carried
// `fixedPoint: null`. So a tab that loaded the export, or a scene imported from it, unbound the
// arrow, and its next sync reported "re-bound … ⇒ nothing, by human" while the flow left the
// reading. A plain arrow binds without a fixed point, which is why only elbowed ones broke.

type Point = [number, number];

interface BoxLike {
  x: number;
  y: number;
  width?: number | null;
  height?: number | null;
  angle?: number | null;
}

// Where `point` meets `shape`, as Excalidraw computes it from a snapped point
// (`calculateFixedPointForElbowArrowBinding`): the point turned back by the shape's angle about
// its centre, then divided by the shape's size. A ratio within 1e-4 of 0.5 becomes 0.5001, as
// `normalizeFixedPoint` does. Null for a shape with no size.
export function elbowFixedPoint(point: { x: number; y: number }, shape: BoxLike): Point | null {
  const w = shape.width ?? 0;
  const h = shape.height ?? 0;
  if (!w || !h) return null;
  const cx = shape.x + w / 2;
  const cy = shape.y + h / 2;
  const turn = -(shape.angle ?? 0);
  const dx = point.x - cx;
  const dy = point.y - cy;
  const ux = cx + dx * Math.cos(turn) - dy * Math.sin(turn);
  const uy = cy + dx * Math.sin(turn) + dy * Math.cos(turn);
  const nudge = (ratio: number) => (Math.abs(ratio - 0.5) < 1e-4 ? 0.5001 : ratio);
  return [nudge((ux - shape.x) / w), nudge((uy - shape.y) / h)];
}

// Gives every binding of an elbowed arrow that has no fixed point the one its endpoint implies.
// Elements are Excalidraw-shaped (x, y, points relative to x/y, startBinding, endBinding).
// Everything else is returned as it was; an element is copied only when a binding changes.
export function fillElbowFixedPoints<T extends Record<string, any>>(elements: readonly T[]): T[] {
  const byId = new Map<string, Record<string, any>>(elements.map(el => [el.id, el]));
  return elements.map(el => {
    if (el.type !== 'arrow' || !el.elbowed || !Array.isArray(el.points) || el.points.length < 2) {
      return el;
    }
    const fill = (binding: any, point: unknown) => {
      if (!binding || binding.fixedPoint != null || !Array.isArray(point)) return binding;
      const shape = byId.get(binding.elementId);
      if (!shape) return binding;
      const fixedPoint = elbowFixedPoint({ x: el.x + Number(point[0]), y: el.y + Number(point[1]) }, shape as BoxLike);
      return fixedPoint ? { ...binding, fixedPoint } : binding;
    };
    const startBinding = fill(el.startBinding, el.points[0]);
    const endBinding = fill(el.endBinding, el.points[el.points.length - 1]);
    if (startBinding === el.startBinding && endBinding === el.endBinding) return el;
    return { ...el, startBinding, endBinding };
  });
}
