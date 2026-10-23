// T-023: a tab that outlives its canvas server. Each test runs its own server on its own port, so
// it can kill it under an open tab the way a crash or a reboot does (`SIGKILL`: no save on the way
// out). The tab's reconnection is held at a gate until the test has set up the server it is to
// find, then released.
import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { frameScene } from './fixtures.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const port = Number(process.env.CANVAS_TEST_PORT || 51910) + 7;
const url = `http://127.0.0.1:${port}`;
const syncButton = page => page.getByRole('button', { name: 'Sync to Backend', exact: true });

async function boot(env) {
  const child = spawn(process.execPath, [join(root, 'dist', 'server.js')], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', LOG_LEVEL: 'error', ...env },
    stdio: 'ignore',
  });
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`canvas server on ${port} exited (code ${child.exitCode})`);
    try { if ((await fetch(`${url}/health`)).ok) return child; } catch { /* still starting */ }
    await new Promise(r => setTimeout(r, 100));
  }
  child.kill();
  throw new Error(`canvas server on ${port} did not answer`);
}

const crash = child => new Promise(resolve => {
  if (!child || child.exitCode !== null) return resolve();
  child.once('exit', resolve);
  child.kill('SIGKILL');
});
const get = async path => (await fetch(`${url}${path}`)).json();
const send = (method, path, data) => fetch(`${url}${path}`, {
  method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(data),
});
const ids = async () => (await get('/api/elements')).elements.map(e => e.id).sort();
const FRAME_IDS = frameScene().map(e => e.id).sort();

// Text is drawn on the canvas, not in the DOM. What the tab holds is read by having it send its
// scene: a sync deletes on the server whatever the tab lacks.
async function tabScene(page) {
  await expect(syncButton(page)).toBeEnabled({ timeout: 15000 });
  const synced = page.waitForResponse(r => r.url().endsWith('/api/elements/sync') && r.request().method() === 'POST');
  await syncButton(page).click();
  expect((await synced).ok()).toBeTruthy();
  return (await get('/api/elements')).elements;
}

// The save lands a moment after the writes stop: wait until the file holds the current revision.
async function savedScene() {
  const { sceneFile, rev } = await get('/health');
  await expect.poll(() => {
    try { return JSON.parse(readFileSync(sceneFile, 'utf-8')).revision; } catch { return null; }
  }).toBe(rev);
  return sceneFile;
}

// Holds the tab's next connection until release(): the tab is left reconnecting, the server not.
async function socketGate(page) {
  let held = false;
  const waiting = [];
  await page.routeWebSocket(url => url.port === String(port), async socket => {
    if (held) await new Promise(resolve => waiting.push(resolve));
    socket.connectToServer();
  });
  return {
    hold: () => { held = true; },
    release: () => { held = false; waiting.splice(0).forEach(resolve => resolve()); },
  };
}

async function openTab(page, gate) {
  await page.goto(url);
  await expect(page.getByText('repro-frame', { exact: true })).toBeVisible();
  await expect(syncButton(page)).toBeEnabled();
  gate.hold();
}

let server;
let dir;
test.afterEach(async () => {
  await crash(server);
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

test('a tab keeps its drawing when its server comes back empty, and gives it back', async ({ page }) => {
  const memory = { EXCALIDRAW_NO_PERSIST: '1' };
  server = await boot(memory);
  await send('POST', '/api/elements/sync', { elements: frameScene() });
  const gate = await socketGate(page);
  await openTab(page, gate);
  const { instanceId } = await get('/health');

  await crash(server);
  await expect(page.getByText('Disconnected', { exact: true })).toBeVisible();
  server = await boot(memory);
  expect(await ids()).toEqual([]);
  expect((await get('/health')).instanceId).not.toBe(instanceId);

  gate.release();
  await expect.poll(ids, { timeout: 15000 }).toEqual(FRAME_IDS);
  await expect(page.getByText('repro-frame', { exact: true })).toBeVisible();
  const held = await tabScene(page);
  expect(held.map(e => e.id).sort()).toEqual(FRAME_IDS);
  expect(held.find(e => e.id === 'text-repro-1').text).toBe('Hello inside frame');
});

test('a server that comes back from disk without the last edit gets it from the tab', async ({ page }) => {
  dir = mkdtempSync(join(tmpdir(), 'canvas-restart-'));
  const disk = { EXCALIDRAW_NO_PERSIST: '0', EXCALIDRAW_SCENE_DIR: dir };
  server = await boot(disk);
  await send('POST', '/api/elements/sync', { elements: frameScene() });
  const gate = await socketGate(page);
  await page.goto(url);
  await expect(syncButton(page)).toBeEnabled();
  const sceneFile = await savedScene();
  const beforeLastEdit = readFileSync(sceneFile, 'utf-8');

  await send('POST', '/api/elements', { id: 'late', type: 'rectangle', x: 500, y: 350, width: 160, height: 80, label: { text: 'Late edit' } });
  await page.waitForTimeout(500); // the broadcast reaches the tab before it sends its scene
  expect((await tabScene(page)).map(e => e.id)).toContain('late');
  gate.hold();
  await crash(server);
  // As if the process died before that edit's save landed.
  writeFileSync(sceneFile, beforeLastEdit);
  server = await boot(disk);
  expect(await ids()).toEqual(FRAME_IDS);

  gate.release();
  await expect.poll(ids, { timeout: 15000 }).toContain('late');
  expect(await ids()).toEqual(expect.arrayContaining(FRAME_IDS));
  await expect(page.getByText('repro-frame', { exact: true })).toBeVisible();
  const labels = (await tabScene(page)).filter(e => e.type === 'text').map(e => e.text);
  expect(labels).toContain('Late edit');
});

test("an agent's change after the restart is not undone by the tab", async ({ page }) => {
  dir = mkdtempSync(join(tmpdir(), 'canvas-restart-'));
  const disk = { EXCALIDRAW_NO_PERSIST: '0', EXCALIDRAW_SCENE_DIR: dir };
  server = await boot(disk);
  await send('POST', '/api/elements/sync', { elements: frameScene() });
  const gate = await socketGate(page);
  await openTab(page, gate);
  await savedScene();

  await crash(server);
  server = await boot(disk);
  expect(await ids()).toEqual(FRAME_IDS);
  const changed = await send('PUT', '/api/elements/text-repro-1', { text: 'Changed by the agent' });
  expect(changed.ok).toBeTruthy();

  gate.release();
  const held = await tabScene(page);
  expect(held.find(e => e.id === 'text-repro-1').text).toBe('Changed by the agent');
  expect(held.find(e => e.id === 'text-repro-2').text).toBe('Second text inside frame');
});
