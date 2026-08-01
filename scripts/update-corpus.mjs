#!/usr/bin/env node
//
// Regenerate the golden reading (`tests/expected/*.txt`) for every fixture.
//
// This only ever rewrites the text goldens. The hand-authored `*.json`
// expectations — score, screen names, flows, markup intent — are deliberately
// left alone: they are the claims that a blind regeneration must not be able
// to erase. If a `.json` assertion fails, read the diff and decide, do not
// reach for this script.

import { writeFileSync } from 'node:fs';
import { fixtureNames, readingOf, goldenPath, normalise } from '../tests/corpus.mjs';

const names = fixtureNames();
if (names.length === 0) {
  console.error('No fixtures found in tests/fixtures.');
  process.exit(1);
}

for (const name of names) {
  const { text, score } = readingOf(name);
  writeFileSync(goldenPath(name), normalise(text) + '\n', 'utf-8');
  console.log(
    `${name}: ${score.screens} screen(s), ${score.components} components, ` +
    `${score.fallbacks} fallback(s), ${score.inferred} inferred`
  );
}

console.log(`\nRewrote ${names.length} golden reading(s). Review the diff before staging.`);
