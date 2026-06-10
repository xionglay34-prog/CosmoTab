import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        index: 'index.html',
        popup: 'popup.html',
        sidepanel: 'sidepanel.html',
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
