'use strict';
/* /api/admin — SoloWorks team dashboard. Protected by the ADMIN_PASSWORD environment variable.
   GET  -> all quote requests
   POST -> { action: 'update', table: 'projects', id, status?, notes? } */
const supabase = require('./_lib/supabase');
const { send, body, safeEqual, wait } = require('./_lib/http');
const O = require('../public/assets/js/options.js');

const TABLES = {
  projects: O.ids(O.projectStatus)
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authorised(req) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || pw.length < 8) return 'not_configured';
  const h = String(req.headers.authorization || '');
  const given = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (given && safeEqual(given, pw)) return 'ok';
  await wait(600);
  return 'denied';
}

module.exports = async function handler(req, res) {
  const auth = await authorised(req);
  if (auth === 'not_configured') return send(res, 503, { ok: false, error: 'admin_not_configured', message: 'Set ADMIN_PASSWORD (at least 8 characters) in your Vercel environment variables.' });
  if (auth !== 'ok') return send(res, 401, { ok: false, error: 'unauthorised', message: 'That password didn’t work.' });
  if (!supabase.enabled()) return send(res, 503, { ok: false, error: 'not_configured', message: 'Connect Supabase (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) to see quote requests here.' });

  try {
    if (req.method === 'GET') {
      const projects = await supabase.select('projects', { select: '*', order: 'created_at.desc', limit: '3000' });
      return send(res, 200, { ok: true, projects: projects || [] });
    }

    if (req.method === 'POST') {
      const b = body(req);
      if (b.action !== 'update' || !TABLES[b.table] || !UUID_RE.test(String(b.id || ''))) return send(res, 400, { ok: false, error: 'bad_request' });
      const patch = {};
      if (b.status !== undefined) {
        if (!TABLES[b.table].includes(b.status)) return send(res, 400, { ok: false, error: 'bad_status' });
        patch.status = b.status;
      }
      if (b.notes !== undefined) patch.notes = String(b.notes || '').slice(0, 4000);
      if (!Object.keys(patch).length) return send(res, 400, { ok: false, error: 'nothing_to_update' });
      patch.updated_at = new Date().toISOString();
      const row = await supabase.update(b.table, b.id, patch);
      return send(res, 200, { ok: true, row });
    }

    return send(res, 405, { ok: false, error: 'method_not_allowed' }, { Allow: 'GET, POST' });
  } catch (e) {
    console.error('[admin]', e.message, e.details || '');
    return send(res, 502, { ok: false, error: 'database_error', message: e.message });
  }
};
