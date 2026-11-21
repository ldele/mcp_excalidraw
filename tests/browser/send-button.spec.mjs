// The header's "Send to Claude" button (ADR-007 option 3, SPEC-009).
//
// It shows only on a scene with the legend's Send box; a click draws a tick in the box and saves
// the scene, and the server then holds a sent round by the one send rule (src/core/send-box.ts).
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { sendState, isSent } = await import(pathToFileURL(join(root, 'dist', 'core', 'send-box.js')).href);
const legend = JSON.parse(readFileSync(
  join(root, 'skills', 'excalidraw-skill', 'references', 'markup-legend.json'), 'utf8')).create;

const sendButton = page => page.getByRole('button', { name: 'Send to Claude', exact: true });

async function scene(request) {
  const response = await request.get('/api/elements');
  expect(response.ok()).toBeTruthy();
  return (await response.json()).elements;
}

test.beforeEach(async ({ request }) => {
  expect((await request.delete('/api/elements/clear')).ok()).toBeTruthy();
});

test('no Send box, no button', async ({ page, request }) => {
  const response = await request.post('/api/elements', {
    data: { id: 'lone', type: 'rectangle', x: 0, y: 0, width: 100, height: 60 }
  });
  expect(response.ok()).toBeTruthy();
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Sync to Backend', exact: true })).toBeEnabled();
  await expect(sendButton(page)).toHaveCount(0);
});

test('a click ticks the Send box and the server reads the round as sent', async ({ page, request }) => {
  // The agent draws the legend: its write to the box is where the round starts.
  const response = await request.post('/api/elements/batch', { data: { elements: legend } });
  expect(response.ok()).toBeTruthy();
  expect(isSent(sendState(await scene(request)))).toBe(false);

  await page.goto('/');
  await expect(sendButton(page)).toBeEnabled();
  await sendButton(page).click();
  await expect(page.getByText('✅ Sent')).toBeVisible();

  const elements = await scene(request);
  const state = sendState(elements);
  expect(isSent(state)).toBe(true);
  const [tickId] = [...state.tickIds];
  const tick = elements.find(el => el.id === tickId);
  expect(tick).toMatchObject({ type: 'line', origin: 'human' });
  expect(tickId.startsWith('legend-send-tick-')).toBe(true);
});
