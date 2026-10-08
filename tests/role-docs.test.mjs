// The role vocabulary an agent is told about is the one the toolkit takes (T-016).
//
// The skill's two lists of declarable roles were written by hand and had fallen one behind the
// code: `icon` was in COMPONENT_ROLES, accepted by the API and reported verbatim by the reading,
// and named in neither list. An agent drawing from the list had no way to draw a glyph — a small
// unlabelled square reads as a tick box — and one session concluded icons could not be drawn.
//
// These tests read the lists out of the skill itself, so the next role added to the code fails
// here until the skill says so.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const { COMPONENT_ROLES } = await import(pathToFileURL(join(root, 'dist', 'types.js')).href);
const { readWireframe } = await import(pathToFileURL(join(root, 'dist', 'core', 'wireframe.js')).href);

// Three roles are the reader's own and are not offered for declaring: a frame, a structural
// region, and the fallback the gate counts (T-002).
const READERS_OWN = ['screen', 'panel', 'shape'];
const declarable = COMPONENT_ROLES.filter(role => !READERS_OWN.includes(role)).sort();

// The backticked words between `lead` and the sentence's full stop.
function listed(file, lead) {
  const text = readFileSync(join(root, 'skills', 'excalidraw-skill', file), 'utf-8').replace(/\r\n/g, '\n');
  const start = text.indexOf(lead);
  assert.ok(start >= 0, `${file} no longer has a list introduced by "${lead}"`);
  const sentence = text.slice(start + lead.length, text.indexOf('.', start));
  return [...sentence.matchAll(/`([a-z-]+)`/g)].map(m => m[1]).sort();
}

describe('the skill lists every role an author can declare', () => {
  test('wireframe-conventions.md, "Valid roles"', () => {
    assert.deepEqual(listed(join('references', 'wireframe-conventions.md'), 'Valid roles:'), declarable);
  });

  test('SKILL.md, "Component roles"', () => {
    assert.deepEqual(listed('SKILL.md', '**Component roles** —'), declarable);
  });

  test('both name the three roles that are the reader\'s own', () => {
    for (const file of [join('references', 'wireframe-conventions.md'), 'SKILL.md']) {
      const text = readFileSync(join(root, 'skills', 'excalidraw-skill', file), 'utf-8');
      for (const role of READERS_OWN) assert.match(text, new RegExp('`' + role + '`'), `${file} never mentions \`${role}\``);
    }
  });
});

describe('what the skill says about a small glyph is what the reader does', () => {
  const frame = { id: 'screen', type: 'rectangle', x: 0, y: 0, width: 600, height: 400, strokeColor: '#14130f', backgroundColor: 'transparent' };
  const title = { id: 'title', type: 'text', x: 20, y: 20, width: 160, height: 30, text: 'Glyphs', fontSize: 24 };
  const card = { id: 'card', type: 'rectangle', x: 20, y: 80, width: 357, height: 180, role: 'card', backgroundColor: '#ffffff', strokeColor: '#d7d5cc' };
  const name = { id: 'name', type: 'text', x: 45, y: 145, width: 140, height: 22, text: 'Fast by default', fontSize: 18 };
  const glyph = extra => ({ id: 'glyph', type: 'rectangle', x: 45, y: 105, width: 24, height: 24, backgroundColor: 'transparent', strokeColor: '#8a867d', ...extra });
  const read = element => {
    const model = readWireframe([frame, title, card, name, element]);
    const find = node => (node.id === 'glyph' ? node : (node.children ?? []).map(find).find(Boolean));
    return model.roots.map(find).find(Boolean);
  };

  test('undeclared, a 24 px square is guessed to be a checkbox', () => {
    const node = read(glyph({}));
    assert.equal(node.role, 'checkbox');
    assert.equal(node.inferred, true);
  });

  test('undeclared, a 24 px circle is guessed to be a radio', () => {
    const node = read(glyph({ type: 'ellipse' }));
    assert.equal(node.role, 'radio');
    assert.equal(node.inferred, true);
  });

  test('declared, either one is an icon and nothing is guessed', () => {
    for (const type of ['rectangle', 'ellipse']) {
      const node = read(glyph({ type, role: 'icon' }));
      assert.equal(node.role, 'icon');
      assert.equal(node.inferred, false);
    }
  });
});
