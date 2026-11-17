// A shape moved through the API drags its bound arrows, before and after a tab syncs (T-018).
//
// From the probe of 2026-10-08 (DEVLOG archive 2026-10-08 (e)), kept outside the repository until
// T-018: upstream's sync clears the store and rewrites it, so after a tab's first sync the stored
// arrows lose `start` / `end` and an API move leaves them behind; this fork reconciles per element,
// and they follow. The state check `bound arrows follow a shape an agent moves after a tab has
// synced` builds the tab's payload itself; this one lets a real tab send it, so a change to what
// the page syncs is seen here.
import { test, expect } from '@playwright/test';

const fill = { backgroundColor: '#a5d8ff', fillStyle: 'solid' };
const SCENE = [
  { id: 'from', type: 'rectangle', x: 100, y: 100, width: 160, height: 44, ...fill },
  { id: 'to', type: 'rectangle', x: 600, y: 400, width: 160, height: 44, ...fill },
  { id: 'routed', type: 'arrow', x: 260, y: 122,
    points: [[0, 0], [120, 0], [120, 300], [340, 300]],
    start: { id: 'from' }, end: { id: 'to' } },
  { id: 'plain', type: 'arrow', x: 0, y: 0, start: { id: 'from' }, end: { id: 'to' } },
];

const syncButton = page => page.getByRole('button', { name: 'Sync to Backend', exact: true });

async function arrows(request) {
  const response = await request.get('/api/elements');
  expect(response.ok()).toBeTruthy();
  const elements = (await response.json()).elements;
  const of = id => {
    const e = elements.find(x => x.id === id);
    expect(e, `arrow ${id} is still stored`).toBeTruthy();
    return {
      path: JSON.stringify(e.points.map(([px, py]) => [Math.round(e.x + px), Math.round(e.y + py)])),
      refs: [e.start?.id ?? e.startBinding?.elementId ?? null, e.end?.id ?? e.endBinding?.elementId ?? null]
    };
  };
  return { routed: of('routed'), plain: of('plain') };
}

test('both bound arrows follow every API move of a bound shape, in every tab state', async ({ page, request }) => {
  const move = async (id, y) => {
    expect((await request.put(`/api/elements/${id}`, { data: { y } })).ok()).toBeTruthy();
  };
  const manualSync = async () => {
    await expect(syncButton(page)).toBeEnabled();
    const done = page.waitForResponse(r => r.url().endsWith('/api/elements/sync') && r.request().method() === 'POST');
    await syncButton(page).click();
    expect((await done).ok()).toBeTruthy();
  };
  // Move a shape and expect both stored arrows to have moved with it, still bound to both ends.
  const movesArrows = async (state, id, y) => {
    const before = await arrows(request);
    await move(id, y);
    const after = await arrows(request);
    for (const name of ['routed', 'plain']) {
      expect(after[name].path, `${state}: ${name} did not follow`).not.toBe(before[name].path);
      expect(after[name].refs, `${state}: ${name} lost a binding`).toEqual(['from', 'to']);
    }
  };

  await request.post('/api/elements/sync', { data: { elements: [], allowEmpty: true } });
  expect((await request.post('/api/elements/batch', { data: { elements: SCENE } })).ok()).toBeTruthy();
  await movesArrows('no tab', 'to', 500);

  await page.goto('/');
  await expect(syncButton(page)).toBeEnabled();
  await page.waitForTimeout(1500);
  await movesArrows('a tab attached, not yet synced', 'to', 400);

  await manualSync();
  await movesArrows('after a manual sync', 'to', 500);

  await page.reload();
  await expect(syncButton(page)).toBeEnabled();
  await page.waitForTimeout(1500);
  await movesArrows('after a reload', 'from', 40);

  // The tab's own automatic sync, set off by a click on empty canvas.
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas.interactive') || document.querySelector('.excalidraw canvas');
    const b = c.getBoundingClientRect();
    return { left: b.left, top: b.top };
  });
  await page.mouse.click(box.left + 1000, box.top + 700);
  await page.waitForTimeout(1500);
  await movesArrows('after the tab synced by itself', 'from', 100);

  // A person drags the target in the tab (x 600..760, y 500..544, unscrolled, zoom 1), so the tab
  // itself rewrites both arrows; then an agent moves the shapes again.
  await page.mouse.move(box.left + 680, box.top + 522);
  await page.mouse.down();
  await page.mouse.move(box.left + 680, box.top + 422, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(1500);
  await manualSync();
  await movesArrows("after a person's drag, the source", 'from', 40);
  await movesArrows("after a person's drag, the target", 'to', 500);
});
