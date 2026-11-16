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
import { readFileSync, statSync, rmSync, mkdtempSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
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

// Boots dist/server.js on `atPort` and resolves once /health answers. The scene stays in memory
// unless `env` says otherwise (T-023): a saved one would carry over from the last run.
async function bootCanvas(atPort, env = {}) {
  const child = spawn(process.execPath, [join(__dirname, '..', 'dist', 'server.js')], {
    env: { ...process.env, PORT: String(atPort), HOST: '127.0.0.1', EXCALIDRAW_NO_PERSIST: '1', ...env },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  child.stdout.on('data', d => { output += d; });
  child.stderr.on('data', d => { output += d; });
  const url = `http://127.0.0.1:${atPort}`;
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      await new Promise(r => setTimeout(r, 200)); // let the pipes drain so the reason is in `output`
      throw new Error(`canvas server exited early (code ${child.exitCode}) on port ${atPort}:\n${output}`);
    }
    try { if ((await fetch(`${url}/health`)).ok) return child; } catch { /* still starting */ }
    await new Promise(r => setTimeout(r, 100));
  }
  child.kill();
  throw new Error(`canvas server did not answer on ${url}:\n${output}`);
}

before(async () => { server = await bootCanvas(port); });

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

// ─── Toolkit hazards met while re-exporting UI-Wizard's dashboard (2026-10-06/07) ───

describe('a label keeps its typography through export and import', () => {
  // The create path moves a shape's fontSize/fontFamily onto its `label` (a rectangle has no font
  // of its own). Export then read them off the shape, found nothing, and wrote every label as
  // family 1 at 16 px: a wireframe set in Helvetica came back from its own file in Virgil.
  test('a label that sets its font, size and colour exports them and re-imports them', async () => {
    const { importScene, buildSceneFile } = await import(dist('core', 'scene-io.js'));
    await api('/api/elements/clear', { method: 'DELETE' });
    await api('/api/elements/batch', {
      method: 'POST',
      ...json({ elements: [
        { id: 'save', type: 'rectangle', x: 0, y: 0, width: 120, height: 40, strokeColor: '#d7d5cc',
          label: { text: 'Save', fontFamily: 2, fontSize: 13, strokeColor: '#1a1a1a' } },
        // the shorthand: typography passed beside `text` on the shape
        { id: 'cancel', type: 'rectangle', x: 140, y: 0, width: 120, height: 40, text: 'Cancel', fontFamily: 'helvetica', fontSize: 13 }
      ] })
    });

    const { scene } = await buildSceneFile();
    const exported = id => scene.elements.find(e => e.type === 'text' && e.containerId === id);
    assert.equal(exported('save').fontFamily, 2);
    assert.equal(exported('save').fontSize, 13);
    assert.equal(exported('save').strokeColor, '#1a1a1a', 'the label colour, not the border colour');
    assert.equal(exported('cancel').fontFamily, 2);
    assert.equal(exported('cancel').fontSize, 13);
    assert.equal(exported('cancel').textAlign, 'center');

    await importScene({ data: JSON.stringify(scene), mode: 'replace' });
    const { elements } = await api('/api/elements');
    const stored = id => elements.find(e => e.type === 'text' && e.containerId === id);
    assert.equal(stored('save').fontFamily, 2);
    assert.equal(stored('save').fontSize, 13);
    assert.equal(stored('cancel').fontFamily, 2);

    // and a second trip through the file changes nothing
    const again = (await buildSceneFile()).scene.elements.find(e => e.type === 'text' && e.containerId === 'save');
    assert.equal(again.fontFamily, 2);
    assert.equal(again.fontSize, 13);
    assert.equal(again.strokeColor, '#1a1a1a');
  });

  // What an unset font renders as on the canvas is Excalifont (5). The change log treats unset and
  // 5 as the same thing, so the file has to as well, or a scene nobody restyled exports in Virgil.
  test('text and labels with no font export in the editor default', async () => {
    const { buildSceneFile } = await import(dist('core', 'scene-io.js'));
    await api('/api/elements/clear', { method: 'DELETE' });
    await api('/api/elements/batch', {
      method: 'POST',
      ...json({ elements: [
        { id: 'title', type: 'text', x: 0, y: 0, text: 'Settings', fontSize: 24 },
        { id: 'ok', type: 'rectangle', x: 0, y: 60, width: 120, height: 40, text: 'OK' }
      ] })
    });
    const { scene } = await buildSceneFile();
    assert.equal(scene.elements.find(e => e.id === 'title').fontFamily, 5);
    assert.equal(scene.elements.find(e => e.containerId === 'ok').fontFamily, 5);
  });
});

describe('a sync cannot empty the canvas by accident', () => {
  // POST /api/elements/sync reads "absent from the payload" as "the person deleted it". A page
  // that failed to load its scene therefore deleted the scene: on 2026-10-06 one such sync removed
  // all 98 elements of a drawing. The page no longer sends that sync, but the server is the one
  // holding the drawing, and an old tab or a script can still send it.
  const seed = async () => {
    await api('/api/elements/clear', { method: 'DELETE' });
    await api('/api/elements/batch', {
      method: 'POST',
      ...json({ elements: [
        { id: 'keep-a', type: 'rectangle', x: 0, y: 0, width: 100, height: 40 },
        { id: 'keep-b', type: 'rectangle', x: 0, y: 60, width: 100, height: 40 }
      ] })
    });
    return (await api('/api/changes?since=0')).rev;
  };
  const sync = body => fetch(`${baseUrl}/api/elements/sync`, { method: 'POST', ...json(body) });

  test('an empty sync against a drawing is refused and deletes nothing', async () => {
    const since = await seed();
    const response = await sync({ elements: [], timestamp: new Date().toISOString() });
    assert.equal(response.status, 409);
    const body = await response.json();
    assert.equal(body.success, false);
    assert.match(body.error, /allowEmpty/);

    const { elements } = await api('/api/elements');
    assert.deepEqual(elements.map(e => e.id).sort(), ['keep-a', 'keep-b']);
    const feed = await api(`/api/changes?since=${since}`);
    assert.equal(feed.records.length, 0, 'a refused sync leaves no record');
  });

  test('a payload with nothing usable in it is refused the same way', async () => {
    await seed();
    const response = await sync({ elements: [null, 'x'] });
    assert.equal(response.status, 409);
    assert.equal((await api('/api/elements')).elements.length, 2);
  });

  test('the same sync with allowEmpty clears the canvas and records who did it', async () => {
    const since = await seed();
    const response = await sync({ elements: [], allowEmpty: true });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).removed, 2);
    assert.equal((await api('/api/elements')).elements.length, 0);
    const feed = await api(`/api/changes?since=${since}`);
    assert.deepEqual(feed.records.map(r => `${r.origin} ${r.kind} ${r.id}`).sort(), ['human delete keep-a', 'human delete keep-b']);
  });

  test('deleting some elements, or syncing nothing to an empty canvas, needs no flag', async () => {
    await seed();
    const partial = await sync({ elements: [{ id: 'keep-a', type: 'rectangle', x: 0, y: 0, width: 100, height: 40 }] });
    assert.equal(partial.status, 200);
    assert.deepEqual((await api('/api/elements')).elements.map(e => e.id), ['keep-a']);

    await api('/api/elements/clear', { method: 'DELETE' });
    assert.equal((await sync({ elements: [] })).status, 200);
  });
});

describe('the first sync from a tab is not an edit, and is not thrown away either', () => {
  // The echo guard (tests/frontend-echo.test.mjs) keeps an untouched element `agent`. The server
  // used to learn a text element's measured box only because that guard had holes: with them
  // closed, a text element drawn without a size would stay without one, and the reading drops an
  // element that has no box (T-001).
  test('unsized text takes the box the editor measured, and stays the agent\'s', async () => {
    await api('/api/elements/clear', { method: 'DELETE' });
    const authored = [
      { id: 'big', type: 'rectangle', x: 0, y: 0, width: 600, height: 400, backgroundColor: '#ffe3e3', fillStyle: 'solid' },
      { id: 'title', type: 'text', x: 20, y: 20, text: 'Agent drew this', fontSize: 28 },
      { id: 'sized', type: 'text', x: 20, y: 80, width: 400, height: 34, text: 'Hinted', fontSize: 26 }
    ];
    await api('/api/elements/batch', { method: 'POST', ...json({ elements: authored }) });
    const { rev: since } = await api('/api/changes?since=0');

    // what the page sends back after rendering, nothing touched
    const filled = { fillStyle: 'solid', strokeStyle: 'solid', strokeWidth: 2, roughness: 1, opacity: 100, strokeColor: '#1e1e1e' };
    const echoed = [
      { ...authored[0], ...filled },
      { ...authored[1], ...filled, backgroundColor: 'transparent', textAlign: 'left', fontFamily: 5, width: 205.94, height: 35 },
      { ...authored[2], ...filled, backgroundColor: 'transparent', textAlign: 'left', fontFamily: 5, width: 88.2, height: 32.5 }
    ];
    const result = await api('/api/elements/sync', { method: 'POST', ...json({ elements: echoed }) });
    assert.equal(result.updated, 0);

    const feed = await api(`/api/changes?since=${since}`);
    assert.deepEqual(feed.records, [], 'opening a tab is not feedback');

    const { elements } = await api('/api/elements');
    const stored = id => elements.find(e => e.id === id);
    assert.equal(stored('title').width, 205.94);
    assert.equal(stored('title').height, 35);
    assert.equal(stored('title').origin, 'agent');
    assert.equal(stored('big').origin, 'agent');
    assert.equal(stored('sized').width, 400, 'a box the author gave is the author\'s');
  });
});

describe("a tab's first click leaves the agent's scene the agent's (T-010, T-007)", () => {
  // The whole path, against the server: what the agent drew, then the sync one tab sent after its
  // first click (shapes grown to fit their labels, a label wrapped, a bound arrow given its box).
  test('fitted labels and a routed arrow leave no record, and the reading keeps its flow', async () => {
    await api('/api/elements/clear', { method: 'DELETE' });
    await api('/api/elements/batch', {
      method: 'POST',
      ...json({ elements: [
        { id: 'screen', type: 'rectangle', x: 0, y: 0, width: 900, height: 500, backgroundColor: '#ffffff', strokeColor: '#14130f', role: 'screen' },
        { id: 'title', type: 'text', x: 24, y: 24, width: 200, height: 32, text: 'Probe screen', fontSize: 26, fontFamily: 2, strokeColor: '#14130f' },
        { id: 'badge', type: 'rectangle', x: 40, y: 100, width: 36, height: 20, backgroundColor: '#74c0fc', strokeColor: '#1971c2', label: { text: '3', fontSize: 11 } },
        { id: 'narrow', type: 'rectangle', x: 120, y: 100, width: 64, height: 28, backgroundColor: '#74c0fc', strokeColor: '#1971c2', label: { text: 'Dismiss', fontSize: 16 } },
        { id: 'from', type: 'rectangle', x: 40, y: 220, width: 160, height: 80, backgroundColor: '#ffffff', strokeColor: '#d7d5cc', role: 'card' },
        { id: 'to', type: 'rectangle', x: 500, y: 320, width: 160, height: 80, backgroundColor: '#ffffff', strokeColor: '#d7d5cc', role: 'card' },
        { id: 'flow', type: 'arrow', x: 0, y: 0, start: { id: 'from' }, end: { id: 'to' }, strokeColor: '#14130f' }
      ] })
    });
    const { elements: drawn } = await api('/api/elements');
    const { rev: since } = await api('/api/changes?since=0');
    const wireframe = () => JSON.parse(execFileSync(process.execPath, [join(__dirname, '..', 'dist', 'bin.js'), 'wireframe', '--json'], {
      env: { ...process.env, EXPRESS_SERVER_URL: baseUrl, EXCALIDRAW_NO_AUTOSTART: '1' }, encoding: 'utf-8'
    }));
    assert.equal(wireframe().flows.length, 1, 'the arrow reads as a flow before any tab');

    // What the tab sends back: every shape with the editor's defaults, labels as bound text.
    const filled = { fillStyle: 'solid', strokeStyle: 'solid', strokeWidth: 2, roughness: 1, opacity: 100 };
    const boundText = (id, text, originalText, height, fontSize) => ({
      id: `${id}-label`, type: 'text', x: 0, y: 0, width: 40, height, text, originalText, containerId: id,
      fontSize, fontFamily: 5, textAlign: 'center', verticalAlign: 'middle', ...filled, strokeColor: '#1971c2', backgroundColor: 'transparent'
    });
    const echoed = drawn.flatMap(el => {
      const { label, start, end, rev, origin, createdAt, updatedAt, version, ...rest } = el;
      if (el.id === 'badge') return [{ ...rest, ...filled, height: 24, boundElements: [{ type: 'text', id: 'badge-label' }] }, boundText('badge', '3', '3', 13.75, 11)];
      if (el.id === 'narrow') return [{ ...rest, ...filled, height: 50, boundElements: [{ type: 'text', id: 'narrow-label' }] }, boundText('narrow', 'Dismis\ns', 'Dismiss', 40, 16)];
      if (el.id === 'flow') {
        const last = el.points[el.points.length - 1];
        return [{ ...rest, ...filled, width: Math.abs(last[0]), height: Math.abs(last[1]), startArrowhead: null, endArrowhead: 'arrow',
          startBinding: { elementId: 'from', focus: 0, gap: 8 }, endBinding: { elementId: 'to', focus: 0, gap: 8 } }];
      }
      return [{ ...rest, ...filled }];
    });
    const result = await api('/api/elements/sync', { method: 'POST', ...json({ elements: echoed }) });
    assert.equal(result.success, true);
    assert.equal(result.updated, 0, 'nothing a person did');

    const feed = await api(`/api/changes?since=${since}`);
    assert.deepEqual(feed.records.map(r => `${r.origin} ${r.kind} ${r.id}`), []);

    const { elements } = await api('/api/elements');
    const stored = id => elements.find(e => e.id === id);
    assert.equal(stored('badge').height, 24, 'the size on the canvas is the size on the server');
    assert.equal(stored('narrow').height, 50);
    assert.equal(stored('badge').origin, 'agent');
    assert.equal(stored('flow').origin, 'agent');

    const reading = wireframe();
    assert.equal(reading.flows.length, 1, 'still a flow, not an annotation');
    assert.equal(reading.markup.length, 0);
    assert.match(JSON.stringify(reading.screens), /"label":"Dismiss"/, 'the label reads unwrapped');
  });
});

// T-023: a canvas killed outright (a crash, a reboot) came back empty, and the tab still open on it
// then loaded that empty scene over its own drawing. The scene is now saved per port and read back
// on start. `kill('SIGKILL')` leaves the server no chance to save on its way out, as a reboot does.
describe('a canvas that restarts comes back with its drawing (T-023)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'canvas-scene-'));
  const at = 36000 + Math.floor(Math.random() * 1000);
  const persist = { EXCALIDRAW_NO_PERSIST: '0', EXCALIDRAW_SCENE_DIR: dir };
  const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  const call = atPort => async (path, init) => (await fetch(`http://127.0.0.1:${atPort}${path}`, init)).json();
  const crash = child => new Promise(resolve => { child.once('exit', resolve); child.kill('SIGKILL'); });
  const rectangle = id => ({ method: 'POST', ...json({ id, type: 'rectangle', x: 0, y: 0, width: 40, height: 40 }) });
  // The save lands a moment after the writes stop: wait until the file holds this revision.
  const saved = async (file, rev) => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      try { if (JSON.parse(readFileSync(file, 'utf-8')).revision === rev) return; } catch { /* not written yet */ }
      await new Promise(r => setTimeout(r, 50));
    }
    throw new Error(`${file} never reached rev ${rev}`);
  };

  after(() => rmSync(dir, { recursive: true, force: true }));

  test('elements, image files, snapshots and the change feed survive a kill', async () => {
    const canvas = call(at);
    let child = await bootCanvas(at, persist);
    let before;
    try {
      await canvas('/api/elements', { method: 'POST', ...json({ id: 'card', type: 'rectangle', x: 0, y: 0, width: 160, height: 80, role: 'card', label: { text: 'Card' } }) });
      await canvas('/api/files', { method: 'POST', ...json({ files: [{ id: 'pixel', mimeType: 'image/png', created: 1, dataURL: PIXEL }] }) });
      await canvas('/api/elements', { method: 'POST', ...json({ id: 'photo', type: 'image', x: 200, y: 0, width: 30, height: 30, fileId: 'pixel' }) });
      await canvas('/api/snapshots', { method: 'POST', ...json({ name: 'before-markup' }) });
      // A person's note, sent the way a tab sends it.
      const { elements: drawn } = await canvas('/api/elements');
      const note = { id: 'note', type: 'text', x: 0, y: 120, width: 120, height: 25, text: 'Make it wider', originalText: 'Make it wider' };
      await canvas('/api/elements/sync', { method: 'POST', ...json({ elements: [...drawn, note] }) });

      const read = async () => ({
        health: await canvas('/health'),
        elements: (await canvas('/api/elements')).elements,
        files: (await canvas('/api/files')).files,
        snapshots: (await canvas('/api/snapshots')).snapshots,
        changes: await canvas('/api/changes?since=0')
      });
      before = await read();
      assert.ok(before.health.sceneFile.startsWith(dir), 'saved where EXCALIDRAW_SCENE_DIR says');
      await saved(before.health.sceneFile, before.health.rev);
      await crash(child);

      child = await bootCanvas(at, persist);
      const restored = await read();
      assert.deepEqual(restored.elements, before.elements, 'every element, with its role, origin and rev');
      assert.equal(restored.elements.find(e => e.id === 'card').role, 'card');
      assert.deepEqual(restored.files, before.files);
      assert.deepEqual(restored.snapshots, before.snapshots);
      assert.deepEqual(restored.changes, before.changes, '`changes --since N` answers as it did');
      assert.ok(restored.changes.records.some(r => r.id === 'note' && r.origin === 'human'), 'the markup is still in the feed');
      assert.equal(restored.health.sceneId, before.health.sceneId, 'the same drawing');
      assert.notEqual(restored.health.instanceId, before.health.instanceId, 'in a new process');

      await canvas('/api/elements', rectangle('later'));
      assert.equal((await canvas('/health')).rev, before.health.rev + 1, 'the revision goes on from where it was');
    } finally {
      child.kill();
    }

    // One file per port: a canvas on another port does not start from this drawing.
    const other = await bootCanvas(at + 1, persist);
    try {
      const health = await call(at + 1)('/health');
      assert.equal(health.elements_count, 0);
      assert.notEqual(health.sceneFile, before.health.sceneFile);
    } finally {
      other.kill();
    }
  });

  test('EXCALIDRAW_NO_PERSIST=1 keeps the scene in memory only, as before', async () => {
    const memoryDir = mkdtempSync(join(tmpdir(), 'canvas-memory-'));
    const env = { EXCALIDRAW_NO_PERSIST: '1', EXCALIDRAW_SCENE_DIR: memoryDir };
    const canvas = call(at + 2);
    let child = await bootCanvas(at + 2, env);
    try {
      await canvas('/api/elements', rectangle('kept-in-memory'));
      assert.equal((await canvas('/health')).sceneFile, null);
      await new Promise(r => setTimeout(r, 600)); // longer than a save waits
      assert.deepEqual(readdirSync(memoryDir), [], 'nothing written');
      await crash(child);
      child = await bootCanvas(at + 2, env);
      assert.equal((await canvas('/health')).elements_count, 0);
    } finally {
      child.kill();
      rmSync(memoryDir, { recursive: true, force: true });
    }
  });

  test('a scene file it cannot read is moved aside, never written over', async () => {
    const file = join(dir, `scene-${at + 3}.json`);
    const broken = '{"format":"excalidraw-canvas-scene","version":1,"elements":[{"id":"cut-off';
    writeFileSync(file, broken);
    const canvas = call(at + 3);
    const child = await bootCanvas(at + 3, persist);
    try {
      assert.equal((await canvas('/health')).elements_count, 0, 'starts empty');
      const aside = readdirSync(dir).filter(name => name.startsWith(`scene-${at + 3}.unreadable-`));
      assert.equal(aside.length, 1, 'kept beside, under another name');
      assert.equal(readFileSync(join(dir, aside[0]), 'utf-8'), broken);
      await canvas('/api/elements', rectangle('fresh'));
      await saved(file, (await canvas('/health')).rev);
      assert.equal(readFileSync(join(dir, aside[0]), 'utf-8'), broken, 'the new save did not touch it');
      assert.ok(existsSync(file));
    } finally {
      child.kill();
    }
  });
});

describe('a patch can replace what it deletes, and a delete takes the label with it (T-022, T-025)', () => {
  const cli = (args, input) => JSON.parse(execFileSync(process.execPath, [join(__dirname, '..', 'dist', 'bin.js'), ...args], {
    env: { ...process.env, EXPRESS_SERVER_URL: baseUrl, EXCALIDRAW_NO_AUTOSTART: '1' },
    encoding: 'utf-8',
    input
  }));
  const add = element => api('/api/elements', { method: 'POST', ...json(element) });
  const box = (id, y = 0) => ({ id, type: 'rectangle', x: 0, y, width: 80, height: 40 });
  const label = (id, containerId) => ({ id, type: 'text', containerId, x: 10, y: 10, width: 40, height: 20, text: 'Save' });

  // T-022: apply ran create, then update, then delete, so the delete removed the new elements.
  test('a patch that deletes ids and creates them again keeps the new elements', async () => {
    await api('/api/elements/clear', { method: 'DELETE' });
    await add(box('cell'));
    const result = cli(['apply', '-'], JSON.stringify({ delete: ['cell'], create: [box('cell', 100), box('cell-2', 200)] }));
    assert.equal(result.deleted, 1);
    assert.equal(result.created, 2);
    const stored = await api('/api/elements/cell');
    assert.equal(stored.success, true, 'the re-created element is there');
    assert.equal(stored.element.y, 100, 'and it is the new one');
  });

  // T-025: the label stayed drawn where its shape had been, and the reading never counted it.
  test('deleting a shape deletes its bound label, and the feed reports it as the agent\'s', async () => {
    await api('/api/elements/clear', { method: 'DELETE' });
    await add(box('save'));
    await add(label('save-label', 'save'));
    await add(label('other-label', 'other'));
    const { rev: since } = await api('/api/changes?since=0');

    const response = await api('/api/elements/save', { method: 'DELETE' });
    assert.deepEqual(response.deleted, ['save', 'save-label']);
    assert.equal((await api('/api/elements/save-label')).success, false, 'the label is gone');
    assert.equal((await api('/api/elements/other-label')).success, true, 'a label of another shape is not');

    // A bound label is reported as its shape's (isChangeTracked), so one delete covers both.
    const feed = await api(`/api/changes?since=${since}`);
    assert.deepEqual(feed.records.map(r => [r.kind, r.id, r.origin]), [['delete', 'save', 'agent']]);
  });

  test('naming the label after its shape in the same delete is not an error', async () => {
    await api('/api/elements/clear', { method: 'DELETE' });
    await add(box('save'));
    await add(label('save-label', 'save'));
    assert.deepEqual(cli(['delete', 'save', 'save-label']).deleted, ['save', 'save-label']);
    await add(box('save'));
    await add(label('save-label', 'save'));
    assert.equal(cli(['apply', '-'], JSON.stringify({ delete: ['save', 'save-label'] })).deleted, 2);
  });

  test('a label whose shape is gone reads as the text it is', async () => {
    await api('/api/elements/clear', { method: 'DELETE' });
    await add({ ...label('stray', 'gone'), text: 'Stray' });
    const reading = cli(['wireframe', '--json']);
    assert.ok(JSON.stringify(reading).includes('"stray"'), 'the reading lists it');
    assert.equal(cli(['wireframe', '--score']).orphans, 1, 'and the score counts it');
  });
});

describe('text added without a size is in the reading when no tab is open (T-001)', () => {
  const run = args => execFileSync(process.execPath, [join(__dirname, '..', 'dist', 'bin.js'), ...args], {
    env: { ...process.env, EXPRESS_SERVER_URL: baseUrl, EXCALIDRAW_NO_AUTOSTART: '1' },
    encoding: 'utf-8'
  });

  // The documented happy path: a free-standing heading names its screen. With no size the server
  // stored none, the reading gave the text a 0x0 box and dropped it, and the screen went unnamed.
  test('an unsized heading names its screen, and the reading says its size is estimated', async () => {
    await api('/api/elements/clear', { method: 'DELETE' });
    await api('/api/elements/batch', {
      method: 'POST',
      ...json({
        elements: [
          { id: 's1', type: 'rectangle', x: 0, y: 0, width: 800, height: 600 },
          { id: 's1-title', type: 'text', x: 32, y: 24, fontSize: 26, text: 'Library' },
          { id: 's1-sub', type: 'text', x: 32, y: 70, fontSize: 14, text: '12 documents' }
        ]
      })
    });
    const stored = await api('/api/elements/s1-title');
    assert.ok(!stored.element.width, 'the server still stores no size: the estimate is the reading\'s');

    const score = JSON.parse(run(['wireframe', '--score']));
    assert.equal(score.unnamedScreens, 0);
    assert.equal(score.components, 3, 'the screen and both texts');
    const reading = run(['wireframe']);
    assert.match(reading, /Screen 1 "Library"/);
    assert.match(reading, /heading "Library" {2}\[s1-title\] text \d+x\d+ · 26px · size estimated/);
  });
});
