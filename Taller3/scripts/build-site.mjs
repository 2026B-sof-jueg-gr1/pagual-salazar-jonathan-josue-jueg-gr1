import { cpSync, rmSync } from 'node:fs';

const builtGame = new URL('../dist-twinus/', import.meta.url);
const landing = new URL('../../landing/', import.meta.url);
const site = new URL('../dist-site/', import.meta.url);

rmSync(site, { force: true, recursive: true });
cpSync(landing, site, { recursive: true });
cpSync(builtGame, new URL('jugar/', site), { recursive: true });

