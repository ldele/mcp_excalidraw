// What the fork promises across an upstream merge, tested against a live canvas server.
//
// The corpus reads fixtures off disk and never touches the server, so it cannot see a defect in
// how the server stores, replaces or re-exports a scene. These tests can. Each boots
// `dist/server.js` on a private port — never the developer's own canvas on :3000.
//
// Written for the 2.1.2 merge (SPEC-002): upstream's atomic `replace` clears the store in the batch
// handler, a path the fork's change log did not cover, and scenes exported before 2.1.1 carry
// order keys (`a0 … a10 …`) that Excalidraw rejects.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generateKeyBetween } from 'fractional-indexing';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = (...p) => pathToFileURL(join(__dirname, '..', 'dist', ...p)).href;

const port = 35000 + Math.floor(Math.random() * 1000);
const baseUrl = `http://127.0.0.1:${port}`;
// Read at import time by dist/core/config.js — set before anything from dist is loaded.
process.env.EXPRESS_SERVER_URL = baseUrl;
process.env.EXCALIDRAW_NO_AUTOSTART = '1';

const json = value => ({ headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) });
const api = async (path, init) => (await fetch(`${baseUrl}${path}`, init)).json();

let server;
let output = '';

before(async () => {
  server = spawn(process.execPath, [join(__dirname, '..', 'dist', 'server.js')], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', d => { output += d; });
  server.stderr.on('data', d => { output += d; });
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      await new Promise(r => setTimeout(r, 200)); // let the pipes drain so the reason is in `output`
      throw new Error(`canvas server exited early (code ${server.exitCode}) on port ${port}:\n${output}`);
    }
    try { if ((await fetch(`${baseUrl}/health`)).ok) return; } catch { /* still starting */ }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`canvas server did not answer on ${baseUrl}:\n${output}`);
});

after(() => { server?.kill(); });

describe('a replace is a change the review loop can see', () => {
  // `import --replace` and `snapshot restore` both arrive as POST /api/elements/batch
  // { replace: true }. If the wipe is not recorded, `changes` reports a scene of additions with
  // nothing removed, and an agent reading the feed believes the old elements are still there.
  test('every element a replace removes is recorded as a delete', async () => {
    await api('/api/elements/clear', { method: 'DELETE' });
    for (const id of ['old-a', 'old-b']) {
      await api('/api/elements', { method: 'POST', ...json({ id, type: 'rectangle', x: 0, y: 0, width: 100, height: 40 }) });
    }
    const { rev: since } = await api('/api/changes?since=0');

    const replaced = await api('/api/elements/batch', {
      method: 'POST',
      ...json({ replace: true, elements: [{ id: 'new-a', type: 'rectangle', x: 0, y: 0, width: 100, height: 40 }] })
    });
    assert.equal(replaced.success, true);

    const feed = await api(`/api/changes?since=${since}`);
    const of = kind => feed.records.filter(r => r.kind === kind).map(r => r.id).sort();
    assert.deepEqual(of('delete'), ['old-a', 'old-b'], 'both removed elements are in the feed');
    assert.deepEqual(of('add'), ['new-a']);
    assert.ok(feed.records.every(r => r.origin === 'agent'), 'a replace is the agent\'s act, not a human\'s');
    assert.ok(feed.rev > since);
  });
});

// One stdio connection to dist/index.js: send the frames, collect `expected` responses.
function mcp(messages, expected) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(__dirname, '..', 'dist', 'index.js')], {
      env: { ...process.env, EXPRESS_SERVER_URL: baseUrl, EXCALIDRAW_NO_AUTOSTART: '1' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const responses = [];
    let buffer = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error(`MCP: ${responses.length}/${expected} responses`)); }, 20000);
    child.stdout.on('data', chunk => {
      buffer += chunk;
      let nl;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        const message = JSON.parse(line);
        if (message.id !== undefined) responses.push(message);
        if (responses.length === expected) { clearTimeout(timer); child.kill(); resolve(responses); }
      }
    });
    child.on('error', reject);
    for (const message of messages) child.stdin.write(JSON.stringify(message) + '\n');
  });
}

describe("the fork's MCP tools answer after upstream's split of src/index.ts", () => {
  const META = {
    'io.modelcontextprotocol/protocolVersion': '2026-07-28',
    'io.modelcontextprotocol/clientCapabilities': {},
    'io.modelcontextprotocol/clientInfo': { name: 'fork-contract-test', version: '0.0.0' }
  };
  const call = (id, name, args = {}) => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args, _meta: META } });

  test('describe_wireframe reads the canvas as an interface, get_canvas_changes reports it', async () => {
    await api('/api/elements/clear', { method: 'DELETE' });
    await api('/api/elements/batch', {
      method: 'POST',
      ...json({ elements: [
        { id: 'screen', type: 'rectangle', x: 0, y: 0, width: 800, height: 600, backgroundColor: '#ffffff' },
        { id: 'title', type: 'text', x: 24, y: 24, width: 300, height: 30, text: 'Settings', fontSize: 24 },
        { id: 'save', type: 'rectangle', x: 24, y: 520, width: 120, height: 40, backgroundColor: '#1e1e1e', text: 'Save' }
      ] })
    });

    const [wire, changes] = await mcp([call(1, 'describe_wireframe'), call(2, 'get_canvas_changes', { since: 0 })], 2)
      .then(r => [r.find(m => m.id === 1), r.find(m => m.id === 2)]);

    assert.equal(wire.error, undefined, JSON.stringify(wire.error));
    assert.notEqual(wire.result.isError, true);
    const reading = wire.result.content[0].text;
    assert.match(reading, /Wireframe reading/);
    assert.match(reading, /Settings/);
    assert.match(reading, /button/);

    assert.equal(changes.error, undefined, JSON.stringify(changes.error));
    assert.notEqual(changes.result.isError, true);
    assert.match(changes.result.content[0].text, /Save|Settings/);
  });
});

describe('a scene exported before 2.1.1 still works', () => {
  // UI-Wizard's dashboard drawing, exported by this fork at 7828a2d: 98 elements whose `index`
  // runs a0, a1, … a10, a12 … — invalid for Excalidraw (a trailing 0) and mis-sorted as strings.
  const scenePath = join(__dirname, 'legacy', 'ui-wizard-dashboard.excalidraw');
  const expected = JSON.parse(readFileSync(join(__dirname, 'legacy', 'ui-wizard-dashboard.read.json'), 'utf-8'));

  test('the fixture really carries the legacy keys', () => {
    const keys = JSON.parse(readFileSync(scenePath, 'utf-8')).elements.map(e => e.index);
    assert.ok(keys.includes('a10') && keys.includes('a80'));
    assert.throws(() => generateKeyBetween('a10', null), /invalid order key/);
  });

  // `render` reads the file straight off disk — no server, no browser — so nothing has re-keyed it.
  test('it renders offline, without a canvas server', () => {
    const out = join(tmpdir(), `fork-contract-${process.pid}.png`);
    const result = JSON.parse(execFileSync(process.execPath, [join(__dirname, '..', 'dist', 'bin.js'), 'render', scenePath, '--out', out], {
      env: { ...process.env, EXCALIDRAW_NO_AUTOSTART: '1', EXCALIDRAW_EXPORT_DIR: tmpdir() },
      encoding: 'utf-8'
    }));
    assert.equal(result.success, true);
    assert.equal(result.renderer, 'node');
    assert.ok(statSync(out).size > 50_000, `a ${statSync(out).size}-byte PNG is not a rendered dashboard`);
    rmSync(out, { force: true });
  });

  test('the server never stores the legacy keys an import brought', async () => {
    const { importScene } = await import(dist('core', 'scene-io.js'));
    await importScene({ data: readFileSync(scenePath, 'utf-8'), mode: 'replace' });
    const { elements } = await api('/api/elements');
    assert.equal(elements.length, 98);
    assert.ok(elements.every(e => e.index === undefined || e.index === null), 'a stored bad key is what stops the canvas page loading');
  });

  test('importing it gives the reading it had, and re-exporting it gives valid keys', async () => {
    const { importScene, buildSceneFile } = await import(dist('core', 'scene-io.js'));

    const imported = await importScene({ data: readFileSync(scenePath, 'utf-8'), mode: 'replace' });
    assert.equal(imported.count, 98);

    // The reading is the product: `wireframe --json` — the command that wrote UI-Wizard's file —
    // must print exactly what that repo committed for this scene.
    const reading = JSON.parse(execFileSync(process.execPath, [join(__dirname, '..', 'dist', 'bin.js'), 'wireframe', '--json'], {
      env: { ...process.env, EXPRESS_SERVER_URL: baseUrl, EXCALIDRAW_NO_AUTOSTART: '1' },
      encoding: 'utf-8'
    }));
    assert.deepEqual(reading, expected);

    const { scene } = await buildSceneFile();
    const keys = scene.elements.map(e => e.index);
    for (const key of keys) generateKeyBetween(key, null); // throws "invalid order key"
    assert.deepEqual(keys, [...keys].sort(), 'keys sort as strings in array order');
    assert.equal(new Set(keys).size, keys.length, 'keys are unique');
  });
});
