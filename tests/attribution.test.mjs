// What a mark drawn round something is about (KI-10). The drawn case is
// tests/fixtures/human-round-1: a person's green loop round a whole screen, which meant the screen.
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
  backgroundColor: 'transparent', strokeColor: '#14130f', ...extra
});
const button = (id, x, y, label) =>
  rect(id, x, y, 200, 44, { backgroundColor: '#74c0fc', label: { text: label }, role: 'button' });
const ring = (id, x, y, w, h) => ({
  id, type: 'ellipse', x, y, width: w, height: h, origin: 'human',
  strokeColor: '#2f9e44', backgroundColor: 'transparent'
});

// A screen holding a card (with two lines in it) and two buttons.
const scene = (...marks) => [
  rect('s1', 100, 100, 600, 500),
  { id: 's1-h', type: 'text', x: 132, y: 124, width: 200, height: 34, text: 'Settings', fontSize: 26, origin: 'agent' },
  rect('card', 132, 180, 400, 160, { backgroundColor: '#ffffff', strokeColor: '#d7d5cc' }),
  { id: 'card-a', type: 'text', x: 150, y: 200, width: 160, height: 20, text: 'Your saved game', fontSize: 16, origin: 'agent' },
  { id: 'card-b', type: 'text', x: 150, y: 240, width: 220, height: 20, text: 'Where you are', fontSize: 12, origin: 'agent' },
  button('ok', 132, 400, 'Continue'),
  button('quit', 132, 460, 'Quit'),
  ...marks
];

const targetOf = (elements, id) => {
  const mark = readWireframe(elements).markup.find(m => m.id === id);
  return mark && `${mark.relation}:${mark.targetId}`;
};

test('a ring round a whole screen is about the screen', () => {
  assert.equal(targetOf(scene(ring('r', 60, 60, 680, 580)), 'r'), 'encloses:s1');
});

test('a ring round a whole card is about the card, not a line inside it', () => {
  assert.equal(targetOf(scene(ring('r', 120, 170, 430, 180)), 'r'), 'encloses:card');
});

test('a ring round one button is about that button, as before', () => {
  assert.equal(targetOf(scene(ring('r', 120, 390, 230, 64)), 'r'), 'encloses:ok');
});

test('a ring round two buttons is still about the smaller enclosed one, as before', () => {
  assert.equal(targetOf(scene(ring('r', 120, 390, 230, 124)), 'r'), 'encloses:ok');
});
