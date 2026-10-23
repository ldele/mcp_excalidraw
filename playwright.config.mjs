import { defineConfig } from '@playwright/test';

// Never attach these destructive fixture tests to an existing user's canvas.
const port = Number(process.env.CANVAS_TEST_PORT || 51910);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  fullyParallel: false,
  timeout: 30000,
  expect: { timeout: 10000 },
  use: {
    baseURL,
    browserName: 'chromium',
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node dist/server.js',
    // T-023: in memory, or every run would start from the scene the last one left on this port
    env: { HOST: '127.0.0.1', PORT: String(port), LOG_LEVEL: 'error', EXCALIDRAW_NO_PERSIST: '1' },
    url: `${baseURL}/health`,
    reuseExistingServer: false,
    timeout: 15000,
  },
});
