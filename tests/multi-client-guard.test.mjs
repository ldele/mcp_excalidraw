// Two browser tabs on one canvas silently destroy human markup (KI-7).
//
// Every tab POSTs its whole scene to /api/elements/sync, and the handler treats
// "absent from this payload" as "the human deleted it" — so each tab's sync
// deletes what the other just added. On 2026-08-07 that produced 386 adds
// against 385 deletes and wiped a full round of markup: a note, an ellipse and
// four freedraw strokes, with nothing in the report explaining why.
//
// The real fix is a sync redesign. This guard is the cheap part: say so, loudly,
// *before* someone spends ten minutes drawing into it.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { multiClientWarning } =
  await import(pathToFileURL(join(__dirname, '..', 'dist', 'cli', 'util.js')).href);

describe('multi-client guard', () => {
  test('silent when the canvas is safe', () => {
    // 0 = nobody has opened it yet; requireBrowserClient covers that case with a
    // real error where it matters. 1 = the normal, correct setup.
    assert.equal(multiClientWarning(0), null);
    assert.equal(multiClientWarning(1), null);
  });

  test('warns from the second tab onward', () => {
    const two = multiClientWarning(2);
    assert.ok(two, 'two tabs must warn');
    assert.match(two, /2 browser tabs/);
    assert.match(two, /lost silently|delete each other/);

    assert.match(multiClientWarning(5), /5 browser tabs/);
  });

  test('the warning says what to do, not just what is wrong', () => {
    // A warning that does not name the fix gets read once and ignored.
    assert.match(multiClientWarning(3), /Close all but one tab/);
  });
});
