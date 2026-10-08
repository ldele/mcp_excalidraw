// Order keys: the fork's validator must agree with Excalidraw's own (the `fractional-indexing`
// library it uses), and the repair must leave sound scenes alone.
//
// Scenes this fork exported before the 2.1.2 merge carry a decimal counter — a0, a1 … a10 … — and
// Excalidraw throws "invalid order key" on them, on the canvas page and in the headless renderer.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generateKeyBetween } from 'fractional-indexing';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { isValidOrderKey, repairOrderKeys, orderKey } =
  await import(pathToFileURL(join(__dirname, '..', 'dist', 'core', 'expand-elements.js')).href);

const libraryAccepts = key => { try { generateKeyBetween(key, null); return true; } catch { return false; } };

describe('isValidOrderKey', () => {
  test('agrees with fractional-indexing on every candidate', () => {
    const candidates = [
      'a0', 'a1', 'a9', 'aZ', 'az', 'a10', 'a12', 'a80', 'a05', 'a0V', 'a1V0',
      'b00', 'b10', 'b1', 'b0z', 'c000', 'c00', 'Zz', 'Zy', 'Z', 'Yzz', 'Y0', 'A', 'A' + '0'.repeat(26), 'A' + '0'.repeat(25) + '1',
      '', '0', '9', 'a', 'a-1', 'a 1', 'a1!', 'é1',
      ...Array.from({ length: 200 }, (_, i) => `a${i}`),       // the legacy counter
      ...Array.from({ length: 4000 }, (_, i) => orderKey(i))   // what export writes now
    ];
    const base62 = /^[0-9A-Za-z]*$/;
    for (const key of candidates.filter(k => base62.test(k))) {
      assert.equal(isValidOrderKey(key), libraryAccepts(key), `disagreement on ${JSON.stringify(key)}`);
    }
  });

  // The one deliberate difference: the library never checks the alphabet, so it accepts "a-1".
  // Excalidraw never writes such a key; rejecting it costs a regenerated key, nothing else.
  test('is stricter than the library only about the alphabet', () => {
    for (const key of ['a-1', 'a 1', 'a1!', 'é1']) assert.equal(isValidOrderKey(key), false, key);
    assert.equal(libraryAccepts('a-1'), true, 'if the library starts rejecting this, the note above is stale');
  });

  test('rejects what is not a string', () => {
    for (const key of [undefined, null, 0, 10, {}, ['a0']]) assert.equal(isValidOrderKey(key), false);
  });
});

describe('repairOrderKeys', () => {
  const ids = elements => elements.map(e => e.id);

  test('drops every key when the scene carries the legacy counter', () => {
    const legacy = Array.from({ length: 12 }, (_, i) => ({ id: `e${i}`, type: 'rectangle', index: `a${i}` }));
    const repaired = repairOrderKeys(legacy);
    assert.ok(repaired.every(e => !('index' in e)));
    assert.deepEqual(ids(repaired), ids(legacy), 'array order — the z-order — is untouched');
    assert.equal(legacy[10].index, 'a10', 'the input is not mutated');
  });

  test('drops every key when valid keys are out of array order', () => {
    const shuffled = [{ id: 'x', index: 'a2' }, { id: 'y', index: 'a1' }];
    assert.ok(repairOrderKeys(shuffled).every(e => !('index' in e)));
  });

  test('drops every key when only some elements have one, or two share one', () => {
    assert.ok(repairOrderKeys([{ id: 'x', index: 'a1' }, { id: 'y' }]).every(e => !('index' in e)));
    assert.ok(repairOrderKeys([{ id: 'x', index: 'a1' }, { id: 'y', index: 'a1' }]).every(e => !('index' in e)));
  });

  test('leaves a sound scene, and a scene with no keys at all, exactly as it is', () => {
    const sound = Array.from({ length: 70 }, (_, i) => ({ id: `e${i}`, index: orderKey(i) }));
    assert.equal(repairOrderKeys(sound), sound);
    const bare = [{ id: 'x' }, { id: 'y' }];
    assert.equal(repairOrderKeys(bare), bare);
  });
});
