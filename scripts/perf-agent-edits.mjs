#!/usr/bin/env node
// Fire a burst of agent edits at a canvas server, to time how the open tab
// absorbs them (T-029, T-030). It only sends; the timing is taken in the tab.
//
//   node scripts/perf-agent-edits.mjs update 20 150 3011   move element s1 20 times, 150 ms apart
//   node scripts/perf-agent-edits.mjs create 60 10 3011    add 60 rectangles one by one, 10 ms apart
//
// Point it at a throwaway canvas (EXCALIDRAW_NO_PERSIST=1 on its own port),
// never at the canvas holding a real drawing: it edits whatever is there.
// `update` needs an element with id s1 on that canvas.

const [mode = 'update', n = '20', gap = '150', port = '3011'] = process.argv.slice(2)
if (mode !== 'update' && mode !== 'create') {
  console.error('mode must be update or create')
  process.exit(2)
}
const base = `http://localhost:${port}/api/elements`
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const json = { 'Content-Type': 'application/json' }

const t0 = Date.now()
for (let i = 0; i < Number(n); i++) {
  const res = mode === 'update'
    ? await fetch(`${base}/s1`, { method: 'PUT', headers: json, body: JSON.stringify({ x: 120 + (i % 2) * 4 }) })
    : await fetch(base, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({
        type: 'rectangle', x: 2000 + (i % 20) * 60, y: 100 + Math.floor(i / 20) * 60, width: 50, height: 50
      })
    })
  if (!res.ok) {
    console.error(`request ${i + 1} failed: HTTP ${res.status} ${await res.text()}`)
    process.exit(1)
  }
  await wait(Number(gap))
}
console.log(`${mode} x${n} sent in ${Date.now() - t0} ms`)
