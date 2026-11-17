// A mark's intent is its colour, and the legend that says so is left out of the reading
// (ADR-004, SPEC-006 test cases 4 to 8). The drawn cases are tests/fixtures/annotated and
// markup-legend.
//
// Elements are written inline and read straight from dist/, as tests/corpus.mjs reads fixtures.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist', 'core');
const { markIntent, intentOfColor, isLegendId, legendElementIds } =
  await import(pathToFileURL(join(dist, 'markup-intent.js')).href);
const { readWireframe, formatWireframe, scoreWireframe } =
  await import(pathToFileURL(join(dist, 'wireframe.js')).href);
const { formatChangeReport } = await import(pathToFileURL(join(dist, 'changes.js')).href);

const FAMILIES = {
  change: ['#fff5f5', '#ffc9c9', '#ff8787', '#fa5252', '#e03131'],
  remove: ['#fff9db', '#ffec99', '#ffd43b', '#fab005', '#f08c00',
           '#fff4e6', '#ffd8a8', '#ffa94d', '#fd7e14', '#e8590c'],
  question: ['#e7f5ff', '#a5d8ff', '#4dabf7', '#228be6', '#1971c2'],
  fine: ['#ebfbee', '#b2f2bb', '#69db7c', '#40c057', '#2f9e44']
};

const note = (id, x, y, text, strokeColor, origin = 'human') =>
  ({ id, type: 'text', x, y, width: 160, height: 25, fontSize: 20, text, strokeColor, origin });
const frame = (id, x, y, w, h, name, origin = 'agent') =>
  ({ id, type: 'frame', x, y, width: w, height: h, name, origin });
const field = (id, x, y, text, frameId) => ({
  id, type: 'rectangle', x, y, width: 300, height: 44, origin: 'agent',
  backgroundColor: '#ffffff', strokeColor: '#d7d5cc', label: { text }, ...(frameId ? { frameId } : {})
});

// ─── Case 4: the colour rule ───────────────────────────────────

test('every shade of a family gives its intent, in either case', () => {
  for (const [intent, shades] of Object.entries(FAMILIES)) {
    for (const shade of shades) {
      assert.equal(intentOfColor(shade), intent, shade);
      assert.equal(intentOfColor(shade.toUpperCase()), intent, shade.toUpperCase());
    }
  }
});

test('any other colour gives no intent', () => {
  for (const color of ['#1e1e1e', '#d03b3b', '#0c8599', '#15aabf', 'transparent', '', undefined, null]) {
    assert.equal(intentOfColor(color), undefined, String(color));
  }
});

// ─── Case 5: only a person's marks ─────────────────────────────

test("a person's mark carries its intent; an agent's element in the same colour does not", () => {
  assert.equal(markIntent(note('n', 0, 0, 'x', '#e03131', 'human')), 'change');
  assert.equal(markIntent(note('n', 0, 0, 'x', '#e03131', 'agent')), undefined);
  const { origin, ...unmarked } = note('n', 0, 0, 'x', '#e03131');
  assert.equal(markIntent(unmarked), undefined);
});

// ─── Case 6: the legend rule ───────────────────────────────────

test('a legend is an element whose id is legend or begins legend-', () => {
  assert.equal(isLegendId('legend'), true);
  assert.equal(isLegendId('legend-intent'), true);
  assert.equal(isLegendId('legendary'), false);
  assert.equal(isLegendId('my-legend'), false);
});

test('the legend takes its members, what is drawn inside it, and their bound text', () => {
  const elements = [
    frame('legend', -320, 120, 260, 300, 'How to mark up'),
    { id: 'sw', type: 'line', x: -300, y: 180, width: 40, height: 0, points: [[0, 0], [40, 0]], frameId: 'legend', origin: 'agent' },
    { id: 'loose', type: 'text', x: -300, y: 220, width: 120, height: 20, fontSize: 16, text: 'inside', origin: 'agent' },
    { id: 'chip', type: 'rectangle', x: -300, y: 260, width: 60, height: 30, frameId: 'legend', origin: 'agent' },
    { id: 'chip-t', type: 'text', x: -295, y: 265, width: 40, height: 20, text: 'Red', containerId: 'chip', origin: 'agent' },
    field('outside', 120, 120, 'Email')
  ];
  assert.deepEqual([...legendElementIds(elements)].sort(), ['chip', 'chip-t', 'legend', 'loose', 'sw']);
});

// ─── Cases 2, 3 and 8 inline: the reading leaves the legend out ─

function screenWithLegend() {
  return [
    frame('legend', -320, 120, 260, 300, 'How to mark up'),
    { id: 'legend-red', type: 'text', x: -300, y: 170, width: 200, height: 20, fontSize: 16, text: 'Red — change this', strokeColor: '#e03131', frameId: 'legend', origin: 'agent' },
    frame('s01', 120, 120, 500, 400, 'S01 — Sign in'),
    field('email', 152, 200, 'Email', 's01'),
    field('password', 152, 280, 'Password', 's01')
  ];
}

test('the legend adds no screen, component or orphan, and the reading says so', () => {
  const model = readWireframe(screenWithLegend());
  const score = scoreWireframe(model);
  assert.equal(score.screens, 1);
  assert.equal(score.components, 3);
  assert.equal(score.orphans, 0);
  assert.equal(score.fallbacks, 0);
  assert.equal(model.markup.length, 0);
  assert.match(formatWireframe(model), /Left out: the markup legend \[legend\]/);
});

test('a note between the legend and a screen binds to the screen, not to the legend', () => {
  const elements = [...screenWithLegend(), note('n1', -40, 205, 'bigger', '#e03131')];
  const model = readWireframe(elements);
  assert.equal(model.markup.length, 1);
  assert.equal(model.markup[0].targetId, 'email');
  assert.equal(model.markup[0].intent, 'change');
  assert.match(formatWireframe(model), /\[change\] "bigger"/);
});

test("the skill's legend file, beside a frame screen, adds nothing to the reading", () => {
  const patch = JSON.parse(
    readFileSync(join(root, 'skills', 'excalidraw-skill', 'references', 'markup-legend.json'), 'utf-8')
  );
  const legend = patch.create.map(el => ({ ...el, origin: 'agent' }));
  assert.ok(legend.every(el => isLegendId(el.id) || isLegendId(el.frameId ?? '')),
    'every element of the file is the legend or names it in frameId');
  const screen = screenWithLegend().filter(el => !isLegendId(el.id) && el.frameId !== 'legend');
  const alone = scoreWireframe(readWireframe(screen));
  const withLegend = scoreWireframe(readWireframe([...legend, ...screen]));
  assert.deepEqual(withLegend, alone);
});

// ─── Case 7: `changes` prints intent ───────────────────────────

const record = (rev, kind, el, origin, extra = {}) =>
  ({ rev, kind, id: el.id, origin, at: '2026-11-17T00:00:00Z', elementType: el.type, ...extra });

test('an added mark reads by human · its intent; an agent shape in red reads no intent', () => {
  const elements = [...screenWithLegend(), note('n1', 640, 205, 'bigger', '#e03131'),
    { id: 'agent-red', type: 'rectangle', x: 152, y: 360, width: 300, height: 44, origin: 'agent',
      strokeColor: '#e03131', backgroundColor: 'transparent', frameId: 's01' }];
  const report = formatChangeReport({
    since: 0, rev: 2, truncated: false, reset: false,
    records: [record(1, 'add', elements.at(-2), 'human'), record(2, 'add', elements.at(-1), 'agent')]
  }, elements);
  assert.match(report, /\[n1\].*— by human · change\n/);
  assert.match(report, /\[agent-red\].*— by agent\n/);
});

test('a person recolouring a mark reads intent before → after', () => {
  const ring = { id: 'ring', type: 'ellipse', x: 140, y: 190, width: 330, height: 70, origin: 'human',
    strokeColor: '#2f9e44', backgroundColor: 'transparent' };
  const elements = [...screenWithLegend(), ring];
  const report = formatChangeReport({
    since: 0, rev: 1, truncated: false, reset: false,
    records: [record(1, 'update', ring, 'human', {
      before: { strokeColor: '#e03131' }, after: { strokeColor: '#2f9e44' }
    })]
  }, elements);
  assert.match(report, /stroke #e03131 → #2f9e44/);
  assert.match(report, /intent change → fine/);
});

test('a note beside the legend is not attributed to it in changes', () => {
  const elements = [...screenWithLegend(), note('n1', -40, 205, 'bigger', '#e03131')];
  const report = formatChangeReport({
    since: 0, rev: 1, truncated: false, reset: false, records: [record(1, 'add', elements.at(-1), 'human')]
  }, elements);
  assert.match(report, /↳ annotates .*\[email\]/);
  assert.doesNotMatch(report, /↳ .*legend/);
});
