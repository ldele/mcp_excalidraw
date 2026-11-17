// Reading order when a sibling stands beside a column (T-006, T-021). The drawn cases are
// tests/fixtures/sidebar-rows and stacked-checkboxes; these pin the layouts the change must not
// break, found on the owner's dnd_crawler wireframe while calibrating it (2026-11-17).
//
// Elements are written inline and read straight from dist/, as tests/corpus.mjs reads fixtures.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'core');
const { readWireframe } = await import(pathToFileURL(join(dist, 'wireframe.js')).href);

const rect = (id, x, y, w, h, extra = {}) => ({
  id, type: 'rectangle', x, y, width: w, height: h, origin: 'agent',
  backgroundColor: '#ffffff', strokeColor: '#d7d5cc', ...extra
});
const text = (id, x, y, t, fontSize = 13) => ({
  id, type: 'text', x, y, width: Math.ceil(t.length * fontSize * 0.6), height: Math.ceil(fontSize * 1.25),
  text: t, fontSize, origin: 'agent'
});
const screen = (w, h, ...children) => [rect('s', 0, 0, w, h, { backgroundColor: 'transparent', strokeColor: '#14130f' }), ...children];
const order = (elements) => readWireframe(elements).screens[0].children.map(node => node.id);

test('T-006: a corner-to-corner sidebar leaves the main column row by row', () => {
  const elements = screen(1280, 900,
    rect('side', 0, 0, 240, 900, { backgroundColor: '#f8f7f3', role: 'sidebar' }),
    text('title', 272, 32, 'Summary of your library', 26),
    rect('t1', 272, 100, 220, 96, { role: 'card' }), rect('t2', 508, 100, 220, 96, { role: 'card' }),
    rect('t3', 744, 100, 220, 96, { role: 'card' }), rect('t4', 980, 100, 220, 96, { role: 'card' }),
    rect('wide', 272, 220, 928, 200, { role: 'table', label: { text: 'Rows of documents' } }),
    rect('c1', 272, 444, 456, 300, { role: 'card' }), rect('c2', 744, 444, 456, 300, { role: 'card' })
  );
  assert.deepEqual(order(elements), ['side', 'title', 't1', 't2', 't3', 't4', 'wide', 'c1', 'c2']);
});

test('T-021: drop zones beside two stacked checkboxes leave each checkbox its label', () => {
  const model = readWireframe(screen(1160, 400,
    rect('zone-a', 32, 100, 262, 120), rect('zone-b', 310, 100, 262, 120),
    rect('cb1', 600, 110, 24, 24), text('cb1-l', 632, 112, 'Say what looks unusual'),
    rect('cb2', 600, 162, 24, 24), text('cb2-l', 632, 164, 'Also score it')
  ));
  const boxes = model.screens[0].children.filter(node => node.role === 'checkbox');
  assert.deepEqual(boxes.map(node => node.label), ['Say what looks unusual', 'Also score it']);
});

test('a detail card beside a list reads after the whole list', () => {
  const elements = screen(960, 600,
    rect('m0', 24, 80, 380, 52, { role: 'list-item' }), rect('m1', 24, 140, 380, 52, { role: 'list-item' }),
    rect('m2', 24, 200, 380, 52, { role: 'list-item' }), rect('m3', 24, 260, 380, 52, { role: 'list-item' }),
    rect('det', 420, 80, 516, 392, { role: 'card' })
  );
  assert.deepEqual(order(elements), ['m0', 'm1', 'm2', 'm3', 'det']);
});

test('a picture beside a stack reads first, and the first card of the stack is no column', () => {
  const elements = screen(960, 600,
    rect('art', 24, 70, 440, 420, { role: 'image', label: { text: 'Title picture' } }),
    rect('save', 496, 70, 440, 140, { role: 'card' }),
    rect('b1', 496, 230, 440, 48, { role: 'button', label: { text: 'Continue' }, backgroundColor: '#74c0fc' }),
    rect('b2', 496, 290, 440, 48, { role: 'button', label: { text: 'New game' }, backgroundColor: '#74c0fc' }),
    rect('b3', 496, 350, 440, 48, { role: 'button', label: { text: 'Quit' }, backgroundColor: '#74c0fc' })
  );
  assert.deepEqual(order(elements), ['art', 'save', 'b1', 'b2', 'b3']);
});

test("a portrait's caption reads with the portrait, not after the fields beside it", () => {
  const elements = screen(960, 600,
    rect('por', 24, 70, 280, 280, { role: 'image', label: { text: 'Portrait' } }),
    text('por-n', 24, 358, 'Shown as drawn'),
    rect('f0', 330, 70, 606, 48, { role: 'input', label: { text: 'Name' } }),
    rect('f1', 330, 126, 606, 48, { role: 'input', label: { text: 'Class' } }),
    rect('f2', 330, 182, 606, 48, { role: 'input', label: { text: 'Origin' } }),
    rect('desc', 330, 242, 606, 150, { role: 'card' })
  );
  assert.deepEqual(order(elements), ['por', 'por-n', 'f0', 'f1', 'f2', 'desc']);
});

test('a row of cards of different heights with nothing stacked beside them stays one row', () => {
  const elements = screen(960, 600,
    rect('a', 24, 70, 300, 336, { role: 'card' }), rect('b', 340, 70, 300, 96, { role: 'card' }),
    rect('c', 656, 70, 280, 96, { role: 'card' })
  );
  assert.deepEqual(order(elements), ['a', 'b', 'c']);
});
