// A round of markup held until the person sends it, against a real canvas server (ADR-007,
// SPEC-009 cases 6–8).
//
// Boots `dist/server.js` on a private port. The agent draws through the REST API; the person's
// edits arrive as the tab sends them, a whole-scene sync, so they are recorded as `human`.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = 37000 + Math.floor(Math.random() * 1000);
const baseUrl = `http://127.0.0.1:${port}`;
// Read at import time by dist/core/config.js — set before anything from dist is loaded.
process.env.EXPRESS_SERVER_URL = baseUrl;

const dist = join(__dirname, '..', 'dist', 'core');
const { heldChangeReport, sentScene, waitUntilSent, NoSendBoxError } =
  await import(pathToFileURL(join(dist, 'send-round.js')).href);
const { readWireframe } = await import(pathToFileURL(join(dist, 'wireframe.js')).href);

let server;
before(async () => {
  server = spawn(process.execPath, [join(__dirname, '..', 'dist', 'server.js')], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', EXCALIDRAW_NO_PERSIST: '1', LOG_LEVEL: 'error' },
    stdio: 'ignore'
  });
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`${baseUrl}/health`)).ok) return; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('canvas server did not start');
});
after(() => server?.kill());

const api = async (path, init) => {
  const res = await fetch(baseUrl + path, init);
  const body = await res.json();
  if (!res.ok) throw new Error(`${path}: ${res.status} ${JSON.stringify(body)}`);
  return body;
};
const post = (path, value) => api(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) });
const elements = async () => (await api('/api/elements')).elements;
const rev = async () => (await api('/health')).rev;

// What a tab does when a person draws: send the whole scene back with their element in it.
async function personDraws(element) {
  await post('/api/elements/sync', { elements: [...await elements(), element] });
}
const note = (id, x, y, text) => ({
  id, type: 'text', x, y, width: 120, height: 25, text, originalText: text, fontSize: 16, strokeColor: '#e03131'
});
// A check mark drawn in the legend's Send box (x -344…-76, y 592…640).
const tick = id => ({
  id, type: 'freedraw', x: -300, y: 610, width: 20, height: 12, strokeColor: '#2f9e44',
  points: [[0, 6], [8, 12], [20, 0]], pressures: [], simulatePressure: true
});

// The skill's own legend, Send box included, beside one screen.
const legend = JSON.parse(readFileSync(join(__dirname, '..', 'skills', 'excalidraw-skill', 'references', 'markup-legend.json'), 'utf8')).create;
async function drawReviewScene() {
  await api('/api/elements/clear', { method: 'DELETE' });
  await post('/api/elements/batch', { elements: [
    { id: 's01', type: 'frame', name: 'S01 — Sign in', x: 120, y: 120, width: 600, height: 500 },
    { id: 's01-submit', type: 'rectangle', x: 160, y: 300, width: 200, height: 44, frameId: 's01', label: { text: 'Sign in' } },
    ...legend
  ] });
}
const annotations = model => model.markup.map(m => m.text ?? m.label ?? '').join(' | ');

test('with no Send box, waiting for a send is refused', async () => {
  await api('/api/elements/clear', { method: 'DELETE' });
  await post('/api/elements', { id: 'lone', type: 'rectangle', x: 0, y: 0, width: 10, height: 10 });
  await assert.rejects(waitUntilSent(2, 0.2), NoSendBoxError);
});

test('a note drawn before the send is held from changes and wireframe, then released by the tick', async () => {
  await drawReviewScene();
  const since = await rev();
  await personDraws(note('n1', 380, 310, 'Too wide'));

  const unsent = await heldChangeReport(await api(`/api/changes?since=${since}`), await elements());
  assert.doesNotMatch(unsent, /Too wide/);
  assert.match(unsent, /⏸ 1 edit by a person, not sent yet\./);
  const heldScene = await sentScene(await elements());
  assert.equal(heldScene.heldNote, '⏸ 1 edit by a person, not sent yet.');
  assert.doesNotMatch(JSON.stringify(readWireframe(heldScene.elements).markup), /Too wide/);

  await personDraws(tick('t1'));
  const sent = await heldChangeReport(await api(`/api/changes?since=${since}`), await elements());
  assert.match(sent, /Too wide/);
  assert.doesNotMatch(sent, /not sent yet/);
  const sentNow = await sentScene(await elements());
  assert.equal(sentNow.heldNote, undefined);
  assert.match(JSON.stringify(readWireframe(sentNow.elements).markup), /Too wide/);
});

test('the agent\'s own edits are never held', async () => {
  await drawReviewScene();
  const since = await rev();
  await api('/api/elements/s01-submit', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ width: 240 }) });
  const report = await heldChangeReport(await api(`/api/changes?since=${since}`), await elements());
  assert.doesNotMatch(report, /not sent yet/);
  assert.match(report, /s01-submit/);
});

test('waitUntilSent returns the round at the tick and clears the box for the next one', async () => {
  await drawReviewScene();
  await personDraws(note('n2', 380, 310, 'Rename this'));
  const waiting = waitUntilSent(20, 0.2);
  await new Promise(r => setTimeout(r, 400));
  await personDraws(tick('t2'));
  const round = await waiting;

  assert.equal(round.sent, true);
  assert.match(round.report, /Round sent at rev \d+/);
  assert.match(round.report, /Rename this/);
  assert.match(round.report, /clear for the next round/);

  const after = await elements();
  assert.equal(after.some(el => el.id === 't2'), false, 'the tick is gone');
  const box = after.find(el => el.id === 'legend-send');
  assert.ok(box, 'the box is there again');
  assert.equal(box.origin, 'agent');
  assert.equal(box.frameId, 'legend');

  const since = await rev();
  await personDraws(note('n3', 380, 400, 'Next round'));
  const next = await heldChangeReport(await api(`/api/changes?since=${since}`), await elements());
  assert.doesNotMatch(next, /Next round/);
  assert.match(next, /⏸ 1 edit by a person, not sent yet\./);
});

test('waitUntilSent times out with a count of what is waiting', async () => {
  await drawReviewScene();
  await personDraws(note('n4', 380, 310, 'Pending'));
  const round = await waitUntilSent(1.5, 0.2);
  assert.equal(round.sent, false);
  assert.equal(round.report, 'Not sent yet: 1 edit by a person waiting.');
});
