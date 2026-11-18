/* SoloWorks — team dashboard. Reads /api/admin with the admin password and shows quote requests. */
(function () {
  'use strict';
  var SW = window.SW || {};
  var OPT = window.SW_OPTIONS;
  var esc = SW.esc;
  var KEY = 'sw-admin-pass';
  var $ = function (s) { return document.querySelector(s); };

  var loginSec = $('[data-login]'), app = $('[data-app]'), loginForm = $('[data-login-form]'), loginErr = $('[data-login-error]');
  var listEl = $('[data-list]'), countEl = $('[data-count]'), statsEl = $('[data-stats]');
  var qEl = $('[data-q]'), statusSel = $('[data-status]'), catSel = $('[data-cat]');
  var drawer = $('[data-drawer]'), drawerTitle = $('[data-drawer-title]'), drawerBody = $('[data-drawer-body]');
  var logoutBtn = $('[data-logout]'), sourceEl = $('[data-source]');
  var pass = '';
  var state = { tab: 'projects', data: null, lastFocus: null };

  var STATUS = { projects: OPT.projectStatus };

  function sessionGet() { try { return sessionStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function sessionSet(v) { try { if (v) sessionStorage.setItem(KEY, v); else sessionStorage.removeItem(KEY); } catch (e) { /* unavailable */ } }

  function api(method, body) {
    return fetch('/api/admin', {
      method: method,
      headers: { Authorization: 'Bearer ' + pass, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      return res.text().then(function (t) {
        var j = null; try { j = JSON.parse(t); } catch (e) { j = null; }
        if (!j) j = { ok: false, error: res.status === 404 ? 'no_api' : 'bad_response' };
        j.status = res.status;
        return j;
      });
    }, function () { return { ok: false, error: 'network' }; });
  }

  function fmtDate(s) {
    if (!s) return '';
    var d = new Date(s);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  function shortDate(s) { return s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''; }
  function lab(list, v) { return Array.isArray(v) ? v.map(function (x) { return OPT.label(list, x); }).join(', ') : OPT.label(list, v); }
  function pill(table, s) { return '<span class="pill pill-' + esc(s) + '">' + esc(OPT.label(STATUS[table], s) || s) + '</span>'; }

  /* ---------- Login ---------- */
  function showError(msg) { loginErr.textContent = msg; loginErr.hidden = !msg; }
  function load(initial) {
    var btn = $('[data-login-btn]');
    if (btn) btn.disabled = true;
    return api('GET').then(function (j) {
      if (btn) btn.disabled = false;
      if (j.ok) {
        state.data = j;
        sessionSet(pass);
        loginSec.hidden = true; app.hidden = false; logoutBtn.hidden = false;
        sourceEl.textContent = 'Updated ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        render();
        return;
      }
      if (initial) { sessionSet(''); pass = ''; loginSec.hidden = false; app.hidden = true; }
      var msg = j.message || ({ network: 'Couldn’t reach the server. Check your connection.', no_api: 'The dashboard API isn’t available here. Open the dashboard on your deployed Vercel site.', unauthorised: 'That password didn’t work.' }[j.error]) || 'Something went wrong (' + j.error + ').';
      if (!app.hidden) SW.toast(msg); else showError(msg);
    });
  }
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    pass = $('#a-pass').value;
    if (!pass) { showError('Enter the admin password.'); return; }
    showError('');
    load(false);
  });
  logoutBtn.addEventListener('click', function () {
    sessionSet(''); pass = ''; state.data = null;
    app.hidden = true; loginSec.hidden = false; logoutBtn.hidden = true; sourceEl.textContent = '';
    $('#a-pass').value = '';
  });

  /* ---------- Toolbar ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-tab]'));
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { setTab(t.getAttribute('data-tab')); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        setTab(n.getAttribute('data-tab')); n.focus();
      }
    });
  });
  function setTab(tab) {
    state.tab = tab;
    tabs.forEach(function (t) { var on = t.getAttribute('data-tab') === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    statusSel.innerHTML = '<option value="">All statuses</option>' + STATUS[tab].map(function (s) { return '<option value="' + s.id + '">' + esc(s.label) + '</option>'; }).join('');
    render();
  }
  catSel.innerHTML = '<option value="">All types of work</option>' + OPT.services.map(function (c) { return '<option value="' + c.id + '">' + esc(c.short) + '</option>'; }).join('');
  function lang(v) { return v === 'en' ? 'EN' : v === 'ko' ? 'KO' : ''; }
  [qEl, statusSel, catSel].forEach(function (el) { el.addEventListener('input', render); el.addEventListener('change', render); });
  $('[data-refresh]').addEventListener('click', function () { load(false).then(function () { SW.toast('Dashboard refreshed'); }); });
  $('[data-export]').addEventListener('click', exportCsv);

  /* ---------- Render ---------- */
  function rowsFor(tab) {
    var d = state.data || {};
    var rows = (d[tab] || []).slice();
    var q = qEl.value.trim().toLowerCase();
    var st = statusSel.value, svc = catSel.value;
    return rows.filter(function (r) {
      if (st && r.status !== st) return false;
      if (svc && tab === 'projects' && r.service !== svc) return false;
      if (q) {
        var hay = JSON.stringify([r.company_name, r.contact_name, r.email, r.phone, r.details, r.notes]).toLowerCase();
        if (q.split(/\s+/).some(function (w) { return hay.indexOf(w) < 0; })) return false;
      }
      return true;
    });
  }

  function render() {
    if (!state.data) return;
    var d = state.data;
    var count = function (arr, st) { return arr.filter(function (r) { return r.status === st; }).length; };
    var p = d.projects || [];
    var tests = p.filter(function (r) { return r.service === 'test_edit'; }).length;
    statsEl.innerHTML =
      '<div class="admin-stat is-talent"><b>' + count(p, 'new') + '</b><span>New requests (' + p.length + ' total)</span></div>' +
      '<div class="admin-stat"><b>' + (count(p, 'scoping') + count(p, 'quoted')) + '</b><span>Scoping or quote sent</span></div>' +
      '<div class="admin-stat is-hire"><b>' + (count(p, 'active') + count(p, 'qc')) + '</b><span>In production or quality check</span></div>' +
      '<div class="admin-stat"><b>' + tests + '</b><span>Free test edit requests</span></div>';

    var tab = state.tab;
    var rows = rowsFor(tab);
    countEl.textContent = rows.length + ' of ' + (d[tab] || []).length + ' shown';
    if (!rows.length) {
      listEl.innerHTML = '<div class="admin-empty">' + ((d[tab] || []).length ? 'Nothing matches these filters.' : 'Nothing here yet. Submissions from the website will appear here.') + '</div>';
      return;
    }
    listEl.innerHTML = rows.map(function (r) {
      return '<button type="button" class="arow" data-id="' + r.id + '"><span class="cell"><b>' + esc(r.company_name || r.contact_name) + '</b><small>' + esc(r.contact_name) + ', ' + esc(r.email) + '</small></span>' +
        '<span class="cell cell-hide">' + esc(lab(OPT.services, r.service)) + '<small>' + esc(lab(OPT.timelines, r.timeline) || 'No timeline given') + '</small></span>' +
        '<span class="cell cell-hide">' + esc((r.details || '').slice(0, 70)) + '</span><span class="cell cell-hide">' + esc(shortDate(r.created_at)) + (lang(r.contact_language) ? '<small>' + lang(r.contact_language) + ' site</small>' : '') + '</span><span class="cell">' + pill(tab, r.status) + '</span></button>';
    }).join('');
  }
  listEl.addEventListener('click', function (e) {
    var b = e.target.closest('.arow');
    if (b) openRecord(state.tab, b.getAttribute('data-id'), b);
  });

  /* ---------- Drawer ---------- */
  function kv(pairs) {
    return '<dl class="kv">' + pairs.filter(function (p) { return p[1] != null && p[1] !== '' && !(Array.isArray(p[1]) && !p[1].length); }).map(function (p) {
      return '<div><dt>' + esc(p[0]) + '</dt><dd>' + (p[2] ? p[1] : esc(Array.isArray(p[1]) ? p[1].join(', ') : p[1])) + '</dd></div>';
    }).join('') + '</dl>';
  }
  function link(url) { return url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(url.replace(/^https?:\/\//, '').slice(0, 60)) + '</a>' : ''; }
  function mail(e) { return e ? '<a href="mailto:' + esc(e) + '">' + esc(e) + '</a>' : ''; }
  function find(tab, id) { return (state.data[tab] || []).filter(function (r) { return r.id === id; })[0]; }

  function openRecord(tab, id, opener) {
    var r = find(tab, id);
    if (!r) return;
    state.lastFocus = opener || document.activeElement;
    var html = '';
    drawerTitle.textContent = (r.company_name || r.contact_name) + ': ' + lab(OPT.services, r.service);
    html += actions(tab, r);
    html += '<div><h3>Request</h3>' + kv([['Work', lab(OPT.services, r.service)], ['Timeline', lab(OPT.timelines, r.timeline)], ['What they need', r.details]]) + '</div>';
    html += '<div><h3>Contact</h3>' + kv([['Name', r.contact_name], ['Company', r.company_name], ['Email', mail(r.email), true], ['Phone', r.phone ? '<a href="tel:' + esc(String(r.phone).replace(/[^0-9+]/g, '')) + '">' + esc(r.phone) + '</a>' : '', true], ['Site language', lab(OPT.contactLanguages, r.contact_language)], ['Received', fmtDate(r.created_at)]]) + '</div>';
    drawerBody.innerHTML = html;
    drawer.hidden = false;
    document.body.style.overflow = 'hidden';
    drawer.querySelector('.drawer-close').focus();
    var form = drawerBody.querySelector('[data-save]');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); save(tab, r.id, form); });
  }

  function actions(tab, r) {
    var opts = STATUS[tab].map(function (s) { return '<option value="' + s.id + '"' + (s.id === r.status ? ' selected' : '') + '>' + esc(s.label) + '</option>'; }).join('');
    return '<form class="drawer-actions" data-save><div class="row"><div class="field"><label for="d-status">Status</label><select id="d-status" name="status">' + opts + '</select></div>' +
      '<button class="btn btn-ink btn-sm" type="submit">Save</button></div>' +
      '<div class="field"><label for="d-notes">Team notes</label><textarea id="d-notes" name="notes" rows="4" maxlength="4000" placeholder="Call notes, scope, quote, points top-up, delivery">' + esc(r.notes || '') + '</textarea></div></form>';
  }

  function save(tab, id, form) {
    if (SW.preview && window.SW_SAMPLE) {
      var arr0 = state.data[tab];
      for (var k = 0; k < arr0.length; k++) if (arr0[k].id === id) { arr0[k].status = form.status.value; arr0[k].notes = form.notes.value; }
      render(); SW.toast('Preview only. Changes are not saved.');
      return;
    }
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    api('POST', { action: 'update', table: tab, id: id, status: form.status.value, notes: form.notes.value }).then(function (j) {
      btn.disabled = false;
      if (j.ok && j.row) {
        var arr = state.data[tab];
        for (var i = 0; i < arr.length; i++) if (arr[i].id === id) arr[i] = j.row;
        render();
        SW.toast('Saved');
      } else SW.toast(j.message || 'Couldn’t save. Try again.');
    });
  }

  function closeDrawer() {
    drawer.hidden = true;
    document.body.style.overflow = '';
    if (state.lastFocus && document.body.contains(state.lastFocus)) state.lastFocus.focus();
  }
  drawer.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeDrawer(); });
  document.addEventListener('keydown', function (e) {
    if (drawer.hidden) return;
    if (e.key === 'Escape') closeDrawer();
    if (e.key === 'Tab') {
      var f = drawer.querySelectorAll('button, a[href], input, select, textarea');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- CSV ---------- */
  function exportCsv() {
    var tab = state.tab;
    var rows = rowsFor(tab);
    if (!rows.length) { SW.toast('Nothing to export'); return; }
    var cols = Object.keys(rows[0]).filter(function (k) { return k !== 'meta'; });
    var csv = [cols.join(',')].concat(rows.map(function (r) {
      return cols.map(function (k) {
        var v = r[k]; if (Array.isArray(v)) v = v.join('; '); if (v == null) v = '';
        v = String(v);
        if (/^[=+\-@]/.test(v)) v = "'" + v; // avoid spreadsheet formula injection
        return '"' + v.replace(/"/g, '""') + '"';
      }).join(',');
    })).join('\r\n');
    var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'soloworks-requests-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  setTab('projects');

  // Preview copies (opened from disk or the design preview) show sample data instead of the live API.
  if (SW.preview && window.SW_SAMPLE) {
    state.data = JSON.parse(JSON.stringify(window.SW_SAMPLE));
    loginSec.hidden = true; app.hidden = false; logoutBtn.hidden = true;
    sourceEl.textContent = 'Preview with sample data';
    var note = document.createElement('p');
    note.className = 'preview-banner admin-preview-note';
    note.innerHTML = '<span><strong>Preview with sample requests.</strong> On the live site this dashboard shows real quote requests and saves your changes.</span>';
    app.insertBefore(note, app.firstChild);
    render();
    return;
  }

  pass = sessionGet();
  if (pass) load(true);
})();
