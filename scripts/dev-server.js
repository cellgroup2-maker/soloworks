#!/usr/bin/env node
/* Local preview server that behaves like Vercel for this project:
   - serves /public with clean URLs (/hire -> hire.html) and the custom 404 page
   - runs /api/*.js functions with Vercel-style req.body, req.query, res.status().json()
   - applies the headers from vercel.json
   - loads environment variables from .env.local or .env
   Usage: node scripts/dev-server.js [port]   (no dependencies needed) */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.argv[2] || process.env.PORT || 3000);

for (const f of ['.env.local', '.env']) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

let vercel = {};
try { vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')); } catch (e) { /* optional */ }

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml'
};

function globToRegex(src) {
  // Supports the patterns used in vercel.json: "/(.*)", "/assets/(.*)", "/admin", "/api/(.*)"
  return new RegExp('^' + src.replace(/\//g, '\\/') + '$');
}

function applyHeaders(res, pathname) {
  for (const rule of vercel.headers || []) {
    if (globToRegex(rule.source).test(pathname)) for (const h of rule.headers) res.setHeader(h.key, h.value);
  }
}

function sendFile(res, file, status) {
  const ext = path.extname(file).toLowerCase();
  res.statusCode = status || 200;
  res.setHeader('Content-Type', TYPES[ext] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}

function enhance(req, res, url) {
  req.query = Object.fromEntries(url.searchParams.entries());
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)); return res; };
  res.send = (body) => { res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); return res; };
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) { size += c.length; if (size > 4.5 * 1024 * 1024) throw new Error('too_large'); chunks.push(c); }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return undefined;
  if ((req.headers['content-type'] || '').includes('application/json')) { try { return JSON.parse(raw); } catch (e) { return raw; } }
  return raw;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  applyHeaders(res, pathname);

  if (pathname.startsWith('/api/')) {
    const name = pathname.slice(5).replace(/\/$/, '');
    const file = path.join(ROOT, 'api', name + '.js');
    if (!/^[a-z0-9-]+$/.test(name) || !fs.existsSync(file)) { res.statusCode = 404; return res.end('Not found'); }
    enhance(req, res, url);
    try {
      req.body = await readBody(req);
      delete require.cache[require.resolve(file)];
      await require(file)(req, res);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) res.status(500).json({ ok: false, error: 'server_error' });
    }
    return;
  }

  for (const r of vercel.redirects || []) {
    if (r.source === pathname) { res.statusCode = r.permanent ? 308 : 307; res.setHeader('Location', r.destination); return res.end(); }
  }
  if (vercel.cleanUrls && pathname.endsWith('.html')) {
    const clean = pathname === '/index.html' ? '/' : pathname.slice(0, -5);
    res.statusCode = 308; res.setHeader('Location', clean + url.search); return res.end();
  }
  let file = path.join(PUBLIC, pathname);
  if (!file.startsWith(PUBLIC)) { res.statusCode = 403; return res.end(); }
  if (pathname.endsWith('/')) file = path.join(file, 'index.html');
  else if (!path.extname(file) && fs.existsSync(file + '.html')) file += '.html';
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return sendFile(res, file);
  return sendFile(res, path.join(PUBLIC, '404.html'), 404);
});

server.listen(PORT, () => console.log('SoloWorks running at http://localhost:' + PORT));
