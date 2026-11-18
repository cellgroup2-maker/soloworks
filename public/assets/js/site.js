/* SoloWorks — shared site behaviour: navigation, copy, toast and the animated example project. */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');
  // The page language also lives in a meta tag, so it survives hosts that rewrap the page.
  var langMeta = document.querySelector('meta[name="sw-lang"]');
  if (langMeta && langMeta.content && doc.lang !== langMeta.content) doc.lang = langMeta.content;
  var KO = /^ko/i.test(doc.lang || '');
  var UI = KO
    ? { copied: '복사했어요', manual: '텍스트를 선택해 직접 복사해 주세요', email: '이메일 주소를 복사했어요', menu: '메뉴', close: '메뉴 닫기' }
    : { copied: 'Copied', manual: 'Select the text and copy it manually', email: 'Email address copied', menu: 'Menu', close: 'Close menu' };

  var SW = window.SW = window.SW || {};
  var linkMeta = document.querySelector('meta[name="sw-links"]');
  var cleanLinks = (doc.getAttribute('data-links') || (linkMeta && linkMeta.content)) !== 'html';

  /* Page links work both on Vercel (clean URLs) and when files are opened directly. */
  SW.link = function (page) {
    if (cleanLinks) return page === 'index' ? '/' : '/' + page;
    return page + '.html';
  };
  SW.asset = function (path) { return (cleanLinks ? '/' : '') + path; };
  SW.preview = location.protocol === 'file:' || !!document.querySelector('meta[name="sw-preview"][content="true"]');
  var loaded = {};
  SW.loadScript = function (src) {
    if (!loaded[src]) loaded[src] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
    return loaded[src];
  };
  SW.reducedMotion = function () { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; };
  SW.store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
    del: function (k) { try { window.localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } }
  };

  var toastEl = document.querySelector('[data-toast]');
  var toastTimer;
  SW.toast = function (msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2600);
  };

  SW.copy = function (text, okMsg) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      SW.toast(ok ? (okMsg || UI.copied) : UI.manual);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { SW.toast(okMsg || UI.copied); }, fallback);
    } else fallback();
  };

  SW.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ---------- Header ---------- */
  var header = document.querySelector('[data-header]');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    var btn = header.querySelector('.menu-btn');
    var menu = document.getElementById('mobile-menu');
    if (btn && menu) {
      var setOpen = function (open) {
        btn.setAttribute('aria-expanded', String(open));
        menu.hidden = !open;
        btn.querySelector('.sr-only').textContent = open ? UI.close : UI.menu;
      };
      btn.addEventListener('click', function () { setOpen(btn.getAttribute('aria-expanded') !== 'true'); });
      menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setOpen(false); btn.focus(); } });
      window.addEventListener('resize', function () { if (window.innerWidth > 1180 && !menu.hidden) setOpen(false); });
    }
  }

  /* ---------- Tabs (FAQ audience switch, admin) ---------- */
  document.querySelectorAll('[role="tablist"]').forEach(function (list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"][aria-controls]'));
    if (!tabs.length) return;
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          var n = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
          select(tabs[n], true);
        }
      });
    });
  });

  /* ---------- Copy buttons ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]');
    if (b) SW.copy(b.getAttribute('data-copy'), UI.email);
  });

  /* ---------- Open the FAQ item named in the URL hash ---------- */
  if (location.hash && /^#f[ht]-\d+$/.test(location.hash)) {
    var d = document.querySelector(location.hash);
    if (d && d.tagName === 'DETAILS') d.open = true;
  }

  /* ---------- Hero example: one project stepping through its four stages ---------- */
  var plan = document.querySelector('[data-plan]');
  if (plan) {
    var rows = plan.querySelectorAll('.plan-steps li');
    var at = 0, visible = true;
    var show = function (n) {
      Array.prototype.forEach.call(rows, function (li, k) {
        li.classList.toggle('is-done', k < n);
        li.classList.toggle('is-on', k === n);
      });
    };
    if (SW.reducedMotion()) {
      show(rows.length - 1);
    } else {
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(plan);
      }
      show(0);
      setInterval(function () {
        if (!visible || document.hidden) return;
        at = (at + 1) % (rows.length + 1); // one beat with everything done, then start over
        show(at === rows.length ? rows.length : at);
        if (at === rows.length) Array.prototype.forEach.call(rows, function (li) { li.classList.remove('is-on'); li.classList.add('is-done'); });
      }, 1800);
    }
  }
})();
