// Builds the extension and zips dist/ for upload to the Chrome Web Store.
// Usage: npm run package   →   loreward-<version>.zip in the project folder.
// The version comes from src/manifest.json; bump it there before each upload.

import { execSync } from 'node:child_process';
import { readFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit' });

const { version } = JSON.parse(readFileSync(join(root, 'src', 'manifest.json'), 'utf8'));
const zipName = `loreward-${version}.zip`;
const zipPath = join(root, zipName);

run('npm test');          // never ship a build that fails its tests
run('npm run typecheck');
run('npm run build');

if (existsSync(zipPath)) rmSync(zipPath);
run(`zip -r -X -q "${zipPath}" .`, join(root, 'dist')); // manifest.json must be at the zip's top level
console.log(`\n✓ ${zipName} is ready to upload.`);
