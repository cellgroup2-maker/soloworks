'use strict';
/* POST /api/register — receives SoloWorks quote requests.
   Saves to Supabase (when configured) and notifies the team (Resend / Slack). */
const { validate } = require('./_lib/schema');
const supabase = require('./_lib/supabase');
const { notifyTeam, confirmToSender } = require('./_lib/notify');
const { send, body, ref } = require('./_lib/http');

const PREFIX = { project: 'Q' };

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method_not_allowed' }, { Allow: 'POST' });

  const b = body(req);
  const kind = b.kind;
  if (!PREFIX[kind]) return send(res, 400, { ok: false, error: 'invalid', fields: {} });

  // Spam protection: hidden honeypot field and a minimum time on the form.
  if (b.hp) return send(res, 200, { ok: true, ref: ref(PREFIX[kind]) });
  if (typeof b.elapsed === 'number' && b.elapsed < 2000) return send(res, 429, { ok: false, error: 'too_fast' });

  const v = validate(kind, b.data);
  if (!v.ok) return send(res, 422, { ok: false, error: 'invalid', fields: v.errors });
  const data = v.value;

  const row = {
    ...data,
    meta: {
      page: typeof b.page === 'string' ? b.page.slice(0, 100) : null,
      country: req.headers['x-vercel-ip-country'] || null,
      ua: String(req.headers['user-agent'] || '').slice(0, 200)
    }
  };

  // 1. Store
  let saved = null;
  if (supabase.enabled()) {
    try { saved = await supabase.insert(v.table, row); } catch (e) { console.error('[register] store failed:', e.message, e.details || ''); }
  }
  const reference = ref(PREFIX[kind], saved && saved.id);

  // 2. Notify the team and (optionally) confirm to the sender
  const [notified] = await Promise.all([
    notifyTeam(kind, data, reference).catch((e) => { console.error('[register] notify failed:', e.message); return {}; }),
    (saved || process.env.RESEND_API_KEY) ? confirmToSender(kind, data, reference) : Promise.resolve({ skipped: true })
  ]);
  if (notified.emailError) console.error('[register] email:', notified.emailError);
  if (notified.slackError) console.error('[register] slack:', notified.slackError);

  const delivered = !!saved || notified.email === true || notified.slack === true;
  if (!delivered) {
    const configured = supabase.enabled() || !!process.env.RESEND_API_KEY || !!process.env.SLACK_WEBHOOK_URL;
    return send(res, configured ? 502 : 503, { ok: false, error: configured ? 'delivery_failed' : 'not_configured' });
  }

  return send(res, 200, { ok: true, ref: reference });
};
