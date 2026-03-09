/**
 * Dev server — serves docs/ with live reload on file changes.
 * Zero dependencies: uses Node.js built-in http and fs modules.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'docs');
const srcDir = path.join(root, 'src');
const PORT = 3000;

// MIME types
const MIME = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
    '.mp3': 'audio/mpeg',
};

// Build first
console.log('Building...');
execSync('node scripts/build.js', { cwd: root, stdio: 'inherit' });

// Watch src/ for changes and rebuild
let buildTimeout = null;
fs.watch(srcDir, { recursive: true }, (event, filename) => {
    if (!filename?.endsWith('.js')) return;
    clearTimeout(buildTimeout);
    buildTimeout = setTimeout(() => {
        console.log(`\n  Changed: src/${filename} — rebuilding...`);
        try {
            execSync('node scripts/build.js', { cwd: root, stdio: 'inherit' });
        } catch (e) {
            console.error('Build error:', e.message);
        }
    }, 100);
});

// Serve
const server = http.createServer((req, res) => {
    let url = req.url.split('?')[0];
    if (url === '/') url = '/index.html';

    const filePath = path.join(publicDir, url);
    const ext = path.extname(filePath);

    // Prevent directory traversal
    if (!filePath.startsWith(publicDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            // SPA fallback
            if (ext === '' || ext === '.html') {
                fs.readFile(path.join(publicDir, 'index.html'), (err2, html) => {
                    if (err2) { res.writeHead(404); res.end('Not found'); return; }
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(html);
                });
                return;
            }
            res.writeHead(404);
            res.end('Not found');
            return;
        }

        res.writeHead(200, {
            'Content-Type': MIME[ext] || 'application/octet-stream',
            'Cache-Control': 'no-cache',
        });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`\n  SoulChat dev server running at:`);
    console.log(`  → http://localhost:${PORT}\n`);
    console.log(`  Watching src/ for changes...\n`);
});
