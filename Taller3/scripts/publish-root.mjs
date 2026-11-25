/**
 * Publica el sitio generado (`Taller3/dist-site`) en la RAÍZ del repositorio.
 *
 * GitHub Pages está configurado como "Deploy from a branch" → main → /(root).
 * Eso significa que sirve exactamente lo que haya en la raíz del repo, así que
 * el sitio compilado (landing + `jugar/`) debe copiarse ahí.
 *
 * Uso:  npm run publish:pages
 */
import { cpSync, existsSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');
const site = resolve(projectRoot, 'dist-site');
const repoRoot = resolve(projectRoot, '..');

if (!existsSync(site)) {
  console.error('✖ No existe Taller3/dist-site. Ejecuta "npm run build:site" primero.');
  process.exit(1);
}

// 1. Limpiar SOLO lo que genera el sitio en la raíz (nunca Taller3/ ni landing/).
for (const entry of ['index.html', 'assets', 'jugar', 'favicon.svg']) {
  rmSync(resolve(repoRoot, entry), { recursive: true, force: true });
}

// 2. Copiar cada entrada de dist-site/ a la raíz.
for (const entry of readdirSync(site)) {
  const from = resolve(site, entry);
  const to = resolve(repoRoot, entry);
  if (statSync(from).isDirectory()) {
    cpSync(from, to, { recursive: true });
  } else {
    cpSync(from, to);
  }
}

// 3. .nojekyll evita que GitHub Pages procese los archivos con Jekyll.
writeFileSync(resolve(repoRoot, '.nojekyll'), '');

console.log('✔ Sitio publicado en la raíz del repositorio.');
console.log(`  ${readdirSync(site).join(', ')}  →  ${repoRoot}`);
