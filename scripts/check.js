#!/usr/bin/env node
/* Checks a deployed site: node scripts/check.js https://your-site.vercel.app */
'use strict';
const base = (process.argv[2] || 'http://localhost:3000').replace(/\/+$/, '');
(async () => {
  try {
    const h = await (await fetch(base + '/api/health')).json();
    const line = (ok, label, hint) => console.log(`${ok ? '✔' : '✘'} ${label}${!ok && hint ? `  →  ${hint}` : ''}`);
    console.log(`Checking ${base}\n`);
    line(h.database === 'connected', `Database: ${h.database}`, 'set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then run supabase/schema.sql');
    line(h.email_alerts, 'Email alerts (Resend)', 'set RESEND_API_KEY (optional)');
    line(h.slack_alerts, 'Slack alerts', 'set SLACK_WEBHOOK_URL (optional)');
    line(h.admin_dashboard, 'Team dashboard (/admin)', 'set ADMIN_PASSWORD, at least 8 characters');
    line(h.accepting_submissions, 'Forms can deliver submissions', 'connect the database or email alerts');
    const pages = ['/', '/en', '/privacy', '/en-privacy'];
    for (const p of pages) { const r = await fetch(base + p); line(r.ok, `Page ${p} (${r.status})`); }
  } catch (e) {
    console.error('Could not reach ' + base + ': ' + e.message);
    process.exit(1);
  }
})();
