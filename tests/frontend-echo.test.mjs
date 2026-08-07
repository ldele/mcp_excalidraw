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
const { canonicalizeElement, diffCanonical, boundChildSupersedesLabel } =
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
