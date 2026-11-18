'use strict';
/* Minimal Supabase REST client (PostgREST). Uses the service-role key, which stays on the server. */

function config() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
  return url && key ? { url, key } : null;
}

function enabled() { return !!config(); }

async function request(method, path, { body, query, prefer, timeout = 8000 } = {}) {
  const c = config();
  if (!c) throw Object.assign(new Error('Supabase is not configured'), { code: 'not_configured' });
  const qs = query ? '?' + new URLSearchParams(query).toString() : '';
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(`${c.url}/rest/v1/${path}${qs}`, {
      method,
      headers: {
        apikey: c.key,
        Authorization: `Bearer ${c.key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(prefer ? { Prefer: prefer } : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    if (!res.ok) {
      const msg = data && data.message ? data.message : `Supabase ${res.status}`;
      throw Object.assign(new Error(msg), { code: 'supabase_error', status: res.status, details: data });
    }
    return data;
  } finally {
    clearTimeout(t);
  }
}

async function insert(table, row) {
  const data = await request('POST', table, { body: row, prefer: 'return=representation' });
  return Array.isArray(data) ? data[0] : data;
}

async function select(table, query) {
  return request('GET', table, { query });
}

async function update(table, id, patch) {
  const data = await request('PATCH', table, { body: patch, query: { id: `eq.${id}` }, prefer: 'return=representation' });
  return Array.isArray(data) ? data[0] : data;
}

module.exports = { enabled, insert, select, update };
