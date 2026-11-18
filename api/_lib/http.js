'use strict';
/* Small helpers shared by the API routes. */
const crypto = require('crypto');

function send(res, status, body, headers) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (headers) for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

function body(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') { try { return JSON.parse(b); } catch (e) { return {}; } }
  return b;
}

function ref(prefix, id) {
  const src = id ? String(id).replace(/-/g, '') : crypto.randomBytes(4).toString('hex');
  return `SW-${prefix}-${src.slice(0, 6).toUpperCase()}`;
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { send, body, ref, safeEqual, wait };
