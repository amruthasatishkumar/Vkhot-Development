import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward /api/* requests to the Express backend in dev
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        // Disable proxy timeout so long-running NDJSON streams (5-min waits)
        // are not silently killed by the Vite dev proxy.
        proxyTimeout: 0,
        timeout: 0,
      },
    },
  },
});
