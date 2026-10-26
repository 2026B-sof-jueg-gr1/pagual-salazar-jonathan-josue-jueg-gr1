/**
 * Copia el build de `Taller3/dist` a la RAÍZ del repositorio.
 *
 * GitHub Pages, con "Deploy from a branch" → main → /(root), sirve el
 * index.html de la raíz. Por eso el resultado de Vite se publica ahí.
 *
 * Uso:  npm run publish:pages
 */
import { cpSync, existsSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');
const dist = resolve(projectRoot, 'dist');
const repoRoot = resolve(projectRoot, '..');

if (!existsSync(dist)) {
  console.error('✖ No existe Taller3/dist. Ejecuta "npm run build" primero.');
  process.exit(1);
}

// 1. Limpiar SOLO lo que genera el build en la raíz.
rmSync(resolve(repoRoot, 'assets'), { recursive: true, force: true });

// 2. Copiar cada entrada de dist/ (index.html, assets/, favicon.svg…).
const entries = readdirSync(dist);
for (const entry of entries) {
  const from = resolve(dist, entry);
  const to = resolve(repoRoot, entry);
  if (statSync(from).isDirectory()) {
    cpSync(from, to, { recursive: true });
  } else {
    cpSync(from, to);
  }
}

// 3. .nojekyll evita que GitHub Pages procese los archivos con Jekyll.
writeFileSync(resolve(repoRoot, '.nojekyll'), '');

const assets = existsSync(resolve(repoRoot, 'assets')) ? readdirSync(resolve(repoRoot, 'assets')) : [];
console.log('✔ Build publicado en la raíz del repositorio.');
console.log(`  ${entries.join(', ')}  →  ${repoRoot}`);
console.log(`  assets/: ${assets.length} archivo/s`);
