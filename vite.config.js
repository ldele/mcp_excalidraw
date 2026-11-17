import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Fork (T-017): the dev page's API calls and socket go to the canvas as its own page. See
// scripts/vite-dev-proxy.mjs and FORK.md.
import { canvasProxy } from './scripts/vite-dev-proxy.mjs'

export default defineConfig({
  root: 'frontend',
  plugins: [react()],
  build: {
    outDir: '../dist/frontend',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Excalidraw's font subsetting worker looks for these files by their
        // original (unhashed) names. Preserve them so the 404 doesn't break export.
        chunkFileNames: (chunkInfo) => {
          if (chunkInfo.name.startsWith('subset-')) {
            return 'assets/[name].js'
          }
          return 'assets/[name]-[hash].js'
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: canvasProxy('http://127.0.0.1:3000'),
  },
})
