// The geometry lint (ADR-002, SPEC-008 test cases 2 to 9 and 11). The drawn case is
// tests/fixtures/lint-near-misses; the clean corpus is asserted in wireframe-corpus.test.mjs.
//
// Elements are written inline and read straight from dist/, as tests/corpus.mjs reads fixtures.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'core');
const { readWireframe, formatWireframe } = await import(pathToFileURL(join(dist, 'wireframe.js')).href);
const { formatLint } = await import(pathToFileURL(join(dist, 'wireframe-lint.js')).href);

const rect = (id, x, y, w, h, extra = {}) => ({
  id, type: 'rectangle', x, y, width: w, height: h, origin: 'agent',
  backgroundColor: 'transparent', strokeColor: '#14130f', ...extra
});
const text = (id, x, y, t, fontSize, extra = {}) => ({
  id, type: 'text', x, y, width: Math.ceil(t.length * fontSize * 0.6), height: Math.ceil(fontSize * 1.25),
  text: t, fontSize, origin: 'agent', ...extra
});
const input = (id, x, y, label) =>
  rect(id, x, y, 300, 44, { backgroundColor: '#ffffff', strokeColor: '#d7d5cc', label: { text: label }, role: 'input' });

// A rectangle screen 600x640 at the origin, named by its heading.
const screen = (...children) => [
  rect('s1', 0, 0, 600, 640),
  text('s1-title', 32, 24, 'Checkout', 26),
  ...children
];

const lintOf = (elements) => readWireframe(elements).lint;
const rules = (elements) => lintOf(elements).map(f => `${f.severity}:${f.ruleId}:${f.elementId}`);

test('a clean screen has no findings', () => {
  assert.deepEqual(lintOf(screen(input('email', 32, 100, 'Email'))), []);
});

// ─── Case 2: containment near miss ─────────────────────────────

test('a footer 4.29px past its screen is one error naming both, measured 4.29', () => {
  const elements = screen(
    input('email', 32, 100, 'Email'),
    rect('ftr', 0, 524.29, 600, 120, { backgroundColor: '#fbfaf8' }),
    text('ftr-t', 32, 560, 'Terms', 14)
  );
  const findings = lintOf(elements).filter(f => f.ruleId === 'containment-near-miss');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'error');
  assert.equal(findings[0].elementId, 'ftr');
  assert.equal(findings[0].relatedId, 's1');
  assert.equal(findings[0].measured, 4.29);
  assert.match(findings[0].message, /\[ftr\] is 4\.29px outside \[s1\]/);
  assert.match(formatWireframe(readWireframe(elements)), /### Drawing quality[\s\S]*\[ftr\] is 4\.29px outside \[s1\]/);
});

test('25px past is no near miss but an overlap', () => {
  const elements = screen(
    input('email', 32, 100, 'Email'),
    rect('ftr', 0, 545, 600, 120, { backgroundColor: '#fbfaf8' }),
    text('ftr-t', 32, 580, 'Terms', 14)
  );
  assert.deepEqual(rules(elements), ['advisory:sibling-overlap:ftr']);
});

// ─── Case 3: row split ─────────────────────────────────────────

test('side-by-side boxes overlapping 40% vertically split into two rows: error', () => {
  const elements = screen(rect('a', 32, 100, 200, 100), rect('b', 260, 160, 200, 100));
  assert.deepEqual(rules(elements), ['error:row-split:b']);
  assert.equal(lintOf(elements)[0].measured, 0.4);
});

test('overlapping 60% they share a row: none', () => {
  assert.deepEqual(rules(screen(rect('a', 32, 100, 200, 100), rect('b', 260, 140, 200, 100))), []);
});

// ─── Case 4: bar short ─────────────────────────────────────────

test('a band flush to the top spanning 70% misses the header test: error', () => {
  const elements = screen(input('email', 32, 200, 'Email'), rect('hdr', 0, 0, 420, 60, { backgroundColor: '#fbfaf8' }));
  assert.deepEqual(rules(elements), ['error:bar-short:hdr']);
  assert.equal(lintOf(elements)[0].measured, 0.7);
});

test('a full-width band reads header, and a 50% band is a card by intent: none', () => {
  assert.deepEqual(rules(screen(input('email', 32, 200, 'Email'), rect('hdr', 0, 0, 600, 60, { backgroundColor: '#fbfaf8' }))), []);
  assert.deepEqual(rules(screen(input('email', 32, 200, 'Email'), rect('hdr', 0, 0, 300, 60, { backgroundColor: '#fbfaf8' }))), []);
});

test('a sidebar flush left that stops short of the bottom: error', () => {
  const elements = screen(input('email', 260, 200, 'Email'), rect('side', 0, 0, 180, 420, { backgroundColor: '#fbfaf8' }));
  assert.deepEqual(rules(elements), ['error:bar-short:side']);
});

// ─── Case 5: threshold edge ────────────────────────────────────

test('an undeclared 29px square, 19px text and a 7px-thin bar: one error each', () => {
  const elements = screen(
    rect('sq', 32, 100, 29, 29),
    text('cap', 32, 200, 'Almost a heading', 19),
    rect('bar', 32, 300, 400, 7, { backgroundColor: '#d7d5cc' })
  );
  assert.deepEqual(rules(elements).sort(),
    ['error:threshold-edge:bar', 'error:threshold-edge:cap', 'error:threshold-edge:sq']);
});

test('28px, 20px and 6px are on the convention side; a declared 29px square is the author\'s word', () => {
  const elements = screen(
    rect('sq', 32, 100, 28, 28),
    text('cap', 32, 200, 'A heading', 20),
    rect('bar', 32, 300, 400, 6, { backgroundColor: '#d7d5cc' }),
    rect('sq2', 120, 100, 29, 29, { role: 'checkbox' })
  );
  assert.deepEqual(rules(elements), []);
});

// ─── Case 6: oversized annotation (KI-6) ───────────────────────

test("a person's transparent rectangle round two components: error", () => {
  const elements = screen(
    input('email', 32, 100, 'Email'),
    input('pass', 32, 180, 'Password'),
    rect('ring', 20, 90, 330, 150, { origin: 'human' })
  );
  assert.deepEqual(rules(elements), ['error:oversized-annotation:ring']);
  assert.equal(lintOf(elements)[0].measured, 2);
});

test('round one component it is an ordinary mark: none', () => {
  const elements = screen(input('email', 32, 100, 'Email'), rect('ring', 20, 90, 330, 70, { origin: 'human' }));
  assert.deepEqual(rules(elements), []);
});

// ─── Case 7: frame overflow ────────────────────────────────────

test('a member 40px outside its frame: advisory, measured 40', () => {
  const elements = [
    { id: 'f', type: 'frame', x: 0, y: 0, width: 500, height: 400, name: 'S01', origin: 'agent' },
    input('email', 32, 100, 'Email'),
    rect('next', 380, 300, 160, 44, { backgroundColor: '#74c0fc', label: { text: 'Next' }, role: 'button', frameId: 'f' })
  ].map(el => (el.id === 'email' ? { ...el, frameId: 'f' } : el));
  assert.deepEqual(rules(elements), ['advisory:frame-overflow:next']);
  assert.equal(lintOf(elements)[0].measured, 40);
});

// ─── Case 8: sibling overlap ───────────────────────────────────

test('two cards overlapping by 60px: advisory, no near miss', () => {
  const elements = screen(rect('a', 32, 100, 300, 200), rect('b', 272, 100, 300, 200));
  assert.deepEqual(rules(elements), ['advisory:sibling-overlap:b']);
});

// ─── Case 9: small text ────────────────────────────────────────

test('8px text: advisory; 10px: none', () => {
  assert.deepEqual(rules(screen(text('tiny', 32, 100, 'fine print', 8))), ['advisory:small-text:tiny']);
  assert.deepEqual(rules(screen(text('micro', 32, 100, 'micro label', 10))), []);
});

// ─── Advisories stay out of the plain reading ──────────────────

test('an advisory alone adds no Drawing quality block', () => {
  const text8 = formatWireframe(readWireframe(screen(text('tiny', 32, 100, 'fine print', 8))));
  assert.doesNotMatch(text8, /Drawing quality/);
});

// ─── Case 11: the printer ──────────────────────────────────────

test('formatLint lists errors before advisories, each with its rule id', () => {
  const findings = lintOf(screen(
    text('tiny', 32, 100, 'fine print', 8),
    rect('sq', 32, 200, 29, 29)
  ));
  const out = formatLint(findings);
  assert.ok(out.indexOf('threshold-edge') < out.indexOf('small-text'), out);
  assert.match(out, /error {2}threshold-edge {2}\[sq\]/);
  assert.match(out, /advisory {2}small-text {2}\[tiny\]/);
  assert.equal(formatLint([]), 'No findings: the drawing follows the conventions the lint checks.');
});
