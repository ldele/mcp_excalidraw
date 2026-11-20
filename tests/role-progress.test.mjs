// A declared `shape` is deliberate, not a fallback (T-002); a progress bar has its own role (T-003).
//
// T-002: `shape` is in the vocabulary, so the API takes `role: "shape"`, and the reading then
// counted it as the fallback, a failure, for a role declared on purpose. Only an inferred shape
// — the reading giving up — counts now. T-003: a progress bar, meter or gauge had no honest
// role; a consumer drew nested panels. `progress` is declared only, never inferred, and the
// track's inner fill is part of it, not a component of its own.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { readWireframe, scoreWireframe, formatWireframe } =
  await import(pathToFileURL(join(root, 'dist', 'core', 'wireframe.js')).href);
const { COMPONENT_ROLES } = await import(pathToFileURL(join(root, 'dist', 'types.js')).href);

const frame = { id: 's01', type: 'frame', name: 'S01 — Upload', x: 0, y: 0, width: 600, height: 400 };
const inFrame = el => ({ frameId: 's01', strokeColor: '#14130f', backgroundColor: 'transparent', ...el });
// A big ellipse with no label: nothing else fits, so the reading falls back to shape.
const blob = extra => inFrame({ id: 'blob', type: 'ellipse', x: 40, y: 200, width: 220, height: 140, ...extra });
const track = extra => inFrame({ id: 'bar', type: 'rectangle', x: 40, y: 80, width: 400, height: 16, backgroundColor: '#e9ecef', ...extra });
const fill = inFrame({ id: 'bar-fill', type: 'rectangle', x: 40, y: 80, width: 240, height: 16, backgroundColor: '#1971c2' });
const nodeById = (model, id) => {
  const find = nodes => { for (const n of nodes) { if (n.id === id) return n; const hit = find(n.children); if (hit) return hit; } };
  return find(model.roots);
};

// ─── T-002 ─────────────────────────────────────────────────────

test('an inferred shape is a fallback', () => {
  const model = readWireframe([frame, blob()]);
  assert.equal(nodeById(model, 'blob').role, 'shape');
  assert.equal(scoreWireframe(model).fallbacks, 1);
  assert.match(formatWireframe(model), /read as `shape`/);
});

test('a declared shape is deliberate: read as shape, never counted as a fallback', () => {
  const model = readWireframe([frame, blob({ role: 'shape' })]);
  assert.equal(nodeById(model, 'blob').role, 'shape');
  assert.equal(scoreWireframe(model).fallbacks, 0);
  assert.doesNotMatch(formatWireframe(model), /read as `shape`/);
});

// ─── T-003 ─────────────────────────────────────────────────────

test('progress is a role the API accepts', () => {
  assert.ok(COMPONENT_ROLES.includes('progress'));
});

test('a declared progress bar reads as progress, its fill folded into it', () => {
  const model = readWireframe([frame, track({ role: 'progress', label: { text: '60%' } }), fill]);
  const bar = nodeById(model, 'bar');
  assert.equal(bar.role, 'progress');
  assert.equal(bar.inferred, false);
  assert.deepEqual(bar.children, [], 'the fill is part of the bar');
  assert.equal(nodeById(model, 'bar-fill'), undefined);
  assert.equal(model.componentCount, 2, 'the screen and the bar');
  assert.equal(scoreWireframe(model).fallbacks, 0);
  assert.match(formatWireframe(model), /progress "60%"  \[bar\]/);
});

test('progress is never inferred: the same bar undeclared is not read as one', () => {
  const model = readWireframe([frame, track(), fill]);
  const bar = nodeById(model, 'bar');
  assert.notEqual(bar.role, 'progress');
});
