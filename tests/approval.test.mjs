// An approval box in each screen, ticked by a person (ADR-005, SPEC-007 test cases 3 to 7).
// The drawn case is tests/fixtures/approval-boxes.
//
// Elements are written inline and read straight from dist/, as tests/corpus.mjs reads fixtures.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist', 'core');
const { isApprovalId } = await import(pathToFileURL(join(dist, 'approval.js')).href);
const { readWireframe, formatWireframe, scoreWireframe } =
  await import(pathToFileURL(join(dist, 'wireframe.js')).href);
const { formatChangeReport } = await import(pathToFileURL(join(dist, 'changes.js')).href);

const frame = (id, x, y, name) =>
  ({ id, type: 'frame', x, y, width: 500, height: 420, name, origin: 'agent' });
const field = (id, x, y, text, frameId) => ({
  id, type: 'rectangle', x, y, width: 300, height: 44, origin: 'agent', role: 'input',
  backgroundColor: '#ffffff', strokeColor: '#d7d5cc', label: { text }, ...(frameId ? { frameId } : {})
});
const approvalBox = (id, x, y, frameId, extra = {}) => ({
  id, type: 'rectangle', x, y, width: 136, height: 36, origin: 'agent',
  strokeColor: '#2f9e44', backgroundColor: 'transparent', label: { text: 'Approved' },
  ...(frameId ? { frameId } : {}), ...extra
});
// A check mark a person draws: a freedraw stroke whose box sits inside (x, y, 30x20).
const tick = (id, x, y, origin = 'human') => ({
  id, type: 'freedraw', x, y, width: 30, height: 20, origin, strokeColor: '#2f9e44',
  points: [[0, 10], [10, 20], [30, 0]]
});

function twoScreens(extra = []) {
  return [
    frame('s01', 120, 120, 'S01 — Sign in'),
    field('s01-email', 152, 200, 'Email', 's01'),
    field('s01-password', 152, 280, 'Password', 's01'),
    approvalBox('s01-approval', 468, 136, 's01'),
    frame('s02', 820, 120, 'S02 — Home'),
    field('s02-search', 852, 200, 'Search', 's02'),
    field('s02-filter', 852, 280, 'Filter', 's02'),
    approvalBox('s02-approval', 1168, 136, 's02'),
    ...extra
  ];
}

const approvalOf = (model) => Object.fromEntries(model.screens.map(screen => [screen.id, screen.approval]));

// ─── Case 3: the id rule ───────────────────────────────────────

test('an approval box is an element whose id ends -approval', () => {
  assert.equal(isApprovalId('s01-approval'), true);
  assert.equal(isApprovalId('home-approval'), true);
  assert.equal(isApprovalId('approval'), false);
  assert.equal(isApprovalId('approvals'), false);
  assert.equal(isApprovalId('s01-approval-note'), false);
  assert.equal(isApprovalId(undefined), false);
});

// ─── Case 4: what ticks ────────────────────────────────────────

test('no tick: both screens not approved yet; the boxes are no components', () => {
  const model = readWireframe(twoScreens());
  assert.deepEqual(approvalOf(model), { s01: 'open', s02: 'open' });
  const score = scoreWireframe(model);
  assert.equal(score.components, 6);
  assert.equal(score.fallbacks, 0);
  assert.equal(score.orphans, 0);
  const text = formatWireframe(model);
  assert.match(text, /Approved: 0 of 2 screens\./);
  assert.match(text, /### Screen 1 "S01 — Sign in"  \[s01\] frame 500x420 · not approved yet/);
  assert.doesNotMatch(text, /s01-approval/);
});

test("a person's stroke inside the box approves its screen and is no annotation", () => {
  const model = readWireframe(twoScreens([tick('t1', 478, 144)]));
  assert.deepEqual(approvalOf(model), { s01: 'approved', s02: 'open' });
  assert.equal(model.markup.length, 0);
  const text = formatWireframe(model);
  assert.match(text, /Approved: 1 of 2 screens\./);
  assert.match(text, /\[s01\] frame 500x420 · approved/);
});

test('a filled box approves its screen', () => {
  const scene = twoScreens().map(el =>
    el.id === 's02-approval' ? { ...el, backgroundColor: '#b2f2bb', origin: 'human' } : el);
  assert.deepEqual(approvalOf(readWireframe(scene)), { s01: 'open', s02: 'approved' });
});

test("an agent's stroke inside the box does not tick it", () => {
  const model = readWireframe(twoScreens([tick('t1', 478, 144, 'agent')]));
  assert.deepEqual(approvalOf(model), { s01: 'open', s02: 'open' });
});

test("a person's note beside the box is no tick and stays an annotation", () => {
  const note = { id: 'n1', type: 'text', x: 470, y: 240, width: 140, height: 25, fontSize: 20,
    text: 'wider', strokeColor: '#e03131', origin: 'human' };
  const model = readWireframe(twoScreens([note]));
  assert.deepEqual(approvalOf(model), { s01: 'open', s02: 'open' });
  assert.equal(model.markup.length, 1);
  assert.notEqual(model.markup[0].targetId, 's01-approval');
});

// ─── Case 5: which screen ──────────────────────────────────────

test('a box with no frameId inside a rectangle screen approves that screen', () => {
  const scene = [
    { id: 'r01', type: 'rectangle', x: 0, y: 0, width: 500, height: 400, origin: 'agent',
      backgroundColor: 'transparent', strokeColor: '#14130f' },
    { id: 'r01-title', type: 'text', x: 32, y: 24, width: 200, height: 34, fontSize: 26, text: 'Settings', origin: 'agent' },
    field('r01-name', 32, 100, 'Name'),
    approvalBox('r01-approval', 348, 16),
    tick('t1', 358, 24)
  ];
  const model = readWireframe(scene);
  assert.deepEqual(approvalOf(model), { r01: 'approved' });
  assert.equal(scoreWireframe(model).components, 3);
});

test('a box outside every screen approves nothing and is no orphan', () => {
  const scene = [...twoScreens(), approvalBox('lost-approval', 120, 700)];
  const model = readWireframe(scene);
  assert.equal(scoreWireframe(model).orphans, 0);
  assert.deepEqual(approvalOf(model), { s01: 'open', s02: 'open' });
});

test('a scene with no approval box reads no approval at all', () => {
  const scene = twoScreens().filter(el => !isApprovalId(el.id));
  const model = readWireframe(scene);
  assert.deepEqual(approvalOf(model), { s01: undefined, s02: undefined });
  assert.doesNotMatch(formatWireframe(model), /Approved:|approved yet/);
});

// ─── Case 6: `changes` ─────────────────────────────────────────

const record = (rev, kind, el, origin, extra = {}) =>
  ({ rev, kind, id: el.id, origin, at: '2026-11-17T00:00:00Z', elementType: el.type, ...extra });
const report = (records, elements) =>
  formatChangeReport({ since: 0, rev: records.length, truncated: false, reset: false, records }, elements);

test('an added tick reads as approving its screen', () => {
  const t = tick('t1', 478, 144);
  const text = report([record(1, 'add', t, 'human')], twoScreens([t]));
  assert.match(text, /↳ approves screen \[s01\] frame "S01 — Sign in"/);
  assert.doesNotMatch(text, /↳ (annotates|sits on|circles)/);
});

test("a person filling the box reads as approving its screen under the edit", () => {
  const scene = twoScreens().map(el =>
    el.id === 's02-approval' ? { ...el, backgroundColor: '#b2f2bb', origin: 'human' } : el);
  const box = scene.find(el => el.id === 's02-approval');
  const text = report([record(1, 'update', box, 'human', {
    before: { backgroundColor: 'transparent' }, after: { backgroundColor: '#b2f2bb' }
  })], scene);
  assert.match(text, /\[s02-approval\][^\n]*— by human\n[\s\S]*approves screen \[s02\] frame "S02 — Home"/);
});

test("an agent's addition inside the box approves nothing", () => {
  const t = tick('t1', 478, 144, 'agent');
  const text = report([record(1, 'add', t, 'agent')], twoScreens([t]));
  assert.doesNotMatch(text, /approves/);
});

// ─── Case 7: the legend says how ───────────────────────────────

test("the skill's legend explains the approval box", () => {
  const patch = JSON.parse(
    readFileSync(join(root, 'skills', 'excalidraw-skill', 'references', 'markup-legend.json'), 'utf-8')
  );
  assert.ok(patch.create.some(el => el.type === 'text' && /Approved/.test(el.text)),
    'a legend line names the Approved box');
});
