import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Entry-point for the Electron Main process.
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['ws', 'bufferutil', 'utf-8-validate'],
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onclean(options) {
          // Prevent preload build outputs from being deleted when the main process is rebuilt
        },
      },
    ]),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
