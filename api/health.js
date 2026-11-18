'use strict';
/* GET /api/health — shows which integrations are switched on (no secrets), and whether the database tables exist. */
const supabase = require('./_lib/supabase');
const { send } = require('./_lib/http');

module.exports = async function handler(req, res) {
  const out = {
    ok: true,
    database: 'not_configured',
    email_alerts: !!process.env.RESEND_API_KEY,
    confirmation_emails: !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM && process.env.SEND_CONFIRMATIONS !== 'false'),
    slack_alerts: !!process.env.SLACK_WEBHOOK_URL,
    admin_dashboard: !!(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 8)
  };
  if (supabase.enabled()) {
    try {
      await Promise.all(['projects'].map((t) => supabase.select(t, { select: 'id', limit: '1' })));
      out.database = 'connected';
    } catch (e) {
      out.database = 'error: ' + (e.status === 404 || /relation|does not exist|schema cache/i.test(e.message) ? 'tables missing, run supabase/schema.sql' : e.message);
    }
  }
  out.accepting_submissions = out.database === 'connected' || out.email_alerts || out.slack_alerts;
  return send(res, 200, out);
};
