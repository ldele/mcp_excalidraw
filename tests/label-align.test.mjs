// A label's textAlign and verticalAlign place it in its shape (T-004).
//
// The page's scene restore (frontend/src/utils/scene.ts, bundled as `prepareScene` for the headless
// renderer) recentred every bound label after conversion, so `textAlign: "left"` was stored and read
// back but drawn centred, in a tab and in a PNG alike. Excalidraw itself honours it: a bound label
// sits BOUND_TEXT_PADDING (5px) inside its shape's edge on the side it is aligned to.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'core');
const { prepareScene } =
  await import(pathToFileURL(join(dist, 'render', 'excalidraw-node', 'index.js')).href);

const PADDING = 5;
const row = (id, y, label) => ({
  id, type: 'rectangle', x: 100, y, width: 400, height: 52,
  backgroundColor: '#ffffff', strokeColor: '#d7d5cc', label: { text: 'report-2026.pdf', strokeColor: '#14130f', ...label }
});
const labelOf = (scene, id) => scene.find(el => el.type === 'text' && el.containerId === id);

test('a left-aligned label sits at the left edge, a right-aligned one at the right', async () => {
  const scene = await prepareScene([row('l', 100, { textAlign: 'left' }), row('r', 180, { textAlign: 'right' })]);
  const left = labelOf(scene, 'l');
  const right = labelOf(scene, 'r');
  assert.equal(left.textAlign, 'left');
  assert.equal(left.x, 100 + PADDING);
  assert.equal(right.textAlign, 'right');
  assert.ok(Math.abs(right.x + right.width - (500 - PADDING)) < 1, `right edge at ${right.x + right.width}`);
});

test('a label with no alignment is centred, as before', async () => {
  const scene = await prepareScene([row('c', 100, {})]);
  const label = labelOf(scene, 'c');
  assert.ok(Math.abs(label.x + label.width / 2 - 300) < 1, `centre at ${label.x + label.width / 2}`);
  assert.ok(Math.abs(label.y + label.height / 2 - 126) < 1, `middle at ${label.y + label.height / 2}`);
});

test('a top- or bottom-aligned label sits at that edge', async () => {
  const scene = await prepareScene([
    { ...row('t', 100, { verticalAlign: 'top' }), height: 120 },
    { ...row('b', 300, { verticalAlign: 'bottom' }), height: 120 }
  ]);
  assert.equal(labelOf(scene, 't').y, 100 + PADDING);
  const bottom = labelOf(scene, 'b');
  assert.ok(Math.abs(bottom.y + bottom.height - (420 - PADDING)) < 1, `bottom edge at ${bottom.y + bottom.height}`);
});
