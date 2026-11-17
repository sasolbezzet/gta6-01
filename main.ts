// Vice City Shadows - GTA 6 Open-World Crime Experience for make.fun (gta6-01)
// Entry point for packaging and dossier generation on Node 22 standard library.
// Production Release v1.0.0: Optimized asset packaging and gate validation.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

console.log(`[make.fun gta6-01] Deploying Vice City Shadows to ${out}...`);

// Ensure output directories exist
mkdirSync(out, { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });

// Copy static game files and screenshots to destination
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Generate canonical dossier.json matching competition rules and size constraints
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(out, 'dossier.json'), dossier);
console.log(`[make.fun gta6-01] Successfully generated dossier.json (${Buffer.byteLength(dossier, 'utf8')} bytes)`);

