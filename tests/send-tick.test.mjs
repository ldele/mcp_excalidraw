// The tick the page's "Send to Claude" button draws (ADR-007 option 3, src/core/send-tick.ts).
//
// The button sends a round by drawing what a person would draw by hand, so the one send rule
// (src/core/send-box.ts) must take it as a send: its centre inside the legend's Send box, as
// the skill's legend file places that box. And it must stay out of the reading, like the legend.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, '..', 'dist', 'core');
const { sendTick, SEND_BOX_ID, SEND_TICK_PREFIX, SEND_TICK_SIZE } =
  await import(pathToFileURL(join(dist, 'send-tick.js')).href);
const sendBox = await import(pathToFileURL(join(dist, 'send-box.js')).href);
const { isLegendId } = await import(pathToFileURL(join(dist, 'markup-intent.js')).href);

const legend = JSON.parse(readFileSync(
  join(__dirname, '..', 'skills', 'excalidraw-skill', 'references', 'markup-legend.json'), 'utf8')).create;
const box = { ...legend.find(el => el.id === SEND_BOX_ID), origin: 'agent', rev: 5 };

// The tick as the server stores it once the tab has synced it: the person's, after the round start.
// Its `y` is the first point's, so the box it covers is found from the points.
const stored = (suffix, rev) => ({
  ...sendTick(box, suffix), ...SEND_TICK_SIZE, origin: 'human', rev
});
const extent = tick => {
  const ys = tick.points.map(([, y]) => tick.y + y);
  return { top: Math.min(...ys), bottom: Math.max(...ys) };
};

test('the reading and the button name the same Send box', () => {
  assert.equal(sendBox.SEND_BOX_ID, SEND_BOX_ID);
  assert.ok(box.width > 0, 'the legend file has the Send box');
});

test("the button's tick lies inside the Send box, centre and all", () => {
  const tick = stored('a', 6);
  const { top, bottom } = extent(tick);
  const cx = tick.x + tick.width / 2;
  const cy = (top + bottom) / 2;
  assert.ok(tick.x >= box.x && tick.x + tick.width <= box.x + box.width, 'inside horizontally');
  assert.ok(top >= box.y && bottom <= box.y + box.height, 'inside vertically');
  assert.ok(cx > box.x && cx < box.x + box.width && cy > box.y && cy < box.y + box.height);
});

test("the tick's first point is its origin, so the editor stores it as drawn", () => {
  assert.deepEqual(stored('a', 6).points[0], [0, 0]);
});

test("the send rule takes the button's tick as a send", () => {
  const state = sendBox.sendState([box, stored('a', 6)]);
  assert.ok(sendBox.isSent(state));
  assert.equal(state.sentAt, 6);
  assert.deepEqual([...state.tickIds], [`${SEND_TICK_PREFIX}a`]);
});

test('a second click sends again: the later tick moves the boundary', () => {
  const state = sendBox.sendState([box, stored('a', 6), stored('b', 9)]);
  assert.equal(state.boundary, 9);
});

test("the button's tick is a legend id, so the reading leaves it out", () => {
  assert.ok(isLegendId(stored('a', 6).id));
});
