// Frames as screens (ADR-003, SPEC-005 test cases 8 to 11): the rules a drawn fixture shows
// badly or not at all. The drawn cases are tests/fixtures/frame-screens and frame-edges.
//
// Elements are written inline and read straight from dist/, as tests/corpus.mjs reads fixtures.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'core');
const { readWireframe } = await import(pathToFileURL(join(dist, 'wireframe.js')).href);
const { effectiveLabel, canonicalizeElement, buildContext } =
  await import(pathToFileURL(join(dist, 'changes.js')).href);
// The page's own scene restore (frontend/src/utils/scene.ts), as the headless renderer bundles it.
const { prepareScene } =
  await import(pathToFileURL(join(dist, 'render', 'excalidraw-node', 'index.js')).href);

const frame = (id, x, y, w, h, name) =>
  ({ id, type: 'frame', x, y, width: w, height: h, ...(name === undefined ? {} : { name }) });
const button = (id, x, y, text, frameId) => ({
  id, type: 'rectangle', x, y, width: 200, height: 44,
  backgroundColor: '#74c0fc', strokeColor: '#1971c2', label: { text },
  ...(frameId ? { frameId } : {})
});
const box = (id, x, y, w, h) =>
  ({ id, type: 'rectangle', x, y, width: w, height: h, backgroundColor: 'transparent', strokeColor: '#14130f' });

// The screen each element ends up in, by id: what the tests below compare.
function screensOf(elements) {
  const model = readWireframe(elements);
  const members = new Map();
  const walk = (node, into) => node.children.forEach(child => { into.push(child.id); walk(child, into); });
  for (const screen of model.screens) {
    const ids = [];
    walk(screen, ids);
    members.set(screen.id, ids);
  }
  const loose = model.roots.filter(node => node.role !== 'screen').map(node => node.id);
  return { model, members, loose };
}

// ─── Case 8: the name is the label ─────────────────────────────

test("a frame's label is its trimmed name", () => {
  const context = new Map();
  assert.equal(effectiveLabel(frame('f', 0, 0, 10, 10, '  S01 — Sign in '), context), 'S01 — Sign in');
});

test('a frame with a null, empty or blank name has no label', () => {
  const context = new Map();
  for (const name of [undefined, null, '', '   ']) {
    assert.equal(effectiveLabel(frame('f', 0, 0, 10, 10, name), context), undefined, `name ${JSON.stringify(name)}`);
  }
});

test("a frame's name beats a heading inside it, and names the screen", () => {
  const { model } = screensOf([
    frame('s1', 0, 0, 600, 400, 'S1 — Home'),
    { id: 'h', type: 'text', x: 32, y: 32, width: 200, height: 30, text: 'Welcome', fontSize: 24, frameId: 's1' }
  ]);
  assert.deepEqual(model.screens.map(s => s.label), ['S1 — Home']);
  assert.equal(model.screens[0].children[0].role, 'heading');
});

// ─── Case 9: frames never nest ─────────────────────────────────

test('a frame drawn inside another frame is a screen of its own', () => {
  const { members, loose } = screensOf([
    frame('outer', 0, 0, 1000, 800, 'Outer'),
    frame('inner', 100, 100, 400, 300, 'Inner'),
    button('in-btn', 140, 140, 'Save', 'inner'),
    button('out-btn', 600, 600, 'Done', 'outer')
  ]);
  assert.deepEqual([...members.keys()].sort(), ['inner', 'outer']);
  assert.deepEqual(members.get('inner'), ['in-btn']);
  assert.deepEqual(members.get('outer'), ['out-btn']);
  assert.deepEqual(loose, []);
});

test('a frame drawn inside a larger rectangle is a screen of its own', () => {
  const { members } = screensOf([
    box('board', 0, 0, 1200, 800),
    { id: 'board-note', type: 'text', x: 800, y: 40, width: 200, height: 20, text: 'Board', fontSize: 14 },
    frame('f', 100, 100, 400, 300, 'F1 — Inside a board'),
    button('f-btn', 140, 140, 'Save', 'f')
  ]);
  assert.deepEqual(members.get('f'), ['f-btn']);
  assert.deepEqual(members.get('board'), ['board-note']);
});

test('a frame with no members is an empty screen, not a shape', () => {
  const { model, loose } = screensOf([frame('f', 0, 0, 400, 300, 'F1 — Empty')]);
  assert.equal(model.screens.length, 1);
  assert.equal(model.screens[0].role, 'screen');
  assert.deepEqual(model.screens[0].children, []);
  assert.deepEqual(loose, []);
});

// ─── Case 10: geometry when the frame cannot hold it ───────────

test('a member that crosses its frame edge stays in its frame', () => {
  const { members, loose } = screensOf([
    frame('f', 0, 0, 400, 300, 'F'),
    button('poke', 300, 100, 'Next', 'f')
  ]);
  assert.deepEqual(members.get('f'), ['poke']);
  assert.deepEqual(loose, []);
});

test('a member larger than its frame is still its child', () => {
  const { members } = screensOf([
    frame('f', 0, 0, 400, 300, 'F'),
    { ...box('bg', -20, -20, 440, 340), frameId: 'f' },
    button('b', 40, 40, 'Save', 'f')
  ]);
  assert.deepEqual(members.get('f'), ['bg', 'b']);
});

test('a member wholly outside its frame reads by geometry', () => {
  const { members, loose } = screensOf([
    frame('f', 0, 0, 400, 300, 'F'),
    button('far', 900, 900, 'Lost', 'f')
  ]);
  assert.deepEqual(members.get('f'), []);
  assert.deepEqual(loose, ['far']);
});

test('a frameId that names no frame reads by geometry', () => {
  const { members, loose } = screensOf([
    box('rect', 0, 0, 600, 400),
    { id: 'h', type: 'text', x: 32, y: 32, width: 200, height: 30, text: 'Rect screen', fontSize: 24 },
    button('gone', 40, 100, 'Save', 'deleted-frame'),
    button('not-a-frame', 40, 200, 'Done', 'h')
  ]);
  assert.deepEqual(members.get('rect'), ['h', 'gone', 'not-a-frame']);
  assert.deepEqual(loose, []);
});

// ─── Case 12, found live: a tab keeps an arrow bound to a frame ─
//
// The page keeps frames out of Excalidraw's skeleton converter, so an agent's arrow whose `end`
// named a frame came back from a tab's load unbound. The tab's first sync then reported it as a
// person's edit ("endTarget s02 ⇒ null, by human"), and a human arrow reads as markup: the
// navigation it drew was gone. Seen 2026-11-16 on a private canvas with a real tab.

test("a tab's load keeps an agent's arrow bound to the frame it names", async () => {
  const stored = [
    frame('s1', 0, 0, 400, 300, 'S1 — Sign in'),
    button('s1-go', 40, 200, 'Continue', 's1'),
    frame('s2', 600, 0, 400, 300, 'S2 — Home'),
    { id: 'go', type: 'arrow', x: 248, y: 222, points: [[0, 0], [348, 0]],
      start: { id: 's1-go' }, end: { id: 's2' } }
  ];
  const restored = await prepareScene(stored);
  const arrow = restored.find(el => el.id === 'go');
  const target = restored.find(el => el.id === 's2');
  assert.equal(arrow.startBinding?.elementId, 's1-go');
  assert.equal(arrow.endBinding?.elementId, 's2');
  assert.ok(target.boundElements?.some(b => b.id === 'go' && b.type === 'arrow'), 'the frame lists the arrow');
});

test("a tab's load leaves an arrow the tab already bound to a frame as it was", async () => {
  const stored = [
    { ...frame('s2', 600, 0, 400, 300, 'S2 — Home'), boundElements: [{ id: 'go', type: 'arrow' }] },
    { id: 'go', type: 'arrow', x: 248, y: 222, points: [[0, 0], [348, 0]],
      endBinding: { elementId: 's2', focus: 0.25, gap: 6, fixedPoint: null } }
  ];
  const restored = await prepareScene(stored);
  const arrow = restored.find(el => el.id === 'go');
  assert.equal(arrow.endBinding?.elementId, 's2');
  assert.equal(arrow.endBinding?.focus, 0.25);
  assert.equal(restored.find(el => el.id === 's2').boundElements.length, 1);
});

// ─── Case 11: a rename is a label change ───────────────────────

test("a frame's canonical form carries its name as the label", () => {
  const before = frame('f', 0, 0, 400, 300, 'S01 — Sign in');
  const after = { ...before, name: 'S01 — Log in' };
  const a = canonicalizeElement(before, buildContext([before]));
  const b = canonicalizeElement(after, buildContext([after]));
  assert.equal(a.label, 'S01 — Sign in');
  assert.equal(b.label, 'S01 — Log in');
  assert.notDeepEqual(a, b);
});
