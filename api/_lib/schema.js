'use strict';
/* Server-side validation for the SoloWorks inquiry form. The browser validates too, but this is the source of truth. */
const O = require('../../public/assets/js/options.js');

const ids = (list) => O.ids(list);

const SCHEMAS = {
  project: {
    table: 'projects',
    fields: {
      contact_name: { type: 'text', required: true, max: 100 },
      company_name: { type: 'text', max: 120 },
      email: { type: 'email', required: true, max: 160 },
      phone: { type: 'phone' },
      service: { type: 'enum', required: true, values: ids(O.services) },
      timeline: { type: 'enum', values: ids(O.timelines) },
      contact_language: { type: 'enum', values: ids(O.contactLanguages) },
      details: { type: 'text', required: true, max: 3000, multiline: true },
      consent: { type: 'bool', mustBeTrue: true }
    }
  }
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9 ()\-.]{7,20}$/;

function cleanText(v, multiline) {
  let s = String(v == null ? '' : v);
  // strip control characters (keep newlines/tabs for multiline fields)
  s = multiline ? s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') : s.replace(/[\u0000-\u001F\u007F]/g, ' ');
  s = multiline ? s.replace(/[ \t]+\n/g, '\n').replace(/\n{4,}/g, '\n\n\n') : s.replace(/\s+/g, ' ');
  return s.trim();
}

function normUrl(v) {
  let s = cleanText(v);
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try {
    const u = new URL(s);
    if (!/^https?:$/.test(u.protocol) || !/\./.test(u.hostname)) return null;
    return u.toString();
  } catch (e) { return null; }
}

/** Returns { ok, value, errors } */
function validate(kind, input) {
  const schema = SCHEMAS[kind];
  if (!schema) return { ok: false, errors: { _: 'Unknown form.' } };
  const src = input && typeof input === 'object' ? input : {};
  const out = {};
  const errors = {};
  for (const [name, rule] of Object.entries(schema.fields)) {
    const raw = src[name];
    const missing = raw == null || raw === '' || (Array.isArray(raw) && raw.length === 0);
    if (rule.type === 'bool') {
      const b = raw === true || raw === 'true' || raw === 'on' || raw === 1;
      if (rule.mustBeTrue && !b) errors[name] = 'Please agree to continue.';
      out[name] = b;
      continue;
    }
    if (missing) {
      if (rule.required) errors[name] = 'This field is required.';
      out[name] = rule.type === 'list' ? [] : null;
      continue;
    }
    switch (rule.type) {
      case 'text': {
        const s = cleanText(raw, rule.multiline);
        if (!s && rule.required) errors[name] = 'This field is required.';
        else if (s.length > rule.max) errors[name] = `Keep this under ${rule.max} characters.`;
        out[name] = s || null;
        break;
      }
      case 'email': {
        const s = cleanText(raw).toLowerCase();
        if (!EMAIL_RE.test(s) || s.length > rule.max) errors[name] = 'Enter a valid email address.';
        out[name] = s;
        break;
      }
      case 'phone': {
        const s = cleanText(raw);
        if (!PHONE_RE.test(s)) errors[name] = 'Enter a valid phone number with country code.';
        out[name] = s;
        break;
      }
      case 'url': {
        const s = normUrl(raw);
        if (s === null || (s && s.length > rule.max)) errors[name] = 'Enter a full web address, like https://example.com.';
        out[name] = s || null;
        break;
      }
      case 'enum': {
        const s = cleanText(raw);
        if (!rule.values.includes(s)) errors[name] = 'Choose one of the listed options.';
        out[name] = s;
        break;
      }
      case 'int': {
        const n = Number(raw);
        if (!Number.isInteger(n) || n < rule.min || n > rule.max) errors[name] = `Enter a whole number between ${rule.min} and ${rule.max}.`;
        out[name] = n;
        break;
      }
      case 'id': {
        const s = cleanText(raw);
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(s)) errors[name] = 'Invalid reference.';
        out[name] = s;
        break;
      }
      case 'list': {
        const arr = (Array.isArray(raw) ? raw : String(raw).split(',')).map((x) => cleanText(x)).filter(Boolean);
        const uniq = [];
        const seen = new Set();
        for (const x of arr) { const k = x.toLowerCase(); if (!seen.has(k)) { seen.add(k); uniq.push(x); } }
        if (rule.required && !uniq.length) errors[name] = 'Add at least one.';
        if (uniq.length > rule.max) errors[name] = `Choose up to ${rule.max}.`;
        if (uniq.some((x) => x.length > (rule.itemMax || 60))) errors[name] = 'One of these entries is too long.';
        if (rule.values && uniq.some((x) => !rule.values.includes(x))) errors[name] = 'Choose from the listed options.';
        out[name] = uniq;
        break;
      }
      default:
        out[name] = null;
    }
  }
  return { ok: Object.keys(errors).length === 0, value: out, errors, table: schema.table };
}

module.exports = { validate, SCHEMAS };
