// The fixture corpus: `.excalidraw` in, expected reading out (ROADMAP PR 2).
//
// This is what stops a role-inference tweak from silently regressing a shape it
// was not aimed at. Every fixture is a real drawing exported from the canvas,
// and every expectation was reviewed by hand once — a golden file nobody read
// is worth nothing.
//
// Two layers, because they fail in different ways:
//   *.txt   the whole reading. Catches anything, including changes nobody
//           thought to assert on. Regenerate with `npm run corpus:update`.
//   *.json  the score and the attribution intent. Hand-authored, never
//           regenerated — these are the claims a blind `--update` must not be
//           able to erase.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  fixtureNames,
  readingOf,
  expectation,
  goldenPath,
  normalise
} from './corpus.mjs';

const names = fixtureNames();

test('the corpus is not empty', () => {
  assert.ok(names.length > 0, 'no fixtures found in tests/fixtures');
});

for (const name of names) {
  describe(name, () => {
    const { model, text, score } = readingOf(name);
    const expected = expectation(name);

    test('reading matches the golden text', () => {
      const golden = normalise(readFileSync(goldenPath(name), 'utf-8'));
      assert.equal(normalise(text), golden);
    });

    test('score matches', () => {
      assert.deepEqual(score, expected.score);
    });

    test('screens are named, and approved (ADR-005), as expected', () => {
      const actual = model.screens.map(screen => ({
        id: screen.id,
        ...(screen.label ? { label: screen.label } : {}),
        ...(screen.approval ? { approval: screen.approval } : {})
      }));
      assert.deepEqual(actual, expected.screens);
    });

    test('navigation flows match', () => {
      const actual = model.flows
        .filter(flow => flow.navigation)
        .map(flow => ({
          from: flow.fromId,
          toScreen: flow.toScreenId,
          ...(flow.label ? { label: flow.label } : {})
        }));
      assert.deepEqual(actual, expected.navigation ?? []);
    });

    // Reading order (T-006, T-021): where a fixture states the first screen's top-level order, or
    // the label each checkbox must absorb, the reading must give exactly that.
    test('reading order and checkbox labels, where stated', () => {
      if (expected.readingOrder) {
        assert.deepEqual(model.screens[0].children.map(node => node.id), expected.readingOrder);
      }
      if (expected.checkboxLabels) {
        const found = {};
        const walk = node => { if (node.role === 'checkbox') found[node.id] = node.label; node.children.forEach(walk); };
        model.screens.forEach(walk);
        assert.deepEqual(found, expected.checkboxLabels);
      }
    });

    // The geometry lint (ADR-002, SPEC-008): a fixture with no `lint` list must have no finding,
    // so a rule that starts firing on a drawing that reads right fails here.
    test('lint findings match', () => {
      const actual = model.lint.map(f => ({ ruleId: f.ruleId, severity: f.severity, elementId: f.elementId }));
      const wanted = (expected.lint ?? []).map(f => ({ ruleId: f.ruleId, severity: f.severity, elementId: f.elementId }));
      assert.deepEqual(actual, wanted);
    });

    test('markup binds where expected, with its intent (ADR-004)', () => {
      const actual = model.markup.map(note => ({
        id: note.id,
        ...(note.targetId ? { targetId: note.targetId } : {}),
        ...(note.relation ? { relation: note.relation } : {}),
        ...(note.intent ? { intent: note.intent } : {})
      }));
      const wanted = (expected.markup ?? []).map(note => ({
        id: note.id,
        ...(note.targetId ? { targetId: note.targetId } : {}),
        ...(note.relation ? { relation: note.relation } : {}),
        ...(note.intent ? { intent: note.intent } : {})
      }));
      assert.deepEqual(actual, wanted);
    });
  });
}

// ─── Attribution accuracy (ROADMAP measure 3) ──────────────────
//
// Each annotation in an expectation carries `intendedTargetId` — the component
// a person would say the note is about. Where that differs from `targetId`,
// the reader is binding the note somewhere a human would not, and the gap is
// the measure. Reported as a number rather than asserted at zero: the point is
// to watch it move, and a wrong binding that is *recorded* is not a surprise.

describe('markup attribution', () => {
  const notes = names.flatMap(name =>
    (expectation(name).markup ?? []).map(note => ({ ...note, fixture: name }))
  );

  test('every annotation declares the target a human would pick', () => {
    for (const note of notes) {
      assert.ok(
        typeof note.intendedTargetId === 'string',
        `${note.fixture}/${note.id} is missing intendedTargetId`
      );
    }
  });

  test('accuracy has not regressed below the recorded baseline', () => {
    if (notes.length === 0) return;

    const correct = notes.filter(note => note.targetId === note.intendedTargetId);
    const missed = notes.filter(note => note.targetId !== note.intendedTargetId);

    const baseline = JSON.parse(
      readFileSync(new URL('./expected/attribution-baseline.json', import.meta.url), 'utf-8')
    );

    console.log(
      `  attribution: ${correct.length}/${notes.length} bind where a human would ` +
      `(baseline ${baseline.correct}/${baseline.total})`
    );
    for (const note of missed) {
      console.log(
        `    ${note.fixture}/${note.id}: bound to ${note.targetId ?? '(nothing)'}, ` +
        `a human would say ${note.intendedTargetId}`
      );
    }

    assert.equal(notes.length, baseline.total, 'corpus size changed — re-review the baseline');
    assert.ok(
      correct.length >= baseline.correct,
      `attribution accuracy fell to ${correct.length}/${notes.length}, ` +
      `baseline is ${baseline.correct}/${baseline.total}`
    );
  });
});
