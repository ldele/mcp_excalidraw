// The frontend echo must not read as human feedback (ROADMAP PR 1).
//
// A browser tab is the transport for the review loop — the human *must* open
// one. On first render Excalidraw fills in every style property the author
// left unset and measures each text element's real box, then syncs the whole
// scene back. The server stamps anything arriving from the browser `human`.
//
// So without the guard below, merely opening the canvas restamps every element
// the agent drew as `human`, and the review loop loses the signal it is built
// on: `changes` offers normalization as design feedback, and `readWireframe`
// finds no `agent` element left, decides the origin signal is meaningless, and
// silently stops detecting markup altogether.
//
// The corpus cannot catch this — fixtures are read off disk and never pass
// through a browser. The payloads below are the real ones observed on
// 2026-08-06, copied out of the change log rather than invented.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { canonicalizeElement, diffCanonical, boundChildSupersedesLabel, buildBoundLabelIndex, grewToFitLabel } =
  await import(pathToFileURL(join(__dirname, '..', 'dist', 'core', 'changes.js')).href);

const EMPTY = new Map();
const canon = el => canonicalizeElement(el, EMPTY, undefined);
const diff = (before, after) => diffCanonical(canon(before), canon(after));

// What the editor adds to any shape it renders that did not specify them.
const RENDER_DEFAULTS = {
  fillStyle: 'solid',
  strokeStyle: 'solid',
  strokeWidth: 2,
  roughness: 1,
  opacity: 100
};

describe('the frontend echo is not an edit', () => {
  test('a screen frame the agent drew survives first render unchanged', () => {
    const authored = {
      id: 's1', type: 'rectangle', x: 120, y: 120, width: 1160, height: 1180,
      strokeColor: '#14130f', strokeWidth: 2, backgroundColor: 'transparent'
    };
    assert.equal(diff(authored, { ...authored, ...RENDER_DEFAULTS }), null);
  });

  test('a header band survives first render unchanged', () => {
    const authored = {
      id: 'hdr', type: 'rectangle', x: 120, y: 120, width: 1160, height: 176,
      backgroundColor: '#fbfaf8', strokeColor: '#d7d5cc', fillStyle: 'solid'
    };
    assert.equal(diff(authored, { ...authored, ...RENDER_DEFAULTS }), null);
  });

  // The hardest case: Excalidraw replaces the author's guessed box with the
  // measured glyph extents, so width moves 400 -> 177.75 on a heading nobody
  // touched.
  test('a text element survives being measured', () => {
    const authored = {
      id: 'title', type: 'text', x: 152, y: 152, width: 400, height: 34,
      text: 'Project settings', fontSize: 26, fontFamily: '2', strokeColor: '#14130f'
    };
    const echoed = {
      ...authored, ...RENDER_DEFAULTS,
      width: 177.7470703125, height: 29.9,
      backgroundColor: 'transparent', textAlign: 'left'
    };
    assert.equal(diff(authored, echoed), null);
  });

  // The two payloads below were observed on 2026-10-07 against the merged 2.1.2 page: one tab
  // opened on a two-element scene, nothing touched, and both elements came back `human`
  // (`strokeColor: null -> "#1e1e1e"`, `fontFamily: null -> 5`). The editor paints an element
  // with no stroke colour in #1e1e1e and sets unstyled text in Excalifont (5).
  test('a shape drawn without a stroke colour survives first render unchanged', () => {
    const authored = {
      id: 'big', type: 'rectangle', x: 0, y: 0, width: 600, height: 400,
      backgroundColor: '#ffe3e3', fillStyle: 'solid'
    };
    assert.equal(diff(authored, { ...authored, ...RENDER_DEFAULTS, strokeColor: '#1e1e1e' }), null);
  });

  test('text drawn without a font or a colour survives first render unchanged', () => {
    const authored = { id: 'title', type: 'text', x: 20, y: 20, text: 'Agent drew this', fontSize: 28 };
    const echoed = {
      ...authored, ...RENDER_DEFAULTS,
      width: 205.94, height: 35, strokeColor: '#1e1e1e', fontFamily: 5,
      backgroundColor: 'transparent', textAlign: 'left'
    };
    assert.equal(diff(authored, echoed), null);
  });

  // The guard must not swallow the edits it sits beside.
  test('a person recolouring a stroke or changing a font is still reported', () => {
    const shape = { id: 'big', type: 'rectangle', x: 0, y: 0, width: 600, height: 400 };
    assert.equal(diff(shape, { ...shape, strokeColor: '#e03131' }).after.strokeColor, '#e03131');
    assert.equal(diff({ ...shape, strokeColor: '#1e1e1e' }, { ...shape, strokeColor: '#e03131' }).after.strokeColor, '#e03131');

    const text = { id: 'title', type: 'text', x: 20, y: 20, text: 'Agent drew this', fontSize: 28 };
    assert.equal(diff(text, { ...text, fontFamily: 2 }).after.fontFamily, 2);
  });
});

// Suppressing the echo removed the only path that dropped a superseded `label`,
// so every client load re-expanded it into another bound text child: 10 shapes
// x 4 tab loads = 40 stray text elements before this was caught. Guarding the
// fix's own side effect, not the original bug.
describe('a label superseded by a bound child is dropped', () => {
  const bound = new Map([['tab-general', 'General']]);

  test('drops the stored label once the editor owns the text', () => {
    assert.equal(boundChildSupersedesLabel(false, 'tab-general', bound), true);
  });

  test('keeps it while no bound child exists yet', () => {
    // First sync of a freshly drawn shape: the editor has not expanded it, so
    // dropping the label here would lose the text outright.
    assert.equal(boundChildSupersedesLabel(false, 'tab-general', new Map()), false);
  });

  test('keeps it when the payload still carries a label of its own', () => {
    assert.equal(boundChildSupersedesLabel(true, 'tab-general', bound), false);
  });

  test('is scoped to the element, not the scene', () => {
    // A bound child belonging to some other shape says nothing about this one.
    assert.equal(boundChildSupersedesLabel(false, 'btn-save', bound), false);
  });
});

describe('real edits still report', () => {
  const authored = {
    id: 'btn', type: 'rectangle', x: 152, y: 458, width: 540, height: 48,
    backgroundColor: '#ffffff', strokeColor: '#d7d5cc', fillStyle: 'solid',
    label: { text: 'Save' }
  };
  const rendered = { ...authored, ...RENDER_DEFAULTS };

  test('a fill the human changed is not mistaken for a default', () => {
    const delta = diff(rendered, { ...rendered, backgroundColor: '#ffc9c9' });
    assert.ok(delta, 'recolouring a shape must report');
    assert.equal(delta.after.backgroundColor, '#ffc9c9');
  });

  // The dangerous direction: unset -> a value that is NOT the editor default
  // must still count, or "make this transparent thing red" would vanish.
  test('an unset fill changed to a real colour still reports', () => {
    const bare = { id: 'x', type: 'rectangle', x: 0, y: 0, width: 100, height: 40 };
    const delta = diff(bare, { ...bare, ...RENDER_DEFAULTS, backgroundColor: '#ffc9c9' });
    assert.ok(delta, 'unset -> a non-default colour must report');
    assert.equal(delta.after.backgroundColor, '#ffc9c9');
  });

  test('a stroke width the human thickened still reports', () => {
    const delta = diff(rendered, { ...rendered, strokeWidth: 8 });
    assert.ok(delta, 'thickening a stroke must report');
    assert.equal(delta.after.strokeWidth, 8);
  });

  test('moving and relabelling still report', () => {
    const moved = diff(rendered, { ...rendered, x: 300, y: 600 });
    assert.ok(moved, 'a move must report');
    assert.equal(moved.after.x, 300);

    const relabelled = diff(rendered, { ...rendered, label: { text: 'Log in' } });
    assert.ok(relabelled, 'a relabel must report');
    assert.equal(relabelled.after.label, 'Log in');
  });

  // Text metrics are excluded, but the things a person actually changes about
  // text are not.
  test('text content and font size still report', () => {
    const text = { id: 't', type: 'text', x: 0, y: 0, width: 200, height: 30, text: 'Usage', fontSize: 20 };
    const retyped = diff(text, { ...text, text: 'Billing' });
    assert.ok(retyped, 'retyping text must report');
    assert.equal(retyped.after.label, 'Billing');

    const resized = diff(text, { ...text, fontSize: 13 });
    assert.ok(resized, 'changing font size must report');
    assert.equal(resized.after.fontSize, 13);
  });
});

// ─── T-010: the tab fits labels, and none of that is a person's edit ───────────
//
// Observed on 2026-10-08 with one Chrome tab on a private canvas (1.3.0 at 44f9d47): nothing is
// written back while the tab is only looked at; the first click on empty canvas syncs the scene,
// and three kinds of the editor's own layout came back as "Edited, by human". The payloads below
// are the stored element and what the tab sent for it, copied from that run.

// Canonical form of `el` as it stands in a scene, bound text children resolved.
const inScene = (el, scene) => {
  const context = new Map(scene.map(e => [e.id, e]));
  return canonicalizeElement(el, context, buildBoundLabelIndex(context));
};

describe('a label the tab wrapped is still the same label', () => {
  // UI-Wizard's dashboard as exported at 7828a2d: the label sat in a bound text child already.
  const button = {
    id: 'onboarding-dismiss', type: 'rectangle', x: 1296, y: 256, width: 64, height: 28,
    boundElements: [{ id: 'onboarding-dismiss-label', type: 'text' }]
  };
  const storedText = {
    id: 'onboarding-dismiss-label', type: 'text', x: 1306, y: 263, width: 44, height: 14,
    text: 'Dismiss', originalText: 'Dismiss', containerId: 'onboarding-dismiss', fontSize: 16, fontFamily: 1
  };
  const sentText = {
    ...storedText, x: 1304.504020690918, y: 250, width: 46.99195861816406, height: 40,
    text: 'Dismis\ns', originalText: 'Dismiss'
  };

  test('a re-wrapped label is not an edit to its shape', () => {
    assert.equal(diffCanonical(inScene(button, [button, storedText]), inScene(button, [button, sentText])), null);
  });

  test('the label reads unwrapped, which is what the reading prints', () => {
    assert.equal(inScene(button, [button, sentText]).label, 'Dismiss');
  });

  test('a person retyping the label is still reported', () => {
    const retyped = { ...sentText, text: 'Close', originalText: 'Close' };
    const delta = diffCanonical(inScene(button, [button, storedText]), inScene(button, [button, retyped]));
    assert.equal(delta.after.label, 'Close');
  });

  // The agent's own format: the label is on the shape until the tab expands it.
  test('a shorthand label expanded and wrapped by the tab keeps its text', () => {
    const authored = { id: 'narrow', type: 'rectangle', x: 120, y: 100, width: 64, height: 28, label: { text: 'Dismiss', fontSize: 16 } };
    const sent = { id: 'narrow', type: 'rectangle', x: 120, y: 100, width: 64, height: 50, boundElements: [{ type: 'text', id: 'narrow-label' }] };
    const sentLabel = {
      id: 'narrow-label', type: 'text', x: 127.86402893066406, y: 105, width: 48.271942138671875, height: 40,
      text: 'Dismis\ns', originalText: 'Dismiss', containerId: 'narrow', fontSize: 16, fontFamily: 5
    };
    const delta = diffCanonical(inScene(authored, [authored]), inScene(sent, [sent, sentLabel]));
    // The size pair is reported together; what matters is that the label is not in it.
    assert.deepEqual(delta.after, { width: 64, height: 50 }, 'only the growth is left, and that is the next block');
  });
});

describe('a shape the editor grew to fit its label was not resized by anyone', () => {
  // T-010's own shape: 36 x 20 with an 11 px label. The editor needs ceil(13.75) + 2 x 5 = 24.
  const badge = { id: 'badge', type: 'rectangle', x: 40, y: 100, width: 36, height: 20, label: { text: '3', fontSize: 11 } };
  const badgeSent = { id: 'badge', type: 'rectangle', x: 40, y: 100, width: 36, height: 24, boundElements: [{ type: 'text', id: 'badge-label' }] };
  const badgeLabel = { id: 'badge-label', type: 'text', x: 54.656005859375, y: 105.125, width: 6.68798828125, height: 13.75, text: '3', originalText: '3', containerId: 'badge' };

  test('36 x 20 grown to 36 x 24 around a 13.75 px line is a fit', () => {
    assert.equal(grewToFitLabel(badge, badgeSent, badgeLabel), true);
  });

  test('64 x 28 grown to 64 x 50 around two wrapped lines is a fit', () => {
    const before = { id: 'narrow', type: 'rectangle', x: 120, y: 100, width: 64, height: 28 };
    const label = { id: 'narrow-label', type: 'text', x: 127.86, y: 105, width: 48.27, height: 40, text: 'Dismis\ns', containerId: 'narrow' };
    assert.equal(grewToFitLabel(before, { ...before, height: 50 }, label), true);
  });

  test('a person dragging the shape taller than its label needs is a resize', () => {
    assert.equal(grewToFitLabel(badge, { ...badgeSent, height: 60 }, badgeLabel), false);
  });

  test('shrinking, moving, or a shape with no label is never a fit', () => {
    assert.equal(grewToFitLabel({ ...badge, height: 40 }, badgeSent, badgeLabel), false);
    assert.equal(grewToFitLabel(badge, { ...badgeSent, x: 60 }, badgeLabel), false);
    assert.equal(grewToFitLabel(badge, badgeSent, undefined), false);
  });

  // Not observed in a tab: computed from the rule the editor uses for these two shapes
  // (computeContainerDimensionForBoundText in @excalidraw/excalidraw 0.18).
  test('ellipses and diamonds use the editor\'s own, larger allowance', () => {
    const line = { id: 'l', type: 'text', x: 0, y: 0, width: 30, height: 13.75, text: '3', containerId: 'e' };
    const ellipse = { id: 'e', type: 'ellipse', x: 0, y: 0, width: 80, height: 20 };
    const diamond = { id: 'e', type: 'diamond', x: 0, y: 0, width: 120, height: 20 };
    assert.equal(grewToFitLabel(ellipse, { ...ellipse, height: Math.round((14 + 10) / Math.SQRT2 * 2) }, line), true);
    assert.equal(grewToFitLabel(diamond, { ...diamond, height: 2 * (14 + 10) }, line), true);
    assert.equal(grewToFitLabel(ellipse, { ...ellipse, height: 24 }, line), false, 'the rectangle allowance is not an ellipse\'s');
  });
});

describe('an arrow the agent bound is not redrawn by its first sync', () => {
  // T-007. The server routes a bound arrow itself and stores its points; the tab sends the same
  // points back with the box they span, real bindings and the arrowhead it draws by default.
  const stored = {
    id: 'flow', type: 'arrow', x: 207.8174109113824, y: 279.09074150247443,
    points: [[0, 0], [284.3651781772352, 61.818516995051084]], start: { id: 'from' }, end: { id: 'to' }
  };
  const sent = {
    id: 'flow', type: 'arrow', x: 207.8174109113824, y: 279.09074150247443,
    width: 284.3651781772352, height: 61.818516995051084,
    points: [[0, 0], [284.3651781772352, 61.818516995051084]],
    startBinding: { elementId: 'from', focus: 1.5888218580782547e-16, gap: 7.81741091138241 },
    endBinding: { elementId: 'to', focus: 1.4210854715202005e-15, gap: 7.81741091138241 },
    startArrowhead: null, endArrowhead: 'arrow', ...RENDER_DEFAULTS, strokeColor: '#1e1e1e'
  };

  test('the same path with a box, bindings and the default arrowhead is not an edit', () => {
    assert.equal(diff(stored, sent), null);
  });

  test('a person moving its end, or taking the arrowhead off, is still reported', () => {
    const moved = diff(stored, { ...sent, points: [[0, 0], [284.3651781772352, 120]], height: 120 });
    assert.deepEqual(moved.after.points, [[0, 0], [284.4, 120]]);
    assert.equal(diff({ ...stored, endArrowhead: 'arrow' }, { ...sent, endArrowhead: null }).after.endArrowhead, null);
  });

  test('a line has no arrowhead by default, so gaining one is an edit', () => {
    const line = { id: 'rule', type: 'line', x: 0, y: 0, points: [[0, 0], [100, 0]] };
    assert.equal(diff(line, { ...line, width: 100, height: 0, endArrowhead: null }), null);
    assert.equal(diff(line, { ...line, endArrowhead: 'arrow' }).after.endArrowhead, 'arrow');
  });
});
