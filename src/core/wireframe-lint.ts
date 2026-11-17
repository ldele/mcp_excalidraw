// The geometry lint (ADR-002, SPEC-008): does this drawing follow the conventions it was drawn
// against, and where is it a few pixels from a different reading?
//
// It reads the reader's own model, never the raw scene, so it cannot disagree with the reader
// about what contains what or which boxes share a row; the thresholds are the reader's, from
// reader-rules.ts. An `error` changes what the reading is; an `advisory` is house style that reads
// right either way. Every tolerance below is recorded with its evidence in SPEC-008 § Calibration.
//
// The finding's shape is a contract (ADR-002): a renamed `ruleId` breaks whoever consumes it.

import { ServerElement } from '../types.js';
import { Box, boxOf } from './box.js';
import type { WireframeNode } from './wireframe.js';
import {
  CONTAINMENT_TOLERANCE, EDGE_TOLERANCE, BAR_MAX_HEIGHT_RATIO, BAR_MIN_WIDTH_RATIO,
  SIDEBAR_MAX_WIDTH_RATIO, SIDEBAR_MIN_HEIGHT_RATIO, HEADING_MIN_FONT_SIZE, TICKBOX_MAX_SIZE,
  DIVIDER_MAX_THICKNESS, rowOverlapRatio, isSquarish, declaredRole
} from './reader-rules.js';

export type LintSeverity = 'error' | 'advisory';

export type LintRule =
  | 'containment-near-miss'
  | 'row-split'
  | 'bar-short'
  | 'threshold-edge'
  | 'oversized-annotation'
  | 'frame-overflow'
  | 'sibling-overlap'
  | 'small-text';

export interface LintFinding {
  ruleId: LintRule;
  severity: LintSeverity;
  elementId: string;
  // The other element the finding is about, when there is one: the screen a near miss sits
  // outside, the box a row split against.
  relatedId?: string;
  message: string;
  // The value that triggered it, in the unit the message gives (px, a ratio, a count).
  measured: number;
}

// SPEC-008 § Calibration.
const NEAR_MISS_MAX = 20; // px outside a container that still reads as a slip, not a placement
const BAND_MIN_SPAN = 0.6; // a band spanning less than this of its edge is a card by intent
const THRESHOLD_MARGIN = 1; // px past an inference threshold that is still "almost"
const SMALL_TEXT_MIN = 10; // px; conventions § 3 allow 10–11 for micro-labels
// Two boxes are a ragged row only when they are of a size: a short item grazing a panel three
// times its height in the next column is two columns, not a row. Set from the misfires on a real
// drawing, 2026-11-17 (the shorter at most 0.57 of the taller) against the designed case (1.0).
const ROW_MIN_HEIGHT_RATIO = 0.75;

const round = (n: number): number => Math.round(n * 100) / 100;
const pct = (n: number): string => `${Math.round(n * 100)}%`;
const area = (b: Box): number => Math.max(0, b.w) * Math.max(0, b.h);

// How far `inner` reaches outside `outer`, on its worst side; 0 when it is inside.
function excess(inner: Box, outer: Box): number {
  return Math.max(
    0,
    outer.x - inner.x,
    outer.y - inner.y,
    inner.x + inner.w - (outer.x + outer.w),
    inner.y + inner.h - (outer.y + outer.h)
  );
}

function overlap(a: Box, b: Box): { w: number; h: number } {
  return {
    w: Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x),
    h: Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  };
}

function lintSiblings(siblings: WireframeNode[], out: LintFinding[]): void {
  for (let i = 0; i < siblings.length; i++) {
    for (let j = i + 1; j < siblings.length; j++) {
      const first = siblings[i]!;
      const later = siblings[j]!;
      const o = overlap(first.box, later.box);

      if (o.w > 0 && o.h > 0) {
        // The smaller is the one that missed; on a tie, the later in reading order.
        const [inner, outer] = area(later.box) <= area(first.box) ? [later, first] : [first, later];
        const out_ = excess(inner.box, outer.box);
        const fits = inner.box.w <= outer.box.w + CONTAINMENT_TOLERANCE &&
          inner.box.h <= outer.box.h + CONTAINMENT_TOLERANCE;
        if (fits && out_ > CONTAINMENT_TOLERANCE && out_ <= NEAR_MISS_MAX) {
          out.push({
            ruleId: 'containment-near-miss', severity: 'error',
            elementId: inner.id, relatedId: outer.id, measured: round(out_),
            message: `[${inner.id}] is ${round(out_)}px outside [${outer.id}]: it reads beside it, ` +
              'not inside. Move it fully inside.'
          });
        } else if (Math.min(o.w, o.h) > CONTAINMENT_TOLERANCE) {
          // Within the reader's own containment slack, two boxes touch rather than overlap: a
          // heading's measured box and the note under it meet by 0.6px on every screen of a real
          // drawing (2026-11-17).
          const by = round(Math.min(o.w, o.h));
          out.push({
            ruleId: 'sibling-overlap', severity: 'advisory',
            elementId: inner.id, relatedId: outer.id, measured: by,
            message: `[${inner.id}] overlaps [${outer.id}] by ${by}px, and neither holds the other.`
          });
        }
        continue;
      }

      // Side by side (no horizontal overlap) yet split into two rows by the reader.
      const heights = Math.min(first.box.h, later.box.h) / Math.max(first.box.h, later.box.h);
      if (o.w <= 0 && heights >= ROW_MIN_HEIGHT_RATIO) {
        const ratio = rowOverlapRatio(
          { top: first.box.y, bottom: first.box.y + first.box.h },
          later.box
        );
        if (ratio > 0 && ratio <= 0.5) {
          out.push({
            ruleId: 'row-split', severity: 'error',
            elementId: later.id, relatedId: first.id, measured: round(ratio),
            message: `[${later.id}] overlaps [${first.id}] by ${pct(ratio)} of its height but reads ` +
              'as a new row: give them one y.'
          });
        }
      }
    }
  }
}

function lintBand(node: WireframeNode, parent: WireframeNode, out: LintFinding[]): void {
  // A band is a shape. A card's heading text flush to the card's top is a heading, and the
  // reader never makes text a header (2026-11-17, six misfires on a real drawing).
  if (node.element.type !== 'rectangle') return;
  if (declaredRole(node.element)) return;
  if (node.role === 'header' || node.role === 'footer' || node.role === 'sidebar') return;
  const { box } = node;
  const p = parent.box;
  if (box.w < 100) return;

  const flushTop = Math.abs(box.y - p.y) <= EDGE_TOLERANCE;
  const flushBottom = Math.abs(box.y + box.h - (p.y + p.h)) <= EDGE_TOLERANCE;
  const flushLeft = Math.abs(box.x - p.x) <= EDGE_TOLERANCE;
  const flushRight = Math.abs(box.x + box.w - (p.x + p.w)) <= EDGE_TOLERANCE;

  const widthSpan = box.w / p.w;
  if ((flushTop || flushBottom) && box.h <= p.h * BAR_MAX_HEIGHT_RATIO && widthSpan >= BAND_MIN_SPAN &&
      !(flushLeft && flushRight && widthSpan >= BAR_MIN_WIDTH_RATIO)) {
    const edge = flushTop ? 'top' : 'bottom';
    out.push({
      ruleId: 'bar-short', severity: 'error', elementId: node.id, relatedId: parent.id,
      measured: round(widthSpan),
      message: `[${node.id}] is flush to the ${edge} of [${parent.id}] but spans ${pct(widthSpan)} of ` +
        `its width: it reads as ${node.role}, not ${flushTop ? 'header' : 'footer'}. Pin it to both sides.`
    });
    return;
  }

  const heightSpan = box.h / p.h;
  if ((flushLeft || flushRight) && box.w <= p.w * SIDEBAR_MAX_WIDTH_RATIO && heightSpan >= BAND_MIN_SPAN &&
      !(flushTop && flushBottom && heightSpan >= SIDEBAR_MIN_HEIGHT_RATIO)) {
    out.push({
      ruleId: 'bar-short', severity: 'error', elementId: node.id, relatedId: parent.id,
      measured: round(heightSpan),
      message: `[${node.id}] is flush to the ${flushLeft ? 'left' : 'right'} of [${parent.id}] but spans ` +
        `${pct(heightSpan)} of its height: it reads as ${node.role}, not sidebar. Pin it top to bottom.`
    });
  }
}

function lintThresholds(node: WireframeNode, out: LintFinding[]): void {
  const el = node.element as ServerElement & { fontSize?: number };
  if (declaredRole(el)) return;
  const { box } = node;

  if (el.type === 'text') {
    const size = el.fontSize;
    if (typeof size === 'number' && size < HEADING_MIN_FONT_SIZE && size >= HEADING_MIN_FONT_SIZE - THRESHOLD_MARGIN) {
      out.push({
        ruleId: 'threshold-edge', severity: 'error', elementId: node.id, measured: size,
        message: `[${node.id}] is ${size}px text, just under the ${HEADING_MIN_FONT_SIZE}px a heading ` +
          `needs: it reads as text. Make it ${HEADING_MIN_FONT_SIZE} or clearly smaller.`
      });
    }
    return;
  }

  if ((el.type === 'rectangle' || el.type === 'ellipse') && isSquarish(box) &&
      box.w > TICKBOX_MAX_SIZE && box.w <= TICKBOX_MAX_SIZE + THRESHOLD_MARGIN) {
    const what = el.type === 'ellipse' ? 'radio' : 'checkbox';
    out.push({
      ruleId: 'threshold-edge', severity: 'error', elementId: node.id, measured: round(box.w),
      message: `[${node.id}] is ${round(box.w)}px across, just over the ${TICKBOX_MAX_SIZE}px a ${what} ` +
        `gets: it reads as ${node.role}. Make it ${TICKBOX_MAX_SIZE} or declare a role.`
    });
    return;
  }

  const thin = Math.min(box.w, box.h);
  if (el.type !== 'line' && Math.max(box.w, box.h) >= 40 &&
      thin > DIVIDER_MAX_THICKNESS && thin <= DIVIDER_MAX_THICKNESS + THRESHOLD_MARGIN) {
    out.push({
      ruleId: 'threshold-edge', severity: 'error', elementId: node.id, measured: round(thin),
      message: `[${node.id}] is ${round(thin)}px thin, just over the ${DIVIDER_MAX_THICKNESS}px a divider ` +
        `gets: it reads as ${node.role}. Make it ${DIVIDER_MAX_THICKNESS} or declare a role.`
    });
  }
}

function lintNode(
  node: WireframeNode,
  parent: WireframeNode | undefined,
  frames: Map<string, WireframeNode>,
  out: LintFinding[]
): void {
  const el = node.element as ServerElement & { fontSize?: number };
  if (parent) lintBand(node, parent, out);
  lintThresholds(node, out);

  const frame = typeof el.frameId === 'string' ? frames.get(el.frameId) : undefined;
  if (frame && frame !== node) {
    const beyond = excess(node.box, frame.box);
    if (beyond > CONTAINMENT_TOLERANCE) {
      out.push({
        ruleId: 'frame-overflow', severity: 'advisory', elementId: node.id, relatedId: frame.id,
        measured: round(beyond),
        message: `[${node.id}] reaches ${round(beyond)}px outside its frame [${frame.id}]: the editor ` +
          'hides that part.'
      });
    }
  }

  if (el.type === 'text' && typeof el.fontSize === 'number' && el.fontSize < SMALL_TEXT_MIN) {
    out.push({
      ruleId: 'small-text', severity: 'advisory', elementId: node.id, measured: el.fontSize,
      message: `[${node.id}] is ${el.fontSize}px text, under the ${SMALL_TEXT_MIN}px of the conventions' ` +
        'smallest size.'
    });
  }

  lintSiblings(node.children, out);
  for (const child of node.children) lintNode(child, node, frames, out);
}

// A transparent shape a person drew reads as markup; holding two components, it is more likely
// structure drawn by hand (KI-6).
function lintMarkup(markup: ServerElement[], roots: WireframeNode[], out: LintFinding[]): void {
  const nodes: WireframeNode[] = [];
  const collect = (node: WireframeNode): void => {
    nodes.push(node);
    node.children.forEach(collect);
  };
  roots.forEach(collect);

  for (const mark of markup) {
    if (mark.type !== 'rectangle' && mark.type !== 'ellipse' && mark.type !== 'diamond') continue;
    const box = boxOf(mark);
    const held = nodes.filter(node => {
      const cx = node.box.x + node.box.w / 2;
      const cy = node.box.y + node.box.h / 2;
      return cx >= box.x && cx <= box.x + box.w && cy >= box.y && cy <= box.y + box.h;
    }).length;
    if (held >= 2) {
      out.push({
        ruleId: 'oversized-annotation', severity: 'error', elementId: mark.id, measured: held,
        message: `[${mark.id}] is a transparent ${mark.type} a person drew, holding ${held} components: ` +
          'it reads as markup. If it is structure, give it a fill or draw it as a frame.'
      });
    }
  }
}

// Every finding on a read wireframe: `roots` in reading order, and the markup the reading lists.
export function lintWireframe(roots: WireframeNode[], markup: ServerElement[]): LintFinding[] {
  const out: LintFinding[] = [];
  const frames = new Map(
    roots.filter(node => node.element.type === 'frame').map(node => [node.id, node])
  );
  lintSiblings(roots, out);
  for (const root of roots) lintNode(root, undefined, frames, out);
  lintMarkup(markup, roots, out);
  return out;
}

// The findings as text for `wireframe --lint`: errors first, one line each.
export function formatLint(findings: LintFinding[]): string {
  if (findings.length === 0) return 'No findings: the drawing follows the conventions the lint checks.';
  const errors = findings.filter(f => f.severity === 'error');
  const advisories = findings.filter(f => f.severity === 'advisory');
  const lines = [
    '## Drawing lint',
    `${errors.length} error${errors.length === 1 ? '' : 's'} (each changes what the reading is), ` +
      `${advisories.length} advisor${advisories.length === 1 ? 'y' : 'ies'} (house style).`,
    ''
  ];
  for (const f of [...errors, ...advisories]) {
    // Every message opens with the element's id, `[id] …`.
    lines.push(`  ${f.severity}  ${f.ruleId}  ${f.message}`);
  }
  return lines.join('\n');
}
