// An elbowed arrow keeps its bindings through export and through a tab's load (T-024).
//
// Excalidraw 0.18 drops the binding of an elbowed arrow whose `fixedPoint` is null when it
// restores a scene. The export wrote exactly that for an agent's elbowed arrow, so a scene
// exported with no tab open and imported again lost its flows the moment a tab opened it:
// `changes` reported "re-bound: s1-go → s2 ⇒ nothing, by human". Seen 2026-11-16 with a real tab
// on a private canvas. The tab's restore is the page's own `prepareServerScene`, which the
// headless renderer bundles, so these tests run it without a browser.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = (...p) => pathToFileURL(join(__dirname, '..', 'dist', ...p)).href;
const { expandElementsForExport } = await import(dist('core', 'expand-elements.js'));
const { prepareScene } = await import(dist('core', 'render', 'excalidraw-node', 'index.js'));
const { elbowFixedPoint } = await import(dist('core', 'elbow-binding.js'));

const button = { id: 's1-go', type: 'rectangle', x: 24, y: 300, width: 160, height: 44 };
const screen = { id: 's2', type: 'rectangle', x: 700, y: 0, width: 500, height: 400 };
// As the server stores an agent's arrows before any tab has synced: bound by refs, the elbowed
// one leaving the button's top edge 8 px out and arriving 8 px left of the screen.
const elbow = {
  id: 'f-elbow', type: 'arrow', elbowed: true, x: 104, y: 292,
  start: { id: 's1-go' }, end: { id: 's2' }, points: [[0, 0], [0, -92], [588, -92]]
};
const plain = {
  id: 'f-plain', type: 'arrow', x: 192, y: 322,
  start: { id: 's1-go' }, end: { id: 's2' }, points: [[0, 0], [500, -122]]
};

const close = (actual, expected) =>
  assert.ok(actual.every((v, i) => Math.abs(v - expected[i]) < 1e-6), `${JSON.stringify(actual)} ≈ ${JSON.stringify(expected)}`);

describe('an elbowed arrow keeps its bindings (T-024)', () => {
  test('export gives an elbowed arrow\'s bindings the fixed point its ends imply', () => {
    const exported = expandElementsForExport([button, screen, elbow, plain], { deterministic: true });
    const arrow = exported.find(el => el.id === 'f-elbow');
    close(arrow.startBinding.fixedPoint, [0.5001, -8 / 44]);
    close(arrow.endBinding.fixedPoint, [-8 / 500, 0.5001]);
    const line = exported.find(el => el.id === 'f-plain');
    assert.equal(line.startBinding.fixedPoint, null, 'a plain arrow is exported as before');
  });

  test('a tab loading an imported scene keeps the elbowed arrow bound', async () => {
    // What an export written before this fix holds, once imported: bindings with no fixed point.
    const imported = [
      { ...button, boundElements: [{ id: 'f-elbow', type: 'arrow' }] },
      { ...screen, boundElements: [{ id: 'f-elbow', type: 'arrow' }] },
      {
        id: 'f-elbow', type: 'arrow', elbowed: true, x: 104, y: 292, points: [[0, 0], [0, -92], [588, -92]],
        startBinding: { elementId: 's1-go', focus: 0, gap: 4, fixedPoint: null },
        endBinding: { elementId: 's2', focus: 0, gap: 4, fixedPoint: null }
      }
    ];
    const restored = (await prepareScene(imported)).find(el => el.id === 'f-elbow');
    assert.equal(restored.startBinding?.elementId, 's1-go');
    assert.equal(restored.endBinding?.elementId, 's2');
  });

  test('the fixed point is the end\'s place on the box, as Excalidraw computes it', () => {
    const box = { x: 24, y: 0, width: 100, height: 50 };
    assert.deepEqual(elbowFixedPoint({ x: 124, y: 25 }, box), [1, 0.5001], 'right edge, middle');
    assert.deepEqual(elbowFixedPoint({ x: 24, y: 0 }, box), [0, 0], 'top-left corner');
    assert.equal(elbowFixedPoint({ x: 0, y: 0 }, { x: 0, y: 0, width: 0, height: 10 }), null);
  });
});
