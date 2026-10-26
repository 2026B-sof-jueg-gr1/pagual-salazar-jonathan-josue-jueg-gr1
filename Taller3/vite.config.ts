import { defineConfig } from 'vite';

/**
 * Configuración de Vite.
 *
 * `base: './'` es clave para GitHub Pages: genera rutas relativas, así el build
 * funciona tanto en https://usuario.github.io/repo/ como en localhost.
 */
export default defineConfig({
  base: './',
  server: {
    port: 5178,
    host: '127.0.0.1',
    open: false,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 2000,
    sourcemap: false,
  },
});
