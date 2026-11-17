// `npm run dev` under the origin guard (T-017). Vite serves the page on its own port and proxies the
// API and the socket to the canvas; the guard refuses any Origin but the canvas's own page, so the
// proxy presents the dev page as that page — and only the dev page, never another site's.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { presentDevPageAs, isSocketUpgrade } =
  await import(pathToFileURL(join(root, 'scripts', 'vite-dev-proxy.mjs')).href);
const { requestIsOurs } = await import(pathToFileURL(join(root, 'dist', 'core', 'origin-guard.js')).href);

const CANVAS = 'http://127.0.0.1:3000';

// What reaches the canvas: the proxied request's headers after the rewrite (Host is rewritten to
// the target by changeOrigin, as Vite's proxy does).
function forwarded(incoming) {
  const out = { host: '127.0.0.1:3000', ...(incoming.origin ? { origin: incoming.origin } : {}) };
  const proxyReq = { setHeader: (name, value) => { out[name.toLowerCase()] = value; } };
  presentDevPageAs(CANVAS)(proxyReq, { headers: incoming });
  return out;
}

test("the dev page's own requests reach the canvas as its own page", () => {
  const headers = forwarded({ host: 'localhost:5173', origin: 'http://localhost:5173' });
  assert.equal(headers.origin, CANVAS);
  assert.equal(requestIsOurs(headers), true);
});

test("another site's page is forwarded as itself, and the guard still refuses it", () => {
  const headers = forwarded({ host: 'localhost:5173', origin: 'https://evil.example' });
  assert.equal(headers.origin, 'https://evil.example');
  assert.equal(requestIsOurs(headers), false);
});

test('another local dev page on a different port is not taken for this one', () => {
  const headers = forwarded({ host: 'localhost:5173', origin: 'http://localhost:5174' });
  assert.equal(requestIsOurs(headers), false);
});

test('a tool with no Origin is forwarded unchanged and passes, as it does without the proxy', () => {
  const headers = forwarded({ host: 'localhost:5173' });
  assert.equal(headers.origin, undefined);
  assert.equal(requestIsOurs(headers), true);
});

test('only a socket upgrade to the root is proxied; the page itself is served by Vite', () => {
  assert.equal(isSocketUpgrade({ headers: { upgrade: 'websocket' } }), true);
  assert.equal(isSocketUpgrade({ headers: {} }), false);
});
