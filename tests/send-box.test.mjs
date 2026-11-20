// The Send box and what a person has not sent yet (ADR-007, SPEC-009 cases 1–5).
//
// A person ticks the legend's "Send to Claude" box when a round of markup is done. Until then a
// person's edits after the round began are held back from the agent's readings; once ticked, the
// edits up to the tick are released and those after it held. The agent's edits are never held,
// and a canvas with no box holds nothing.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'core');
const { isSendBoxId, sendState, isSent, holdRecords, holdScene, heldLine } =
  await import(pathToFileURL(join(dist, 'send-box.js')).href);

const box = (extra = {}) => ({
  id: 'legend-send', type: 'rectangle', x: 0, y: 0, width: 200, height: 40,
  backgroundColor: 'transparent', origin: 'agent', rev: 10, frameId: 'legend', ...extra
});
const mark = (id, x, y, origin, rev, extra = {}) => ({
  id, type: 'freedraw', x, y, width: 20, height: 10, origin, rev, strokeColor: '#e03131', ...extra
});
const record = (rev, id, origin, kind = 'add') => ({ rev, id, origin, kind, at: '', elementType: 'freedraw' });

test('only legend-send is the Send box', () => {
  assert.equal(isSendBoxId('legend-send'), true);
  for (const id of ['send', 'legend-sender', 's01-send', 'legend', undefined]) assert.equal(isSendBoxId(id), false, id);
});

test('no box: no state, so nothing is held', () => {
  assert.equal(sendState([mark('n', 500, 500, 'human', 20)]), undefined);
});

test('a person\'s stroke inside the box sends the round; an agent\'s or a note beside it does not', () => {
  assert.equal(isSent(sendState([box(), mark('agent-tick', 90, 15, 'agent', 12)])), false);
  assert.equal(isSent(sendState([box(), mark('beside', 300, 15, 'human', 12)])), false);
  const sent = sendState([box(), mark('tick', 90, 15, 'human', 12)]);
  assert.equal(isSent(sent), true);
  assert.equal(sent.sentAt, 12);
  assert.deepEqual([...sent.tickIds], ['tick']);
});

test('a person\'s fill of the box sends it, and the round start comes from the log', () => {
  const filled = box({ backgroundColor: '#b2f2bb', origin: 'human', rev: 15 });
  const state = sendState([filled], [record(10, 'legend-send', 'agent'), record(15, 'legend-send', 'human', 'update')]);
  assert.equal(state.roundStart, 10);
  assert.equal(isSent(state), true);
  assert.equal(state.sentAt, 15);
});

test('a tick left from before the round began does not send it', () => {
  const state = sendState([box({ rev: 30 }), mark('old-tick', 90, 15, 'human', 12)]);
  assert.equal(isSent(state), false);
  assert.equal(state.boundary, 30);
});

test('unsent: a person\'s edits after the round start are held, the agent\'s are not', () => {
  const state = sendState([box()]);
  const { released, held } = holdRecords([
    record(9, 'before', 'human'), record(11, 'note', 'human'), record(12, 'button', 'agent', 'update'),
    record(13, 'note', 'human', 'update')
  ], state);
  assert.equal(held, 2);
  assert.deepEqual(released.map(r => `${r.rev} ${r.id}`), ['9 before', '12 button']);
  assert.equal(heldLine(held), '⏸ 2 edits by a person, not sent yet.');
  assert.equal(heldLine(1), '⏸ 1 edit by a person, not sent yet.');
});

test('sent: edits up to the tick are released, those after it held, the tick not counted', () => {
  const state = sendState([box(), mark('tick', 90, 15, 'human', 14)]);
  const { released, held } = holdRecords([
    record(11, 'note', 'human'), record(14, 'tick', 'human'), record(16, 'later', 'human')
  ], state);
  assert.equal(held, 1);
  assert.deepEqual(released.map(r => r.id), ['note', 'tick']);
});

test('the scene leaves out what a person created after the boundary, and keeps their edits to the rest', () => {
  const elements = [
    box(),
    { id: 'button', type: 'rectangle', x: 400, y: 0, width: 100, height: 40, origin: 'human', rev: 12 },
    mark('note', 400, 100, 'human', 13),
    { id: 'note-shape', type: 'rectangle', x: 400, y: 200, width: 80, height: 30, origin: 'human', rev: 14 },
    { id: 'note-shape-label', type: 'text', x: 405, y: 205, width: 60, height: 20, containerId: 'note-shape', origin: 'human', rev: 14 }
  ];
  const records = [
    record(12, 'button', 'human', 'update'), record(13, 'note', 'human'), record(14, 'note-shape', 'human')
  ];
  const { elements: kept, held } = holdScene(elements, records, sendState(elements));
  assert.equal(held, 3);
  assert.deepEqual(kept.map(el => el.id), ['legend-send', 'button']);
});

test('with the log truncated, every element a person last touched after the boundary is left out', () => {
  const elements = [box(), mark('note', 400, 100, 'human', 13), mark('old', 400, 300, 'human', 5)];
  const { elements: kept, held } = holdScene(elements, undefined, sendState(elements));
  assert.equal(held, 1);
  assert.deepEqual(kept.map(el => el.id), ['legend-send', 'old']);
});

// ─── Case 10: the legend carries the box ───────────────────────

test("the skill's legend has the Send box inside it, says how to use it, and reads as nothing", async () => {
  const { readFileSync } = await import('node:fs');
  const { readWireframe } = await import(pathToFileURL(join(dist, 'wireframe.js')).href);
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const patch = JSON.parse(readFileSync(join(root, 'skills', 'excalidraw-skill', 'references', 'markup-legend.json'), 'utf-8'));
  const legend = patch.create.find(el => el.id === 'legend');
  const send = patch.create.find(el => isSendBoxId(el.id));
  assert.ok(send, 'the legend has a legend-send box');
  assert.equal(send.frameId, 'legend');
  assert.ok(send.y + send.height <= legend.y + legend.height && send.x + send.width <= legend.x + legend.width,
    'the box sits inside the legend frame');
  assert.ok(patch.create.some(el => el.type === 'text' && /Send to Claude/.test(el.text)), 'a line says to tick it');
  const model = readWireframe(patch.create.map(el => ({ ...el, origin: 'agent' })));
  assert.equal(model.componentCount, 0);
  assert.equal(model.markup.length, 0);
});
