// How a screen with no frame name is named (T-005): by its most screen-like heading, the largest
// one that sits directly in the screen or in its header bar, not merely the topmost.
//
// Elements are written inline and read straight from dist/, as tests/corpus.mjs reads fixtures.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'core');
const { readWireframe } = await import(pathToFileURL(join(dist, 'wireframe.js')).href);

const screen = (...children) => [
  { id: 's', type: 'rectangle', x: 0, y: 0, width: 960, height: 640, origin: 'agent',
    backgroundColor: 'transparent', strokeColor: '#14130f' },
  ...children
];
const text = (id, x, y, t, fontSize) => ({
  id, type: 'text', x, y, width: Math.ceil(t.length * fontSize * 0.6), height: Math.ceil(fontSize * 1.25),
  text: t, fontSize, origin: 'agent'
});
const card = (id, x, y, w, h) => ({
  id, type: 'rectangle', x, y, width: w, height: h, origin: 'agent',
  backgroundColor: '#ffffff', strokeColor: '#d7d5cc', role: 'card'
});
const nameOf = elements => readWireframe(elements).screens[0].label;

test('T-005: a 20px caption above the 26px title does not name the screen', () => {
  assert.equal(nameOf(screen(
    text('cap', 32, 20, 'Drop to add 12 documents', 20),
    text('title', 32, 60, 'Library', 26)
  )), 'Library');
});

test('the title still names the screen over a bigger number inside a card below', () => {
  assert.equal(nameOf(screen(
    text('title', 32, 24, 'Dashboard', 26),
    card('kpi', 32, 100, 262, 96),
    text('kpi-v', 48, 130, '23,480', 28)
  )), 'Dashboard');
});

test('two headings of one size: the first in reading order, as before', () => {
  assert.equal(nameOf(screen(
    text('a', 32, 24, 'Settings', 22),
    text('b', 32, 80, 'Account', 22)
  )), 'Settings');
});

test('with no heading directly in the screen, a heading inside it still names it, as before', () => {
  assert.equal(nameOf(screen(
    card('panel', 32, 32, 600, 400),
    text('panel-h', 48, 48, 'Upload', 20),
    text('panel-x', 48, 100, 'some body text', 13)
  )), 'Upload');
});

test('a heading inside the header bar competes with the screen\'s own headings by size', () => {
  assert.equal(nameOf(screen(
    { id: 'hdr', type: 'rectangle', x: 0, y: 0, width: 960, height: 72, origin: 'agent',
      backgroundColor: '#fbfaf8', strokeColor: '#d7d5cc', role: 'header' },
    text('hdr-t', 32, 20, 'Acme', 20),
    text('title', 32, 100, 'Invoices', 26)
  )), 'Invoices');
});
