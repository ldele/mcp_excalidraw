import { ServerElement, COMPONENT_ROLES, ComponentRole } from '../types.js';
import {
  Box,
  boxOf,
  effectiveLabel,
  buildBoundLabelIndex,
  looksLikeAnnotation,
  attributeAnnotation,
  findContainers,
  AnnotationRelation
} from './changes.js';

// ─── Reading a wireframe as a UI, not as geometry ──────────────
//
// describe_scene answers "what elements are on the canvas". This answers
// "what interface is drawn here": which screens exist, what sits inside what,
// in what order a person reads it, which control leads to which screen, and
// what the human has scribbled on it.
//
// Every role here is inferred from geometry, style and wording — a rectangle
// is never definitively a button. Low-confidence guesses are marked so the
// caller can discount them, and the raw type and size always travel alongside
// the role so nothing is hidden behind the interpretation.

export type { ComponentRole } from '../types.js';

export interface WireframeNode {
  id: string;
  element: ServerElement;
  box: Box;
  role: ComponentRole;
  // true when the role is a soft guess rather than a structural certainty
  inferred: boolean;
  label?: string;
  children: WireframeNode[];
}

export interface WireframeFlow {
  arrowId: string;
  fromId?: string;
  toId?: string;
  label?: string;
  fromScreenId?: string;
  toScreenId?: string;
  navigation: boolean;
}

export interface WireframeMarkup {
  id: string;
  text?: string;
  elementType: string;
  targetId?: string;
  relation?: AnnotationRelation;
  distance: number;
}

export interface WireframeModel {
  roots: WireframeNode[];
  screens: WireframeNode[];
  flows: WireframeFlow[];
  markup: WireframeMarkup[];
  componentCount: number;
}

// ─── Colour ────────────────────────────────────────────────────

function parseHex(color: string | undefined): { r: number; g: number; b: number } | null {
  if (!color) return null;
  const hex = color.trim().replace(/^#/, '');
  const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16)
  };
}

// A fill that reads as deliberate emphasis rather than paper. Near-greys and
// near-whites are surface colours; a hue or a dark tone signals a control.
function isAccentFill(color: string | undefined): boolean {
  if (!color || color === 'transparent') return false;
  const rgb = parseHex(color);
  if (!rgb) return false;
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  return max - min > 25 || max < 120;
}

function hasVisibleFill(el: ServerElement): boolean {
  const bg = el.backgroundColor;
  return !!bg && bg !== 'transparent';
}

function hasBorder(el: ServerElement): boolean {
  const stroke = el.strokeColor;
  return !!stroke && stroke !== 'transparent';
}

// ─── Wording ───────────────────────────────────────────────────

const ACTION_WORDS = [
  'continue', 'submit', 'save', 'cancel', 'next', 'back', 'sign in', 'sign up',
  'log in', 'login', 'logout', 'send', 'search', 'add', 'create', 'delete',
  'remove', 'edit', 'update', 'confirm', 'apply', 'done', 'ok', 'get started',
  'start', 'buy', 'checkout', 'pay', 'subscribe', 'join', 'register', 'upload',
  'download', 'share', 'close', 'open', 'view', 'learn more', 'try', 'retry',
  'reset', 'select', 'choose', 'browse', 'accept', 'decline', 'allow', 'connect'
];

const FIELD_WORDS = [
  'email', 'password', 'username', 'user name', 'name', 'first name', 'last name',
  'search', 'phone', 'address', 'city', 'zip', 'postcode', 'country', 'message',
  'comment', 'description', 'title', 'date', 'card number', 'cvv', 'confirm password',
  'e-mail', 'full name', 'company', 'notes'
];

// Data regions name themselves in one of two ways: by what they are ("Revenue
// chart", "12 rows"), or by what they show ("PSI per feature · 0.25 line"). Only
// the first is inferable — these lists stay generic on purpose, because a word
// list that had to learn one domain's vocabulary to recognise its charts would
// be wrong for every other domain. For the second, declare `role` on the shape.
const CHART_WORDS = [
  'chart', 'charts', 'graph', 'graphs', 'plot', 'plots', 'axis', 'axes',
  'x-axis', 'y-axis', 'series', 'legend', 'histogram', 'scatter', 'sparkline',
  'timeline', 'trend', 'trendline', 'curve', 'pie', 'donut', 'heatmap',
  'gauge', 'barchart', 'linechart'
];

const TABLE_WORDS = [
  'table', 'tables', 'row', 'rows', 'column', 'columns', 'cols', 'grid',
  'spreadsheet', 'record', 'records', 'dataset', 'listing'
];

// Word-level containment, not whole-string equality: these labels are captions
// ("23 rows × 11 columns — max PSI"), not the terse names controls carry.
function mentions(label: string | undefined, words: string[]): boolean {
  if (!label) return false;
  const tokens = label.toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const set = new Set(tokens);
  return words.some(word => set.has(word));
}

// An author who declares a role knows something inference cannot recover.
// Unknown strings fall through to inference rather than erroring — the API
// schema is where a typo gets rejected.
function declaredRole(el: ServerElement): ComponentRole | undefined {
  const raw = (el as { role?: unknown }).role;
  if (typeof raw !== 'string') return undefined;
  const role = raw.trim().toLowerCase() as ComponentRole;
  return (COMPONENT_ROLES as readonly string[]).includes(role) ? role : undefined;
}

// The word budget a control's own wording gets: past this it is prose, and
// prose belongs to content rather than to a button or a field.
const CONTROL_LABEL_MAX_WORDS = 4;

// A label short enough to be a control's prompt. No label counts as terse —
// an unlabelled box gives the reading nothing to argue with.
function isTerse(label: string | undefined): boolean {
  if (!label) return true;
  const words = label.trim().split(/\s+/).filter(word => /[a-z0-9]/i.test(word));
  return words.length <= CONTROL_LABEL_MAX_WORDS;
}

function looksLikeAction(label: string | undefined): boolean {
  if (!label) return false;
  const text = label.toLowerCase().trim();
  if (text.split(/\s+/).length > 4) return false;
  return ACTION_WORDS.some(word => text === word || text.startsWith(word + ' '));
}

// Field labels are noun phrases that end in the thing being asked for:
// "Password", "New password", "Confirm password", "Billing address". Matching
// on the tail rather than the whole string is what stops "Confirm password"
// from reading as the verb "confirm".
function looksLikeField(label: string | undefined): boolean {
  if (!label) return false;
  const text = label.toLowerCase().trim().replace(/[:*]\s*$/, '');
  if (text.endsWith('...') || text.endsWith('…')) return true;
  if (text.startsWith('enter ') || text.startsWith('type ')) return true;
  if (text.split(/\s+/).length > 4) return false;
  return FIELD_WORDS.some(word => text === word || text.endsWith(' ' + word));
}

// ─── Containment ───────────────────────────────────────────────

const CONTAINMENT_TOLERANCE = 2;

function contains(outer: Box, inner: Box): boolean {
  return (
    outer.x - CONTAINMENT_TOLERANCE <= inner.x &&
    outer.y - CONTAINMENT_TOLERANCE <= inner.y &&
    outer.x + outer.w + CONTAINMENT_TOLERANCE >= inner.x + inner.w &&
    outer.y + outer.h + CONTAINMENT_TOLERANCE >= inner.y + inner.h
  );
}

function area(box: Box): number {
  return Math.max(0, box.w) * Math.max(0, box.h);
}

// Nest every element under the smallest element that fully contains it.
// Candidates are ordered by descending area and a parent must be strictly
// larger than its child, so the relation cannot cycle.
function buildTree(nodes: WireframeNode[]): WireframeNode[] {
  const bySize = [...nodes].sort((a, b) => area(b.box) - area(a.box));
  const roots: WireframeNode[] = [];

  for (let i = 0; i < bySize.length; i++) {
    const node = bySize[i]!;
    let parent: WireframeNode | undefined;

    // Everything before `i` is at least as large — scan backwards to meet the
    // tightest container first.
    for (let j = i - 1; j >= 0; j--) {
      const candidate = bySize[j]!;
      if (area(candidate.box) <= area(node.box)) continue;
      if (contains(candidate.box, node.box)) {
        parent = candidate;
        break;
      }
    }

    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
}

// ─── Reading order ─────────────────────────────────────────────

// Two boxes share a row when they overlap vertically by more than half the
// shorter one — how a person's eye groups a row of controls.
function sharesRow(band: { top: number; bottom: number }, box: Box): boolean {
  const overlap = Math.min(band.bottom, box.y + box.h) - Math.max(band.top, box.y);
  if (overlap <= 0) return false;
  const shorter = Math.min(band.bottom - band.top, box.h);
  return shorter <= 0 ? true : overlap / shorter > 0.5;
}

export function inReadingOrder(nodes: WireframeNode[]): WireframeNode[] {
  const sorted = [...nodes].sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
  const rows: { band: { top: number; bottom: number }; items: WireframeNode[] }[] = [];

  for (const node of sorted) {
    const row = rows[rows.length - 1];
    if (row && sharesRow(row.band, node.box)) {
      row.items.push(node);
      row.band.bottom = Math.max(row.band.bottom, node.box.y + node.box.h);
      continue;
    }
    rows.push({
      band: { top: node.box.y, bottom: node.box.y + node.box.h },
      items: [node]
    });
  }

  return rows.flatMap(row => row.items.sort((a, b) => a.box.x - b.box.x));
}

// ─── Role inference ────────────────────────────────────────────

const EDGE_TOLERANCE = 10;
const BAR_MAX_HEIGHT_RATIO = 0.2;
const BAR_MIN_WIDTH_RATIO = 0.8;
const SIDEBAR_MAX_WIDTH_RATIO = 0.35;
const SIDEBAR_MIN_HEIGHT_RATIO = 0.7;
const CONTROL_MAX_HEIGHT = 72;
const HEADING_MIN_FONT_SIZE = 20;
const TICKBOX_MAX_SIZE = 28;
const AVATAR_MAX_SIZE = 72;
const DIVIDER_MAX_THICKNESS = 6;

interface Classification {
  role: ComponentRole;
  inferred: boolean;
}

// Repeated siblings of identical size stacked in a column read as a list —
// the strongest structural signal separating a menu row from a form field.
function stackedTwins(node: WireframeNode, siblings: WireframeNode[]): WireframeNode[] {
  return siblings.filter(other =>
    other.id !== node.id &&
    Math.abs(other.box.w - node.box.w) <= 2 &&
    Math.abs(other.box.h - node.box.h) <= 2 &&
    Math.abs(other.box.x - node.box.x) <= 2 &&
    Math.abs(other.box.y - node.box.y) > 2
  );
}

function hasRowMate(node: WireframeNode, siblings: WireframeNode[]): boolean {
  const band = { top: node.box.y, bottom: node.box.y + node.box.h };
  return siblings.some(other => other.id !== node.id && sharesRow(band, other.box));
}

function classify(
  node: WireframeNode,
  parent: WireframeNode | undefined,
  label: string | undefined,
  siblings: WireframeNode[]
): Classification {
  const el = node.element;
  const { box } = node;
  const hasChildren = node.children.length > 0;

  // Declared beats inferred, always.
  const declared = declaredRole(el);
  if (declared) return { role: declared, inferred: false };

  if (el.type === 'image') return { role: 'image', inferred: false };

  if (el.type === 'text') {
    const fontSize = (el as any).fontSize as number | undefined;
    return fontSize && fontSize >= HEADING_MIN_FONT_SIZE
      ? { role: 'heading', inferred: false }
      : { role: 'text', inferred: false };
  }

  if (el.type === 'line' ||
      ((box.h <= DIVIDER_MAX_THICKNESS || box.w <= DIVIDER_MAX_THICKNESS) &&
       Math.max(box.w, box.h) >= 40)) {
    return { role: 'divider', inferred: false };
  }

  // Bars and rails: full-bleed strips pinned to an edge of their container.
  // "Full-bleed" means flush with both side edges — a bottom-anchored CTA is
  // inset by a margin, and would otherwise read as a footer.
  if (parent && box.w >= 100) {
    const flushLeft = Math.abs(box.x - parent.box.x) <= EDGE_TOLERANCE;
    const flushRight = Math.abs((box.x + box.w) - (parent.box.x + parent.box.w)) <= EDGE_TOLERANCE;
    const spansWidth = flushLeft && flushRight && box.w >= parent.box.w * BAR_MIN_WIDTH_RATIO;
    const isShort = box.h <= parent.box.h * BAR_MAX_HEIGHT_RATIO;
    if (spansWidth && isShort) {
      if (Math.abs(box.y - parent.box.y) <= EDGE_TOLERANCE) {
        return { role: 'header', inferred: false };
      }
      if (Math.abs((box.y + box.h) - (parent.box.y + parent.box.h)) <= EDGE_TOLERANCE) {
        return { role: 'footer', inferred: false };
      }
    }

    const flushTop = Math.abs(box.y - parent.box.y) <= EDGE_TOLERANCE;
    const flushBottom = Math.abs((box.y + box.h) - (parent.box.y + parent.box.h)) <= EDGE_TOLERANCE;
    const spansHeight = flushTop && flushBottom && box.h >= parent.box.h * SIDEBAR_MIN_HEIGHT_RATIO;
    const isNarrow = box.w <= parent.box.w * SIDEBAR_MAX_WIDTH_RATIO;
    if (spansHeight && isNarrow &&
        (Math.abs(box.x - parent.box.x) <= EDGE_TOLERANCE ||
         Math.abs((box.x + box.w) - (parent.box.x + parent.box.w)) <= EDGE_TOLERANCE)) {
      return { role: 'sidebar', inferred: false };
    }
  }

  if (hasChildren) {
    if (!parent) return { role: 'screen', inferred: false };
    // A container holding a couple of things inside a larger container reads
    // as a card; anything bigger is a structural panel.
    return area(box) < area(parent.box) * 0.5
      ? { role: 'card', inferred: true }
      : { role: 'panel', inferred: true };
  }

  // Data regions, before the control check — a wide, short table would
  // otherwise be indistinguishable from a text field on geometry alone.
  if (mentions(label, CHART_WORDS)) return { role: 'chart', inferred: true };
  if (mentions(label, TABLE_WORDS)) return { role: 'table', inferred: true };

  const squarish = box.w > 0 && box.h > 0 && Math.abs(box.w - box.h) / Math.max(box.w, box.h) < 0.25;

  if (el.type === 'ellipse') {
    if (squarish && box.w <= TICKBOX_MAX_SIZE) return { role: 'radio', inferred: true };
    if (squarish && box.w <= AVATAR_MAX_SIZE) {
      // A face sits beside a name; a status glyph stands alone in its row.
      return hasRowMate(node, siblings)
        ? { role: 'avatar', inferred: true }
        : { role: 'icon', inferred: true };
    }
    return { role: 'shape', inferred: false };
  }

  if (squarish && box.w <= TICKBOX_MAX_SIZE) {
    return { role: 'checkbox', inferred: true };
  }
  if (squarish && box.w <= AVATAR_MAX_SIZE && !label) {
    return { role: 'icon', inferred: true };
  }

  // Controls: a wide, short box. Fill and wording separate a button from a
  // field — a button is painted to be pressed, a field is left as paper.
  const isControlSized = box.h <= CONTROL_MAX_HEIGHT && box.w >= box.h * 1.5;
  if (isControlSized) {
    const accent = isAccentFill(el.backgroundColor);
    if (accent) return { role: 'button', inferred: !looksLikeAction(label) };
    // Field before action: "Confirm password" is a field whose first word
    // happens to be a verb, and only an unpainted box gets here anyway.
    if (looksLikeField(label)) return { role: 'input', inferred: true };
    if (looksLikeAction(label)) return { role: 'button', inferred: true };

    const twins = stackedTwins(node, siblings);
    // A plain box stacked under a painted one of the same size is the
    // secondary half of a button pair, not the second row of a list.
    if (twins.some(twin => isAccentFill(twin.element.backgroundColor))) {
      return { role: 'button', inferred: true };
    }
    if (twins.length > 0) return { role: 'list-item', inferred: true };
    // Last resort: a bordered box that could be a field. A field is prompted
    // tersely ("Email", "Run date") or not at all, so a long caption — a
    // sentence, or a row of column headers — vetoes the reading and the box
    // stays content. Deliberately not a width or aspect ceiling: a full-bleed
    // search bar is legitimately wide, and would fail either test.
    if (hasBorder(el) && isTerse(label)) return { role: 'input', inferred: true };
  }

  return { role: 'shape', inferred: false };
}

// ─── Markup ────────────────────────────────────────────────────

// Freehand scribbles are markup wherever they come from. Everything else is
// judged on authorship: once an agent has drawn the wireframe, what a person
// adds on top is comment, not component. When the whole scene is human-drawn
// that signal is meaningless, so it is switched off.
function collectMarkup(
  elements: ServerElement[],
  trustOrigin: boolean
): ServerElement[] {
  return elements.filter(el => {
    if (el.type === 'freedraw') return true;
    if (!trustOrigin) return false;
    return el.origin === 'human' && looksLikeAnnotation(el);
  });
}

// ─── Model ─────────────────────────────────────────────────────

// A tickbox and the words beside it are one control to a reader, so the text
// is folded into the box rather than listed as a separate component.
const CONTROL_LABEL_GAP = 28;

function absorbControlLabels(parent: WireframeNode): void {
  const consumed = new Set<string>();
  const kept: WireframeNode[] = [];

  for (let i = 0; i < parent.children.length; i++) {
    const node = parent.children[i]!;
    if (consumed.has(node.id)) continue;

    const isTickbox = node.role === 'checkbox' || node.role === 'radio';
    const next = parent.children[i + 1];
    if (isTickbox && !node.label && next?.role === 'text' && next.label) {
      const gap = next.box.x - (node.box.x + node.box.w);
      const sameRow = sharesRow({ top: node.box.y, bottom: node.box.y + node.box.h }, next.box);
      if (gap >= -2 && gap <= CONTROL_LABEL_GAP && sameRow) {
        node.label = next.label;
        consumed.add(next.id);
      }
    }

    kept.push(node);
  }

  parent.children = kept;
  parent.children.forEach(absorbControlLabels);
}

// Name a screen the way a person would refer to it: by its own heading, or
// failing that by whatever its header bar says.
function deriveScreenName(screen: WireframeNode): string | undefined {
  let headerText: string | undefined;

  const walk = (node: WireframeNode, insideHeader: boolean): string | undefined => {
    for (const child of node.children) {
      if (child.role === 'heading' && child.label) return child.label;
      const inHeader = insideHeader || child.role === 'header';
      if (inHeader && !headerText && child.label && child.role === 'text') {
        headerText = child.label;
      }
      const found = walk(child, inHeader);
      if (found) return found;
    }
    return undefined;
  };

  return walk(screen, false) ?? headerText;
}

function countNodes(nodes: WireframeNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countNodes(node.children), 0);
}

function deepestNodeAt(nodes: WireframeNode[], x: number, y: number): WireframeNode | undefined {
  for (const node of nodes) {
    const { box } = node;
    if (x < box.x || x > box.x + box.w || y < box.y || y > box.y + box.h) continue;
    return deepestNodeAt(node.children, x, y) ?? node;
  }
  return undefined;
}

function arrowEndpoints(el: ServerElement): { start: [number, number]; end: [number, number] } | null {
  const points = (el as any).points;
  if (!Array.isArray(points) || points.length < 2) return null;
  const first = points[0];
  const last = points[points.length - 1];
  const read = (point: any): [number, number] | null => {
    const px = Array.isArray(point) ? point[0] : point?.x;
    const py = Array.isArray(point) ? point[1] : point?.y;
    return typeof px === 'number' && typeof py === 'number' ? [el.x + px, el.y + py] : null;
  };
  const start = read(first);
  const end = read(last);
  return start && end ? { start, end } : null;
}

function screenAncestorOf(node: WireframeNode, parents: Map<string, WireframeNode>): WireframeNode | undefined {
  let current: WireframeNode | undefined = node;
  let screen: WireframeNode | undefined;
  while (current) {
    if (current.role === 'screen') screen = current;
    current = parents.get(current.id);
  }
  return screen;
}

export function readWireframe(allElements: ServerElement[]): WireframeModel {
  const context = new Map(allElements.map(el => [el.id, el]));
  const boundLabels = buildBoundLabelIndex(context);

  const trustOrigin = allElements.some(el => el.origin === 'agent');
  const markupElements = collectMarkup(allElements, trustOrigin);
  const markupIds = new Set(markupElements.map(el => el.id));

  const connectors = allElements.filter(el => el.type === 'arrow' && !markupIds.has(el.id));
  const connectorIds = new Set(connectors.map(el => el.id));

  // Components: everything that is neither markup, nor a connector, nor a
  // bound label (its text belongs to the shape it labels).
  const componentElements = allElements.filter(el => {
    if (markupIds.has(el.id) || connectorIds.has(el.id)) return false;
    if (el.type === 'text' && el.containerId) return false;
    if (el.type === 'freedraw') return false;
    const box = boxOf(el);
    return box.w > 0 || box.h > 0;
  });

  const nodes: WireframeNode[] = componentElements.map(el => ({
    id: el.id,
    element: el,
    box: boxOf(el),
    role: 'shape',
    inferred: false,
    ...(effectiveLabel(el, context, boundLabels) ? { label: effectiveLabel(el, context, boundLabels) } : {}),
    children: []
  }));

  const roots = buildTree(nodes);

  // Classify top-down so a node can be judged against its container, then put
  // each container's children into reading order.
  const parents = new Map<string, WireframeNode>();
  const assign = (node: WireframeNode, parent: WireframeNode | undefined, siblings: WireframeNode[]): void => {
    if (parent) parents.set(node.id, parent);
    const { role, inferred } = classify(node, parent, node.label, siblings);
    node.role = role;
    node.inferred = inferred;
    node.children = inReadingOrder(node.children);
    for (const child of node.children) assign(child, node, node.children);
  };
  const orderedRoots = inReadingOrder(roots);
  for (const root of orderedRoots) assign(root, undefined, orderedRoots);

  orderedRoots.forEach(absorbControlLabels);

  const screens = orderedRoots.filter(node => node.role === 'screen');
  for (const screen of screens) {
    if (!screen.label) {
      const name = deriveScreenName(screen);
      if (name) screen.label = name;
    }
  }

  const flows: WireframeFlow[] = [];
  for (const arrow of connectors) {
    const anyArrow = arrow as any;
    const boundFrom = anyArrow.startBinding?.elementId ?? anyArrow.start?.id;
    const boundTo = anyArrow.endBinding?.elementId ?? anyArrow.end?.id;
    const endpoints = arrowEndpoints(arrow);

    const resolve = (boundId: string | undefined, point: [number, number] | undefined): WireframeNode | undefined => {
      if (typeof boundId === 'string') {
        const direct = nodes.find(node => node.id === boundId);
        if (direct) return direct;
      }
      return point ? deepestNodeAt(orderedRoots, point[0], point[1]) : undefined;
    };

    const from = resolve(boundFrom, endpoints?.start);
    const to = resolve(boundTo, endpoints?.end);
    if (!from && !to) continue;

    const fromScreen = from ? screenAncestorOf(from, parents) : undefined;
    const toScreen = to ? screenAncestorOf(to, parents) : undefined;

    flows.push({
      arrowId: arrow.id,
      ...(from ? { fromId: from.id } : {}),
      ...(to ? { toId: to.id } : {}),
      ...(effectiveLabel(arrow, context, boundLabels) ? { label: effectiveLabel(arrow, context, boundLabels) } : {}),
      ...(fromScreen ? { fromScreenId: fromScreen.id } : {}),
      ...(toScreen ? { toScreenId: toScreen.id } : {}),
      navigation: !!fromScreen && !!toScreen && fromScreen.id !== toScreen.id
    });
  }

  // Markup is attributed against real components only, never against other markup.
  const targets = componentElements;
  const containerIds = findContainers(targets);
  const markup: WireframeMarkup[] = markupElements.map(el => {
    const link = attributeAnnotation(el, targets, containerIds);
    const text = effectiveLabel(el, context, boundLabels);
    return {
      id: el.id,
      elementType: el.type,
      ...(text ? { text } : {}),
      ...(link ? { targetId: link.targetId, relation: link.relation } : {}),
      distance: link?.distance ?? 0
    };
  });

  return {
    roots: orderedRoots,
    screens,
    flows,
    markup,
    // Counted from the tree, after tickbox labels have been folded in.
    componentCount: countNodes(orderedRoots)
  };
}

// ─── Report ────────────────────────────────────────────────────

const RELATION_PHRASE: Record<AnnotationRelation, string> = {
  'points-at': 'points at',
  encloses: 'circles / marks',
  inside: 'sits on',
  near: 'annotates'
};

function truncate(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}

function nodeSummary(node: WireframeNode): string {
  const { box, element } = node;
  const size = `${Math.round(box.w)}x${Math.round(box.h)}`;
  const details = [`${element.type} ${size}`];

  const fontSize = (element as any).fontSize;
  if (element.type === 'text' && typeof fontSize === 'number') details.push(`${fontSize}px`);
  if (hasVisibleFill(element)) details.push(`fill ${element.backgroundColor}`);
  if (element.locked) details.push('locked');
  if (element.origin === 'human') details.push('drawn by human');

  return details.join(' · ');
}

function renderNode(node: WireframeNode, prefix: string, depth: number, lines: string[]): void {
  const indent = '  '.repeat(depth + 1);
  const role = node.inferred ? `${node.role}?` : node.role;
  const label = node.label ? ` "${truncate(node.label, 48)}"` : '';
  lines.push(`${indent}${prefix} ${role}${label}  [${node.id}] ${nodeSummary(node)}`);
  node.children.forEach((child, index) => {
    renderNode(child, `${prefix}${index + 1}.`, depth + 1, lines);
  });
}

// Render the model as the agent-readable UI reading.
export function formatWireframe(model: WireframeModel): string {
  const { roots, screens, flows, markup, componentCount } = model;

  if (componentCount === 0 && markup.length === 0) {
    return 'The canvas is empty. Nothing to read as a wireframe.';
  }

  const byId = new Map<string, WireframeNode>();
  const index = (node: WireframeNode): void => {
    byId.set(node.id, node);
    node.children.forEach(index);
  };
  roots.forEach(index);

  const describeRef = (id: string | undefined): string => {
    if (!id) return 'nothing';
    const node = byId.get(id);
    if (!node) return `[${id}]`;
    const label = node.label ? ` "${truncate(node.label, 32)}"` : '';
    return `${node.role}${label} [${id}]`;
  };

  const lines: string[] = [];
  const loose = roots.filter(node => node.role !== 'screen');

  lines.push('## Wireframe reading');
  lines.push(
    `${screens.length} screen${screens.length === 1 ? '' : 's'}, ` +
    `${componentCount} component${componentCount === 1 ? '' : 's'}, ` +
    `${flows.length} connection${flows.length === 1 ? '' : 's'}, ` +
    `${markup.length} annotation${markup.length === 1 ? '' : 's'}.`
  );
  lines.push('');
  lines.push(
    'Roles are inferred from geometry, style and wording — a trailing `?` marks a ' +
    'low-confidence guess. Raw type and size follow each entry, so you can ' +
    'disagree with the reading. Numbering is reading order (top-to-bottom, ' +
    'left-to-right within a row).'
  );

  // Nothing nests and everything is wired together: that is a diagram, and
  // reading it as an interface will only produce misleading role guesses.
  if (screens.length === 0 && flows.length > 0 && componentCount > 0) {
    lines.push('');
    lines.push(
      '⚠️  No screen containers found, but the elements are connected by arrows — ' +
      'this looks like a flowchart or architecture diagram rather than a UI ' +
      'wireframe. Prefer describe_scene for it; the roles below are unreliable.'
    );
  }

  // The pre-flight checklist (references/wireframe-conventions.md §9), reported
  // rather than left to be counted by eye. Only the failures show: a reading
  // with nothing wrong should not carry a block saying so, and inference marks
  // are not failures — they ride along here only when something else is.
  //
  // This is in the report and not behind the CLI's --score flag on purpose: the
  // MCP tool takes no arguments, and an agent reading its own drawing back is
  // exactly who needs to be told the reading gave up.
  const score = scoreWireframe(model);
  if (score.fallbacks > 0 || score.unnamedScreens > 0 || score.orphans > 0) {
    lines.push('');
    lines.push('### Reading quality');
    if (score.fallbacks > 0) {
      lines.push(
        `  ⚠️  ${score.fallbacks} component${score.fallbacks === 1 ? '' : 's'} read as ` +
        '`shape` — the fallback role, meaning the reading gave up. Declare a `role` on each.'
      );
    }
    if (score.unnamedScreens > 0) {
      lines.push(
        `  ⚠️  ${score.unnamedScreens} screen${score.unnamedScreens === 1 ? '' : 's'} could not ` +
        'be named. A heading of 20px or more near the top of a screen is what names it.'
      );
    }
    if (score.orphans > 0) {
      lines.push(
        `  ⚠️  ${score.orphans} component${score.orphans === 1 ? '' : 's'} fell outside every ` +
        'screen frame. Containment is what builds the tree — move them fully inside.'
      );
    }
    if (score.inferred > 0) {
      lines.push(
        `  ${score.inferred} role${score.inferred === 1 ? ' is a guess' : 's are guesses'} ` +
        '(marked `?`). Fine on anything you would not mind being guessed wrong.'
      );
    }
  }

  const renderRoot = (node: WireframeNode, heading: string): void => {
    lines.push('');
    const label = node.label ? ` "${truncate(node.label, 48)}"` : '';
    lines.push(`### ${heading}${label}  [${node.id}] ${nodeSummary(node)}`);
    if (node.children.length === 0) {
      lines.push('  (empty)');
      return;
    }
    node.children.forEach((child, i) => renderNode(child, `${i + 1}.`, 0, lines));
  };

  screens.forEach((screen, i) => renderRoot(screen, `Screen ${i + 1}`));

  if (loose.length > 0) {
    lines.push('');
    lines.push(`### Outside any screen (${loose.length})`);
    loose.forEach((node, i) => renderNode(node, `${i + 1}.`, 0, lines));
  }

  if (flows.length > 0) {
    const navigation = flows.filter(flow => flow.navigation);
    const internal = flows.filter(flow => !flow.navigation);

    if (navigation.length > 0) {
      lines.push('');
      lines.push(`### Navigation (${navigation.length})`);
      for (const flow of navigation) {
        const label = flow.label ? ` — "${truncate(flow.label, 32)}"` : '';
        // No point saying "via the screen" when the arrow lands on the screen
        // itself rather than on something inside it.
        const via = flow.toId && flow.toId !== flow.toScreenId
          ? `via ${describeRef(flow.toId)}, `
          : '';
        lines.push(
          `  ${describeRef(flow.fromId)} → ${describeRef(flow.toScreenId)}` +
          `${label}   (${via}arrow [${flow.arrowId}])`
        );
      }
    }

    if (internal.length > 0) {
      lines.push('');
      lines.push(`### Other connections (${internal.length})`);
      for (const flow of internal) {
        const via = flow.label ? ` — "${truncate(flow.label, 32)}"` : '';
        lines.push(`  ${describeRef(flow.fromId)} → ${describeRef(flow.toId)}${via}  [${flow.arrowId}]`);
      }
    }
  }

  if (markup.length > 0) {
    lines.push('');
    lines.push(`### Annotations on this wireframe (${markup.length})`);
    lines.push('  Human markup currently on the canvas — treat as change requests.');
    for (const note of markup) {
      const text = note.text ? `"${truncate(note.text, 80)}"` : `(${note.elementType} markup)`;
      if (note.targetId && note.relation) {
        const gap = note.relation === 'near' && note.distance > 0 ? ` (${note.distance}px away)` : '';
        lines.push(`  ${text}`);
        lines.push(`      ↳ ${RELATION_PHRASE[note.relation]} ${describeRef(note.targetId)}${gap}`);
      } else {
        lines.push(`  ${text}  [${note.id}] — no clear target`);
      }
    }
  }

  return lines.join('\n');
}

// ─── Score ─────────────────────────────────────────────────────
//
// The pre-flight checklist in references/wireframe-conventions.md, counted.
// "It looked right" has already proved too weak a bar once, so the reading
// carries numbers a drawing can be held to: a wireframe that reads cleanly
// scores zero on everything except `screens` and `components`.
//
// The fixture corpus asserts on this rather than counting roles itself, so the
// tests and the tool can never disagree about what a fallback is.

export interface WireframeScore {
  screens: number;
  components: number;
  // Components that came back as `shape` — the fallback role, meaning the
  // reading gave up and the next agent is left guessing.
  fallbacks: number;
  // Components whose role is a soft guess (the trailing `?` in the report).
  inferred: number;
  // Screens no heading could name.
  unnamedScreens: number;
  // Top-level components that fell outside every screen frame.
  orphans: number;
}

export function scoreWireframe(model: WireframeModel): WireframeScore {
  let fallbacks = 0;
  let inferred = 0;

  const visit = (node: WireframeNode): void => {
    if (node.role === 'shape') fallbacks++;
    if (node.inferred) inferred++;
    node.children.forEach(visit);
  };
  model.roots.forEach(visit);

  return {
    screens: model.screens.length,
    components: model.componentCount,
    fallbacks,
    inferred,
    unnamedScreens: model.screens.filter(screen => !screen.label).length,
    orphans: model.roots.filter(node => node.role !== 'screen').length
  };
}
