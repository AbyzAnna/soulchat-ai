/**
 * Build script — copies src/ JS files to docs/js/ for deployment.
 * No bundler needed: the app uses vanilla JS with no dependencies.
 */

import { cpSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const srcDir = join(root, 'src');
const outDir = join(root, 'docs', 'js');

// Ensure output directory exists
mkdirSync(outDir, { recursive: true });

// Copy all JS files from src/ to docs/js/
const files = readdirSync(srcDir).filter(f => f.endsWith('.js'));
for (const file of files) {
    cpSync(join(srcDir, file), join(outDir, file));
    console.log(`  ✓ ${file}`);
}

console.log(`\nBuild complete — ${files.length} files → docs/js/`);
