'use strict';
/* Team notifications (Resend email, Slack webhook) and optional confirmation emails. */
const O = require('../../public/assets/js/options.js');

const LABELS = {
  contact_name: 'Name', company_name: 'Company', email: 'Email', phone: 'Phone', service: 'Work', timeline: 'Timeline',
  contact_language: 'Site language', details: 'What they need'
};
const LISTS = { service: O.services, timeline: O.timelines, contact_language: O.contactLanguages };
const HIDDEN = ['consent'];

function pretty(name, v) {
  if (v == null || v === '' || (Array.isArray(v) && !v.length)) return null;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  const list = LISTS[name];
  if (Array.isArray(v)) return v.map((x) => (list ? O.label(list, x) : x)).join(', ');
  return list ? O.label(list, v) : String(v);
}

function rows(data) {
  return Object.keys(data)
    .filter((k) => !HIDDEN.includes(k))
    .map((k) => [LABELS[k] || k, pretty(k, data[k])])
    .filter((r) => r[1] != null);
}

const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function subjectFor(kind, d, ref) {
  return `New SoloWorks quote request: ${O.label(O.services, d.service)} from ${d.company_name || d.contact_name} [${ref}]`;
}

function htmlTable(r) {
  return '<table cellpadding="6" style="border-collapse:collapse;font:14px/1.5 Arial,sans-serif;color:#0F2A41">' +
    r.map(([k, v]) => `<tr><td style="color:#5E7282;vertical-align:top;white-space:nowrap">${escHtml(k)}</td><td style="white-space:pre-wrap">${escHtml(v)}</td></tr>`).join('') +
    '</table>';
}

async function withTimeout(promise, ms) {
  let t;
  return Promise.race([promise, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('timeout')), ms); })]).finally(() => clearTimeout(t));
}

async function sendEmail({ to, subject, html, text, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { skipped: true };
  const from = process.env.RESEND_FROM || 'SoloWorks <onboarding@resend.dev>';
  const res = await withTimeout(fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html, text, reply_to: replyTo || undefined })
  }), 8000);
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return { sent: true };
}

async function notifyTeam(kind, data, ref, extra) {
  const r = rows(data);
  const subject = subjectFor(kind, data, ref);
  const extraLine = extra ? `\n${extra}` : '';
  const text = r.map(([k, v]) => `${k}: ${v}`).join('\n') + extraLine;
  const adminUrl = process.env.SITE_URL ? `${process.env.SITE_URL.replace(/\/+$/, '')}/admin` : '';
  const results = {};

  const to = (process.env.NOTIFY_EMAIL || 'hello@soloworks.in').split(',').map((s) => s.trim()).filter(Boolean);
  const tasks = [];
  if (process.env.RESEND_API_KEY) {
    const html = `<p style="font:15px Arial,sans-serif;color:#0F2A41"><strong>${escHtml(subject)}</strong></p>${htmlTable(r)}` +
      (extra ? `<p style="font:14px Arial,sans-serif;color:#0A6E8A">${escHtml(extra)}</p>` : '') +
      (adminUrl ? `<p style="font:14px Arial,sans-serif"><a href="${escHtml(adminUrl)}">Open the team dashboard</a></p>` : '');
    tasks.push(sendEmail({ to, subject, html, text, replyTo: data.email }).then(() => { results.email = true; }, (e) => { results.email = false; results.emailError = e.message; }));
  }
  if (process.env.SLACK_WEBHOOK_URL) {
    const icon = ':briefcase:';
    const short = r.slice(0, 12).map(([k, v]) => `*${k}:* ${String(v).slice(0, 300)}`).join('\n');
    tasks.push(withTimeout(fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `${icon} ${subject}\n${short}${extraLine}${adminUrl ? `\n<${adminUrl}|Open dashboard>` : ''}` })
    }), 6000).then((res) => { results.slack = res.ok; }, (e) => { results.slack = false; results.slackError = e.message; }));
  }
  await Promise.all(tasks);
  return results;
}

async function confirmToSender(kind, data, ref) {
  // Only when a verified sending domain is configured; the Resend test sender can't email outside your account.
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM || process.env.SEND_CONFIRMATIONS === 'false') return { skipped: true };
  const en = data.contact_language === 'en';
  const name = (data.contact_name || '').trim();
  const work = O.label(O.services, data.service, en ? 'en' : 'ko');
  const text = en
    ? `Hi ${name.split(' ')[0]},\n\nThanks for your quote request for ${work.toLowerCase()}. Your reference is ${ref}.\n\nDuring business hours, your project manager will get in touch right away to agree the scope and price. Nothing is charged until you agree. You can pay by card, and the card receipt is issued instantly.\n\nIf you want to add anything, just reply to this email.\n\nSoloWorks`
    : `${name}님, 안녕하세요.\n\n${work} 견적 요청이 접수되었습니다. 접수 번호는 ${ref}입니다.\n\n영업시간에는 담당 PM이 바로 연락드려 범위와 금액을 맞춰 드립니다. 동의하시기 전까지 비용은 발생하지 않으며, 결제는 카드로 하실 수 있고 카드 영수증이 즉시 발급됩니다.\n\n추가로 전달하실 내용이 있으면 이 메일에 회신해 주세요.\n\nSoloWorks (솔로웍스)`;
  const html = text.split('\n').map((l) => (l ? `<p style="margin:0 0 8px;font:15px/1.6 Arial,sans-serif;color:#0B1F38">${escHtml(l)}</p>` : '')).join('');
  try {
    await sendEmail({ to: data.email, subject: en ? `We received your quote request [${ref}]` : `견적 요청이 접수되었습니다 [${ref}]`, html, text, replyTo: process.env.REPLY_TO || 'hello@soloworks.in' });
    return { sent: true };
  } catch (e) { return { sent: false, error: e.message }; }
}

module.exports = { notifyTeam, confirmToSender, rows };
