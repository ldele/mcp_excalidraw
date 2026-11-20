// An agent's edit is applied to the tab's scene by preparing only what it touches (T-029, T-030).
//
// The tab used to re-prepare the whole drawing for every element_created / updated / deleted:
// 88 ms per edit and ~3,800 text measurements on a 1713-element drawing, and a fresh copy of
// every element, which dropped a stroke the person was drawing. prepareSceneUpdate
// (frontend/src/utils/scene.ts) prepares the changed elements and their neighbours and returns
// every other element as the object the tab already holds. These tests hold it to the same
// result as the whole-scene preparation for what it touches, and to identity for what it does not.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'core');
const { loadExcalidrawNode } = await import(pathToFileURL(join(dist, 'render', 'excalidraw-node', 'dom.js')).href);
const { prepareServerScene, prepareSceneUpdate } = await loadExcalidrawNode();

const box = (id, x, y, text, extra = {}) => ({
  id, type: 'rectangle', x, y, width: 200, height: 60, strokeColor: '#14130f',
  ...(text ? { label: { text } } : {}), ...extra
});
const labelOf = (scene, id) => scene.find(el => el.type === 'text' && el.containerId === id);

// A tab's scene: labelled boxes, an arrow bound between two of them, a freehand stroke.
const tabScene = () => prepareServerScene([
  box('a', 0, 0, 'Start'),
  box('b', 400, 0, 'Finish'),
  box('c', 0, 300, 'Unrelated box with a longer label'),
  { id: 'arrow', type: 'arrow', x: 200, y: 30, width: 200, height: 0, points: [[0, 0], [200, 0]],
    start: { id: 'a' }, end: { id: 'b' } },
  { id: 'stroke', type: 'freedraw', x: 600, y: 300, width: 40, height: 20,
    points: [[0, 0], [20, 10], [40, 20]], pressures: [], simulatePressure: true }
]);

test('an edit leaves every element it does not touch as the same object', () => {
  const scene = tabScene();
  const next = prepareSceneUpdate(scene, [{ id: 'c', x: 10 }], [], { refreshDimensions: true });
  const before = new Map(scene.map(el => [el.id, el]));
  const cLabel = labelOf(scene, 'c').id;
  for (const element of next) {
    if (element.id === 'c' || element.id === cLabel) continue;
    assert.equal(element, before.get(element.id), `${element.id} was copied`);
  }
  assert.equal(next.find(el => el.id === 'c').x, 10);
  assert.equal(next.length, scene.length);
});

test('a resized box re-flows its label exactly as the whole-scene preparation does', () => {
  const scene = tabScene();
  const change = [{ id: 'c', width: 90 }];
  const incremental = prepareSceneUpdate(scene, change, [], { refreshDimensions: true });
  const merged = scene.map(el => el.id === 'c' ? { ...el, ...change[0] } : el);
  const whole = prepareServerScene(merged, { refreshDimensions: true });
  const a = labelOf(incremental, 'c');
  const b = labelOf(whole, 'c');
  for (const key of ['text', 'x', 'y', 'width', 'height']) assert.equal(a[key], b[key], key);
  assert.ok(a.text.includes('\n'), 'the narrower box wraps its label');
});

test('moving a bound shape keeps the arrow bound to it', () => {
  const scene = tabScene();
  const next = prepareSceneUpdate(scene, [{ id: 'b', x: 500 }], [], { refreshDimensions: true });
  const arrow = next.find(el => el.id === 'arrow');
  assert.equal(arrow.endBinding?.elementId, 'b');
  assert.equal(arrow.startBinding?.elementId, 'a');
  assert.ok(next.find(el => el.id === 'b').boundElements.some(x => x.id === 'arrow'));
});

test('deleting a shape drops it and the arrow bindings that pointed at it', () => {
  const scene = tabScene();
  const next = prepareSceneUpdate(scene, [], ['b'], { refreshDimensions: true });
  assert.equal(next.find(el => el.id === 'b'), undefined);
  const arrow = next.find(el => el.id === 'arrow');
  assert.equal(arrow.endBinding ?? null, null);
  assert.equal(arrow.startBinding?.elementId, 'a');
  assert.equal(next.find(el => el.id === 'stroke'), scene.find(el => el.id === 'stroke'));
});

test('a created box with a label gets its label once, on top of it', () => {
  const scene = tabScene();
  const next = prepareSceneUpdate(scene, [box('d', 0, 600, 'New')], [], { refreshDimensions: true });
  const at = next.findIndex(el => el.id === 'd');
  assert.ok(at >= 0);
  const label = labelOf(next, 'd');
  assert.equal(label.text, 'New');
  assert.equal(next.indexOf(label), at + 1);
  assert.equal(new Set(next.map(el => el.id)).size, next.length);
  // Updating it again replaces the label rather than adding a second one.
  const again = prepareSceneUpdate(next, [{ id: 'd', label: { text: 'Renamed' } }], [], { refreshDimensions: true });
  assert.deepEqual(again.filter(el => el.containerId === 'd').map(el => el.text), ['Renamed']);
});

test('an edit to a large drawing prepares only its neighbourhood', () => {
  const big = prepareServerScene(Array.from({ length: 400 }, (_, i) => box(`n${i}`, (i % 20) * 250, Math.floor(i / 20) * 100, `Row ${i}`)));
  const next = prepareSceneUpdate(big, [{ id: 'n7', x: 1 }], [], { refreshDimensions: true });
  const before = new Map(big.map(el => [el.id, el]));
  const copied = next.filter(el => el !== before.get(el.id)).map(el => el.id);
  assert.deepEqual(copied.sort(), ['n7', labelOf(big, 'n7').id].sort());
});
