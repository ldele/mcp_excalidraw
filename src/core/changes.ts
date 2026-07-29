import {
  ServerElement,
  ChangeRecord,
  ChangeOrigin,
  ExcalidrawElementType
} from '../types.js';

// ─── Canonical form ────────────────────────────────────────────
//
// Comparing raw elements does not work. Excalidraw renormalizes whatever the
// agent writes: a shape's `label` becomes a separate bound text child, an
// arrow's `start`/`end` become `startBinding`/`endBinding`, and `seed`,
// `versionNonce` and `updated` churn on every internal touch. Diffing raw
// fields would report Excalidraw's own bookkeeping as human design edits.
//
// So every comparison runs over a canonical projection: the properties a
// designer can actually perceive, resolved to one shape regardless of which
// representation produced them.

export interface CanonicalElement {
  [field: string]: unknown;
}

// Bound text children are not tracked in their own right — their content is
// reported as their container's label, so editing a button's caption reads as
// "the button changed", not "an unrelated text element changed".
export function isChangeTracked(el: ServerElement): boolean {
  return !(el.type === 'text' && !!el.containerId);
}

// containerId → text of the bound child, so resolving labels across a whole
// scene stays linear instead of rescanning the context for every element.
export function buildBoundLabelIndex(context: Map<string, ServerElement>): Map<string, string> {
  const index = new Map<string, string>();
  for (const el of context.values()) {
    if (el.type !== 'text' || !el.containerId) continue;
    const text = (el.text || '').trim();
    if (text) index.set(el.containerId, text);
  }
  return index;
}

// The visible text of an element, wherever it happens to live: its own text,
// the agent-format `label`, or a bound text child pointing back at it.
export function effectiveLabel(
  el: ServerElement,
  context: Map<string, ServerElement>,
  boundLabels?: Map<string, string>
): string | undefined {
  const own = el.type === 'text' ? el.text : el.label?.text;
  if (typeof own === 'string' && own.trim()) return own.trim();

  if (boundLabels) return boundLabels.get(el.id);

  for (const other of context.values()) {
    if (other.type === 'text' && other.containerId === el.id) {
      const text = (other.text || '').trim();
      if (text) return text;
    }
  }
  return undefined;
}

function normalizePoints(points: unknown): [number, number][] | null {
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

function bindingTarget(binding: unknown, ref: unknown): string | null {
  const fromBinding = (binding as any)?.elementId;
  if (typeof fromBinding === 'string') return fromBinding;
  const fromRef = (ref as any)?.id;
  return typeof fromRef === 'string' ? fromRef : null;
}

export function canonicalizeElement(
  el: ServerElement,
  context: Map<string, ServerElement>,
  boundLabels?: Map<string, string>
): CanonicalElement {
  const anyEl = el as any;
  return {
    type: el.type,
    x: el.x,
    y: el.y,
    width: el.width ?? 0,
    height: el.height ?? 0,
    angle: el.angle ?? 0,
    points: normalizePoints(anyEl.points),
    strokeColor: el.strokeColor ?? null,
    backgroundColor: el.backgroundColor ?? null,
    fillStyle: el.fillStyle ?? null,
    strokeWidth: el.strokeWidth ?? null,
    strokeStyle: el.strokeStyle ?? null,
    roughness: el.roughness ?? null,
    opacity: el.opacity ?? null,
    roundness: anyEl.roundness?.type ?? null,
    label: effectiveLabel(el, context, boundLabels) ?? null,
    fontSize: anyEl.fontSize ?? null,
    fontFamily: anyEl.fontFamily ?? null,
    textAlign: anyEl.textAlign ?? null,
    containerId: el.containerId ?? null,
    groupIds: [...(el.groupIds ?? [])].sort(),
    frameId: el.frameId ?? null,
    startTarget: bindingTarget(anyEl.startBinding, anyEl.start),
    endTarget: bindingTarget(anyEl.endBinding, anyEl.end),
    startArrowhead: anyEl.startArrowhead ?? null,
    endArrowhead: anyEl.endArrowhead ?? null,
    locked: el.locked ?? false,
    link: el.link ?? null
  };
}

// Sub-pixel deltas are float noise from Excalidraw's own maths, not an edit.
const NUMERIC_TOLERANCE = 0.5;

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  // null and undefined both mean "unset" across the REST/WS boundary
  if (a == null || b == null) return a == null && b == null;
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < NUMERIC_TOLERANCE;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => valuesEqual(item, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
    for (const key of keys) {
      if (!valuesEqual((a as any)[key], (b as any)[key])) return false;
    }
    return true;
  }
  return false;
}

export interface FieldDelta {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

// Compare two canonical projections. Returns null when nothing a designer
// would notice has changed.
export function diffCanonical(
  before: CanonicalElement,
  after: CanonicalElement
): FieldDelta | null {
  const beforeDelta: Record<string, unknown> = {};
  const afterDelta: Record<string, unknown> = {};
  let changed = false;

  const fields = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const field of fields) {
    if (field === 'type') continue;
    if (valuesEqual(before[field], after[field])) continue;
    beforeDelta[field] = before[field];
    afterDelta[field] = after[field];
    changed = true;
  }

  if (!changed) return null;

  // A delta has to be self-describing: reporting "moved down 60px" needs the
  // x that did not move, and "resized" needs the width that stayed put.
  // Without the companion, the report renders an em-dash where a number
  // belongs.
  for (const pair of [['x', 'y'], ['width', 'height']]) {
    if (!pair.some(field => field in afterDelta)) continue;
    for (const field of pair) {
      if (field in afterDelta) continue;
      beforeDelta[field] = before[field];
      afterDelta[field] = after[field];
    }
  }

  return { before: beforeDelta, after: afterDelta };
}

// ─── Labels for display ────────────────────────────────────────

export function buildContext(allElements: ServerElement[]): Map<string, ServerElement> {
  return new Map(allElements.map(el => [el.id, el]));
}

function truncate(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}

function describeElement(
  el: ServerElement | undefined,
  id: string,
  context: Map<string, ServerElement>,
  fallbackType?: ExcalidrawElementType,
  fallbackLabel?: string
): string {
  const type = el?.type ?? fallbackType ?? 'element';
  const label = (el ? effectiveLabel(el, context) : undefined) ?? fallbackLabel;
  const quoted = label ? ` "${truncate(label, 60)}"` : '';
  return `[${id}] ${type}${quoted}`;
}

// ─── Annotation attribution ────────────────────────────────────
//
// The point of the review loop: when a human scribbles "make this primary"
// next to a button, the agent should receive that as feedback *on the button*,
// not as an orphan text element at (420, 300).

// Beyond this many pixels a nearby note is probably about something else.
const ANNOTATION_RADIUS = 260;
// Fraction of a candidate's area that must fall inside a circled/boxed
// annotation before we call it "encloses".
const ENCLOSE_RATIO = 0.6;

export type AnnotationRelation = 'points-at' | 'encloses' | 'inside' | 'near';

export interface AnnotationLink {
  targetId: string;
  relation: AnnotationRelation;
  distance: number;
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
  return { x: el.x, y: el.y, w: el.width || 0, h: el.height || 0 };
}

function centerOf(box: Box): { x: number; y: number } {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

function containsPoint(box: Box, x: number, y: number): boolean {
  return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
}

function intersectionArea(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

// Shortest gap between two boxes (0 when they touch or overlap).
function edgeDistance(a: Box, b: Box): number {
  const dx = Math.max(0, Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)));
  const dy = Math.max(0, Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
  return Math.round(Math.hypot(dx, dy));
}

// The classic markup vocabulary: a sticky note, a scribble, a circle round
// something, an arrow pointing at it. A new *filled* rectangle is more likely
// a new wireframe element than a comment, so it is not attributed.
export function looksLikeAnnotation(el: ServerElement): boolean {
  if (el.type === 'text') return !el.containerId;
  if (el.type === 'freedraw' || el.type === 'arrow' || el.type === 'line') return true;
  if (el.type === 'ellipse' || el.type === 'rectangle' || el.type === 'diamond') {
    const bg = el.backgroundColor;
    return !bg || bg === 'transparent';
  }
  return false;
}

// Elements that hold other elements: screen frames, cards, background zones.
// They are structure, not subject matter — a note *beside* a big panel is
// almost always about something inside it, so containers are only ever
// attributed to when the annotation sits on or encircles them, never merely
// because they happen to be the closest edge.
export function findContainers(candidates: ServerElement[]): Set<string> {
  const boxes = candidates.map(el => ({ id: el.id, box: boxOf(el) }));
  const containers = new Set<string>();

  for (const outer of boxes) {
    let held = 0;
    for (const inner of boxes) {
      if (inner.id === outer.id) continue;
      const center = centerOf(inner.box);
      if (containsPoint(outer.box, center.x, center.y)) held++;
      if (held >= 2) {
        containers.add(outer.id);
        break;
      }
    }
  }

  return containers;
}

// Find what a human's annotation is talking about.
export function attributeAnnotation(
  annotation: ServerElement,
  candidates: ServerElement[],
  containerIds: Set<string> = findContainers(candidates)
): AnnotationLink | null {
  const anyEl = annotation as any;
  // An arrow bound to a shape names its target outright — trust it.
  const bindings = [
    bindingTarget(anyEl.endBinding, anyEl.end),
    bindingTarget(anyEl.startBinding, anyEl.start)
  ].filter((id): id is string => typeof id === 'string');
  for (const boundId of bindings) {
    if (candidates.some(c => c.id === boundId)) {
      return { targetId: boundId, relation: 'points-at', distance: 0 };
    }
  }

  const annotationBox = boxOf(annotation);
  const annotationCenter = centerOf(annotationBox);

  let enclosed: AnnotationLink | null = null;
  let inside: AnnotationLink | null = null;
  let onContainer: AnnotationLink | null = null;
  let nearest: AnnotationLink | null = null;
  let enclosedArea = Infinity;
  let insideArea = Infinity;
  let containerArea = Infinity;

  for (const candidate of candidates) {
    if (candidate.id === annotation.id) continue;
    const candidateBox = boxOf(candidate);
    const candidateArea = candidateBox.w * candidateBox.h;
    if (candidateArea <= 0) continue;

    const isContainer = containerIds.has(candidate.id);

    // Circled / boxed: most of the candidate sits inside the annotation.
    if (annotationBox.w > 0 && annotationBox.h > 0 && !isContainer) {
      const covered = intersectionArea(annotationBox, candidateBox) / candidateArea;
      if (covered >= ENCLOSE_RATIO && candidateArea < enclosedArea) {
        enclosed = { targetId: candidate.id, relation: 'encloses', distance: 0 };
        enclosedArea = candidateArea;
      }
    }

    // Written on top of: the note's centre lands within the candidate.
    // Smallest wins, so a note on a card beats the screen frame holding it.
    if (containsPoint(candidateBox, annotationCenter.x, annotationCenter.y)) {
      if (isContainer) {
        if (candidateArea < containerArea) {
          onContainer = { targetId: candidate.id, relation: 'inside', distance: 0 };
          containerArea = candidateArea;
        }
      } else if (candidateArea < insideArea) {
        inside = { targetId: candidate.id, relation: 'inside', distance: 0 };
        insideArea = candidateArea;
      }
    }

    if (isContainer) continue;

    const gap = edgeDistance(annotationBox, candidateBox);
    if (gap <= ANNOTATION_RADIUS && (!nearest || gap < nearest.distance)) {
      nearest = { targetId: candidate.id, relation: 'near', distance: gap };
    }
  }

  // A concrete component always beats the panel it sits on: a note dropped in
  // the whitespace of a screen is about the control it is next to, and only
  // falls back to "sits on <screen>" when nothing specific is in reach.
  return enclosed ?? inside ?? nearest ?? onContainer;
}

// Elements an annotation can be *about*: real scene content, not the markup
// that just arrived and not the bound text children that belong to a shape.
function annotationTargets(allElements: ServerElement[], excludeIds: Set<string>): ServerElement[] {
  return allElements.filter(el => {
    if (excludeIds.has(el.id)) return false;
    if (el.type === 'text' && el.containerId) return false;
    const box = boxOf(el);
    return box.w > 0 && box.h > 0;
  });
}

// ─── Phrasing an update ────────────────────────────────────────

function formatNumber(value: unknown): string {
  return typeof value === 'number' ? String(Math.round(value)) : String(value ?? '—');
}

function pointCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

// Turn a canonical delta into the sentences a designer would use.
export function describeFieldDelta(delta: FieldDelta): string[] {
  const { before, after } = delta;
  const phrases: string[] = [];
  const touched = new Set([...Object.keys(before), ...Object.keys(after)]);

  if (touched.has('x') || touched.has('y')) {
    const fromX = (before.x as number) ?? (after.x as number) ?? 0;
    const fromY = (before.y as number) ?? (after.y as number) ?? 0;
    const toX = (after.x as number) ?? fromX;
    const toY = (after.y as number) ?? fromY;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const moves: string[] = [];
    if (Math.abs(dx) >= 1) moves.push(`${dx > 0 ? 'right' : 'left'} ${Math.abs(Math.round(dx))}px`);
    if (Math.abs(dy) >= 1) moves.push(`${dy > 0 ? 'down' : 'up'} ${Math.abs(Math.round(dy))}px`);
    if (moves.length > 0) {
      phrases.push(
        `moved ${moves.join(', ')} — (${formatNumber(fromX)}, ${formatNumber(fromY)}) → ` +
        `(${formatNumber(toX)}, ${formatNumber(toY)})`
      );
    }
  }

  if (touched.has('width') || touched.has('height')) {
    const fromW = formatNumber(before.width ?? after.width);
    const fromH = formatNumber(before.height ?? after.height);
    const toW = formatNumber(after.width ?? before.width);
    const toH = formatNumber(after.height ?? before.height);
    phrases.push(`resized ${fromW}x${fromH} → ${toW}x${toH}`);
  }

  if (touched.has('label')) {
    const from = before.label as string | null | undefined;
    const to = after.label as string | null | undefined;
    if (!from && to) phrases.push(`labelled "${truncate(to, 60)}"`);
    else if (from && !to) phrases.push(`label removed (was "${truncate(from, 40)}")`);
    else phrases.push(`text "${truncate(from ?? '', 40)}" → "${truncate(to ?? '', 40)}"`);
  }

  if (touched.has('backgroundColor')) {
    phrases.push(`background ${before.backgroundColor ?? 'unset'} → ${after.backgroundColor ?? 'unset'}`);
  }
  if (touched.has('strokeColor')) {
    phrases.push(`stroke ${before.strokeColor ?? 'unset'} → ${after.strokeColor ?? 'unset'}`);
  }
  if (touched.has('strokeStyle') || touched.has('strokeWidth') || touched.has('fillStyle') ||
      touched.has('roughness') || touched.has('roundness')) {
    phrases.push('restyled (stroke / fill properties)');
  }
  if (touched.has('fontSize')) {
    phrases.push(`font size ${formatNumber(before.fontSize)} → ${formatNumber(after.fontSize)}`);
  }
  if (touched.has('fontFamily') || touched.has('textAlign')) {
    phrases.push('text styling changed');
  }
  if (touched.has('opacity')) {
    phrases.push(`opacity ${formatNumber(before.opacity)} → ${formatNumber(after.opacity)}`);
  }
  if (touched.has('locked')) {
    phrases.push(after.locked ? 'locked' : 'unlocked');
  }
  if (touched.has('points')) {
    const from = pointCount(before.points);
    const to = pointCount(after.points);
    phrases.push(from === to ? 'path reshaped' : `path reshaped (${from} → ${to} points)`);
  }
  if (touched.has('startTarget') || touched.has('endTarget')) {
    const from = [before.startTarget, before.endTarget].filter(Boolean).join(' → ') || 'nothing';
    const to = [after.startTarget, after.endTarget].filter(Boolean).join(' → ') || 'nothing';
    phrases.push(`re-bound: ${from} ⇒ ${to}`);
  }
  if (touched.has('startArrowhead') || touched.has('endArrowhead')) {
    phrases.push('arrowheads changed');
  }
  if (touched.has('containerId') || touched.has('groupIds') || touched.has('frameId')) {
    phrases.push('re-parented (container / group / frame)');
  }
  if (touched.has('link')) {
    phrases.push(`link ${before.link ?? 'none'} → ${after.link ?? 'none'}`);
  }

  if (phrases.length === 0) {
    phrases.push(`changed: ${[...touched].join(', ')}`);
  }
  return phrases;
}

// ─── The report ────────────────────────────────────────────────

export interface ChangeSet {
  since: number;
  rev: number;
  truncated: boolean;
  reset: boolean;
  records: ChangeRecord[];
}

const RELATION_PHRASE: Record<AnnotationRelation, string> = {
  'points-at': 'points at',
  encloses: 'circles / marks',
  inside: 'sits on',
  near: 'annotates'
};

function originLabel(origin: ChangeOrigin): string {
  return origin === 'human' ? 'human' : 'agent';
}

interface FoldedUpdate {
  record: ChangeRecord;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

// Collapse the raw log per element: dragging a shape emits a record per sync,
// and the agent wants the net effect ("moved right 120px"), not 30 steps.
function foldRecords(records: ChangeRecord[]): {
  added: ChangeRecord[];
  updates: Map<string, FoldedUpdate>;
  deleted: ChangeRecord[];
} {
  const added: ChangeRecord[] = [];
  const deleted: ChangeRecord[] = [];
  const updates = new Map<string, FoldedUpdate>();

  for (const record of records) {
    if (record.kind === 'add') {
      // Re-added after a delete inside the window: keep it as an addition.
      const deletedIndex = deleted.findIndex(r => r.id === record.id);
      if (deletedIndex !== -1) deleted.splice(deletedIndex, 1);
      added.push(record);
      continue;
    }

    if (record.kind === 'delete') {
      updates.delete(record.id);
      // Created and removed within the same window is a no-op.
      const addedIndex = added.findIndex(r => r.id === record.id);
      if (addedIndex !== -1) {
        added.splice(addedIndex, 1);
        continue;
      }
      deleted.push(record);
      continue;
    }

    // An update to something added in this same window is already covered by
    // reporting the addition in its final state.
    if (added.some(r => r.id === record.id)) continue;

    const existing = updates.get(record.id);
    if (existing) {
      // Oldest `before` values win, newest `after` values win — the net effect.
      for (const [field, value] of Object.entries(record.before || {})) {
        if (!(field in existing.before)) existing.before[field] = value;
      }
      Object.assign(existing.after, record.after || {});
      existing.record = record;
    } else {
      updates.set(record.id, {
        record,
        before: { ...(record.before || {}) },
        after: { ...(record.after || {}) }
      });
    }
  }

  // Drop folded updates that cancelled out (dragged away and back again).
  for (const [id, entry] of [...updates]) {
    if (!diffCanonical(entry.before, entry.after)) updates.delete(id);
  }

  return { added, updates, deleted };
}

// Render a change set as the agent-readable design-review report.
export function formatChangeReport(changeSet: ChangeSet, currentElements: ServerElement[]): string {
  const { since, rev, truncated, reset, records } = changeSet;
  const context = buildContext(currentElements);

  const header: string[] = [];
  if (reset) {
    header.push(
      `⚠️  Cursor rev ${since} is ahead of the canvas (now rev ${rev}) — the canvas ` +
      'server restarted and its change history was lost. Treat the scene as new: ' +
      'call describe_scene for the full current state.'
    );
    header.push('');
  }

  if (records.length === 0) {
    return [
      ...header,
      `## Canvas changes since rev ${since}`,
      '',
      'No changes — the canvas is exactly as you left it.',
      '',
      `Cursor: rev ${rev}`
    ].join('\n');
  }

  const { added, updates, deleted } = foldRecords(records);
  const addedIds = new Set(added.map(r => r.id));
  const targets = annotationTargets(currentElements, addedIds);
  // Computed once for the whole report rather than per annotation.
  const containerIds = findContainers(targets);

  const allFolded = [...added, ...deleted, ...[...updates.values()].map(u => u.record)];
  const humanCount = allFolded.filter(r => r.origin === 'human').length;
  const totalCount = allFolded.length;

  const lines: string[] = [...header];
  lines.push(`## Canvas changes (rev ${since} → ${rev})`);

  if (totalCount === 0) {
    lines.push('');
    lines.push('Net effect: nothing changed (edits cancelled each other out).');
    lines.push('');
    lines.push(`Cursor: rev ${rev}`);
    return lines.join('\n');
  }

  lines.push(
    `${totalCount} change${totalCount === 1 ? '' : 's'}: ` +
    `${humanCount} by human, ${totalCount - humanCount} by agent.`
  );

  if (truncated) {
    lines.push('');
    lines.push(
      '⚠️  The change log no longer reaches back to that revision, so this report ' +
      'is partial. Call describe_scene for the full current state.'
    );
  }

  if (added.length > 0) {
    lines.push('');
    lines.push(`### Added (${added.length})`);
    for (const record of added) {
      const el = context.get(record.id);
      const box = el ? boxOf(el) : null;
      const where = box ? ` at (${Math.round(box.x)}, ${Math.round(box.y)})` : '';
      const size = box && box.w > 0 ? ` size ${Math.round(box.w)}x${Math.round(box.h)}` : '';
      lines.push(
        `  ${describeElement(el, record.id, context, record.elementType, record.label)}` +
        `${where}${size} — by ${originLabel(record.origin)}`
      );

      if (el && record.origin === 'human' && looksLikeAnnotation(el)) {
        const link = attributeAnnotation(el, targets, containerIds);
        if (link) {
          const target = context.get(link.targetId);
          const gap = link.relation === 'near' && link.distance > 0 ? ` (${link.distance}px away)` : '';
          lines.push(
            `      ↳ ${RELATION_PHRASE[link.relation]} ` +
            `${describeElement(target, link.targetId, context)}${gap}`
          );
        }
      }
    }
  }

  if (updates.size > 0) {
    lines.push('');
    lines.push(`### Edited (${updates.size})`);
    for (const entry of updates.values()) {
      const el = context.get(entry.record.id);
      lines.push(
        `  ${describeElement(el, entry.record.id, context, entry.record.elementType, entry.record.label)}` +
        ` — by ${originLabel(entry.record.origin)}`
      );
      for (const phrase of describeFieldDelta({ before: entry.before, after: entry.after })) {
        lines.push(`      ${phrase}`);
      }
    }
  }

  if (deleted.length > 0) {
    lines.push('');
    lines.push(`### Deleted (${deleted.length})`);
    for (const record of deleted) {
      lines.push(
        `  ${describeElement(undefined, record.id, context, record.elementType, record.label)}` +
        ` — by ${originLabel(record.origin)}`
      );
    }
  }

  lines.push('');
  lines.push(`Cursor: rev ${rev} — pass since=${rev} next time to see only newer changes.`);

  return lines.join('\n');
}
