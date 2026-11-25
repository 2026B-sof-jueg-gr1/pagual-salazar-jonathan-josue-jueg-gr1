import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: resolve(__dirname, 'twinus'),
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5179,
    fs: { allow: [resolve(__dirname, '..')] },
  },
  build: {
    outDir: resolve(__dirname, 'dist-twinus'),
    emptyOutDir: true,
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
  },
});

