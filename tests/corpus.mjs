// Shared loader for the wireframe fixture corpus.
//
// Fixtures are read straight off disk and fed to readWireframe, never through
// the canvas server. That is deliberate: the server stamps `origin: "agent"`
// on everything it creates, so a fixture round-tripped through `import` loses
// the `origin: "human"` marks that make markup attribution testable at all.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const FIXTURE_DIR = join(__dirname, 'fixtures');
export const EXPECTED_DIR = join(__dirname, 'expected');

// pathToFileURL, not the bare path: on Windows a dynamic import of `C:\...`
// is rejected as an unsupported URL scheme.
export const { readWireframe, formatWireframe, scoreWireframe } =
  await import(pathToFileURL(join(__dirname, '..', 'dist', 'core', 'wireframe.js')).href);

export function fixtureNames() {
  return readdirSync(FIXTURE_DIR)
    .filter(name => name.endsWith('.excalidraw'))
    .map(name => name.replace(/\.excalidraw$/, ''))
    .sort();
}

export function readFixture(name) {
  const scene = JSON.parse(readFileSync(join(FIXTURE_DIR, `${name}.excalidraw`), 'utf-8'));
  if (!Array.isArray(scene.elements) || scene.elements.length === 0) {
    throw new Error(`Fixture ${name} has no elements`);
  }
  return scene.elements;
}

export function readingOf(name) {
  const model = readWireframe(readFixture(name));
  return { model, text: formatWireframe(model), score: scoreWireframe(model) };
}

export function expectation(name) {
  return JSON.parse(readFileSync(join(EXPECTED_DIR, `${name}.json`), 'utf-8'));
}

export function goldenPath(name) {
  return join(EXPECTED_DIR, `${name}.txt`);
}

// Golden text is compared line-by-line with trailing whitespace and platform
// line endings normalised, so a checkout on Windows does not fail on CRLF.
export function normalise(text) {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trimEnd();
}
