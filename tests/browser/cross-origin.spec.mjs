// Another site's page, in a real browser, cannot read, draw on, listen to or wipe the canvas (T-015,
// T-018).
//
// From the probe of 2026-10-08, kept outside the repository until T-018. The state check `requests
// from another site are refused` sends raw HTTP with the headers it chooses; this one lets the
// browser choose them, so a change in what Chrome sends from another origin is seen here. Two page
// origins a person meets on their own machine: another local port, and a file opened from disk.
// The probe's public-website cases needed the internet and are left out.
import { test, expect } from '@playwright/test';
import http from 'node:http';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Runs inside the page. Each attempt gets 8 s, so a silent block reads as one.
async function attack(api) {
  const out = {};
  const attempt = async (name, fn) => {
    try {
      out[name] = await Promise.race([
        fn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('no answer in 8 s')), 8000))
      ]);
    } catch (error) {
      out[name] = 'blocked';
    }
  };
  await attempt('read', async () => `HTTP ${(await fetch(api + '/api/elements')).status}`);
  await attempt('write', async () => `HTTP ${(await fetch(api + '/api/elements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'rectangle', x: 0, y: 0, width: 50, height: 50 })
  })).status}`);
  await attempt('socket', () => new Promise((resolve, reject) => {
    const ws = new WebSocket(api.replace('http', 'ws'));
    ws.onmessage = message => { resolve('received ' + JSON.parse(message.data).type); ws.close(); };
    ws.onerror = () => reject(new Error('socket error'));
  }));
  await attempt('clear', async () => `HTTP ${(await fetch(api + '/api/elements/clear', { method: 'DELETE' })).status}`);
  return out;
}

const refused = value => value === 'blocked' || value === 'HTTP 403';

test.describe('a page from another origin', () => {
  let other;
  let dir;

  test.beforeAll(async () => {
    other = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<!doctype html><title>another local site</title>');
    });
    await new Promise(resolve => other.listen(0, '127.0.0.1', resolve));
    dir = mkdtempSync(join(tmpdir(), 'canvas-cross-origin-'));
    writeFileSync(join(dir, 'attachment.html'), '<!doctype html><title>a file from disk</title>');
  });

  test.afterAll(async () => {
    other?.close();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  const pages = {
    'another port on this machine': () => `http://127.0.0.1:${other.address().port}/`,
    'an HTML file opened from disk': () => pathToFileURL(join(dir, 'attachment.html')).href
  };

  for (const [name, url] of Object.entries(pages)) {
    test(`${name} is refused everything, and the canvas is untouched`, async ({ browser, request, baseURL }) => {
      await request.delete('/api/elements/clear');
      expect((await request.post('/api/elements/batch', { data: { elements: [
        { id: 'secret', type: 'rectangle', x: 100, y: 100, width: 200, height: 60, label: { text: 'Unreleased pricing page' } }
      ] } })).ok()).toBeTruthy();

      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        await page.goto(url(), { waitUntil: 'domcontentloaded' });
        const result = await page.evaluate(attack, baseURL);
        for (const [what, outcome] of Object.entries(result)) {
          expect(refused(outcome), `${name}: ${what} got through (${outcome})`).toBe(true);
        }
      } finally {
        await context.close();
      }

      const left = (await (await request.get('/api/elements')).json()).elements;
      expect(left.map(e => e.id)).toContain('secret');
      expect(left.filter(e => e.type === 'rectangle')).toHaveLength(1);
    });
  }
});
