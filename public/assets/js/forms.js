/* SoloWorks — quote request form (Korean and English pages).
   Validation, on-device drafts, submission to /api/register, a clear confirmation,
   and an email/copy fallback so nobody loses what they typed. */
(function () {
  'use strict';
  var SW = window.SW || {};
  var API = '/api/register';
  var CONTACT_EMAIL = 'hello@soloworks.in';
  var esc = SW.esc;
  var LANG = /^ko/i.test(document.documentElement.lang || '') ? 'ko' : 'en';
  var O = window.SW_OPTIONS || { services: [] };
  var ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="draw" d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  var ICON_ALERT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8v5M12 16.5h.01"/><circle cx="12" cy="12" r="9"/></svg>';

  var T = {
    ko: {
      contact_name: '이름을 입력해 주세요.', company_name: '회사명(상호)을 입력해 주세요.', email: '이메일 주소를 확인해 주세요. 예: name@company.com',
      phone: '연락처를 확인해 주세요. 예: 010-1234-5678', service: '맡길 업무를 선택해 주세요.', details: '요청 내용을 간단히 적어 주세요.',
      consent: '개인정보 수집·이용에 동의해 주세요.', required: '이 항목을 입력해 주세요.', choose: '하나를 선택해 주세요.', tick: '체크해 주세요.',
      tooLong: function (n) { return n.toLocaleString('ko-KR') + '자 이내로 적어 주세요.'; },
      sending: '보내는 중…', toast: '견적 요청을 보냈어요',
      doneTitle: '요청이 접수됐어요', doneLead: function (d) { return (d.contact_name ? esc(d.contact_name) + '님, ' : '') + '감사합니다. 영업시간에는 담당 PM이 바로 연락드립니다. 연락받으실 이메일: <strong>' + esc(d.email) + '</strong>'; },
      ref: '접수 번호', next: '다음 단계',
      steps: ['담당 PM이 바로 연락드려 범위와 금액을 맞춥니다.', '동의하시면 바로 작업을 시작합니다. 그전에는 비용이 없습니다.', '카드로 결제하시면 카드 영수증이 즉시 발급됩니다.'],
      another: '다른 요청 보내기',
      preview: '<strong>미리보기입니다. 실제로 전송되지 않았습니다.</strong> 실제 사이트에서는 요청이 저장되고 담당자에게 알림이 갑니다.',
      failTitle: '온라인으로 보내지 못했어요.', failKeep: ' 작성하신 내용은 그대로 있습니다.', retry: '다시 시도', emailIt: '이메일로 보내기', copyIt: '내용 복사',
      fallback: '아래 내용을 복사해 이메일로 보내 주셔도 됩니다:', copyAddr: '주소 복사', copied: '내용을 복사했어요', yes: '예',
      fail: { network: '서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.', no_backend: '이 사본에서는 온라인 전송을 사용할 수 없어요.', bad_response: '서버 응답이 올바르지 않아요.', not_configured: '아직 온라인 전송이 설정되지 않았어요.', delivery_failed: '지금은 서버에 저장하지 못했어요.', too_fast: '스팸 방지 기능에 의해 전송이 막혔어요.', server_error: '서버에서 문제가 생겼어요.' },
      mailSubject: 'SoloWorks 견적 요청', draft: '이 기기에 저장된 작성 내용을 불러왔어요.', clear: '지우기', consentLabel: '개인정보 수집·이용 동의'
    },
    en: {
      contact_name: 'Enter your name.', company_name: 'Enter your company or business name.', email: 'Enter an email like name@company.com.',
      phone: 'Check the phone number. For example: 010-1234-5678', service: 'Choose the type of work.', details: 'Tell us briefly what you need.',
      consent: 'Please agree so we can reply to your request.', required: 'Fill in this field.', choose: 'Choose one.', tick: 'Please tick this box.',
      tooLong: function (n) { return 'Keep this under ' + n.toLocaleString('en-US') + ' characters.'; },
      sending: 'Sending…', toast: 'Quote request sent',
      doneTitle: 'Request received', doneLead: function (d) { return 'Thanks' + (d.contact_name ? ', ' + esc(String(d.contact_name).split(/\s+/)[0]) : '') + '. During business hours your PM gets in touch right away, at <strong>' + esc(d.email) + '</strong>.'; },
      ref: 'Reference', next: 'What happens next',
      steps: ['Your PM gets in touch right away to agree scope and price.', 'Work starts as soon as you agree. Nothing is charged before that.', 'Pay by card and the receipt is issued instantly.'],
      another: 'Send another request',
      preview: '<strong>Preview only. Nothing was sent.</strong> On the live site the request is saved and the team gets an alert.',
      failTitle: 'We couldn’t send this online.', failKeep: ' Your answers are still here.', retry: 'Try again', emailIt: 'Email my answers', copyIt: 'Copy my answers',
      fallback: 'You can also copy your answers below and email them to:', copyAddr: 'Copy address', copied: 'Answers copied', yes: 'Yes',
      fail: { network: 'We couldn’t reach our server. Check your connection and try again.', no_backend: 'Online sending isn’t available on this copy of the site.', bad_response: 'Our server sent an unexpected response.', not_configured: 'Online sending isn’t switched on for this site yet.', delivery_failed: 'Our server couldn’t save your request just now.', too_fast: 'This submission was blocked by our spam filter.', server_error: 'Something went wrong on our server.' },
      mailSubject: 'SoloWorks quote request', draft: 'We restored your unsent answers from this device.', clear: 'Clear', consentLabel: 'Privacy consent'
    }
  }[LANG];

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE_RE = /^\+?[0-9 ()\-.]{7,20}$/;

  /* ---------- Field helpers ---------- */
  function fieldOf(el) { return el.closest('.field'); }
  function controlsIn(scope) {
    return Array.prototype.slice.call(scope.querySelectorAll('input, select, textarea')).filter(function (el) {
      return el.name && el.name !== 'website_url' && !el.closest('.hp');
    });
  }
  function labelText(field) {
    var l = field && field.querySelector(':scope > label > span, :scope > .label > span');
    if (l && l.closest('.q-tiles')) l = null;
    return l ? l.textContent.trim() : '';
  }
  function setError(field, msg) {
    if (!field) return;
    var err = field.querySelector(':scope > .field-error');
    var ctl = field.querySelector('[role="radiogroup"]') || field.querySelector('input, select, textarea');
    if (msg) {
      field.classList.add('is-invalid');
      if (!err) {
        err = document.createElement('p');
        err.className = 'field-error';
        err.id = (ctl && ctl.id ? ctl.id : (ctl && ctl.getAttribute('aria-labelledby')) || 'f' + Math.random().toString(36).slice(2)) + '-err';
        field.insertBefore(err, field.querySelector(':scope > .field-help') || null);
      }
      err.textContent = msg;
      if (ctl) {
        ctl.setAttribute('aria-invalid', 'true');
        var d = (ctl.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
        if (d.indexOf(err.id) < 0) d.push(err.id);
        ctl.setAttribute('aria-describedby', d.join(' '));
      }
    } else {
      field.classList.remove('is-invalid');
      if (err) {
        if (ctl) {
          ctl.removeAttribute('aria-invalid');
          var d2 = (ctl.getAttribute('aria-describedby') || '').split(' ').filter(function (x) { return x && x !== err.id; });
          if (d2.length) ctl.setAttribute('aria-describedby', d2.join(' ')); else ctl.removeAttribute('aria-describedby');
        }
        err.remove();
      }
    }
  }
  function checkValue(el) {
    if (el.type === 'checkbox') return el.required && !el.checked ? (T[el.name] || T.tick) : '';
    if (el.type === 'radio') {
      var picked = el.form && el.form.querySelector('input[name="' + el.name + '"]:checked');
      return el.required && !picked ? (T[el.name] || T.choose) : '';
    }
    var v = (el.value || '').trim();
    if (!v) return el.required ? (T[el.name] || T.required) : '';
    if (el.type === 'email' && !EMAIL_RE.test(v)) return T.email;
    if (el.type === 'tel' && !PHONE_RE.test(v)) return T.phone;
    var ml = Number(el.getAttribute('maxlength'));
    if (ml && v.length > ml) return T.tooLong(ml);
    return '';
  }
  function validateField(field) {
    if (!field) return true;
    var ctls = Array.prototype.slice.call(field.querySelectorAll('input, select, textarea'));
    if (!ctls.length) return true;
    var m = '';
    for (var i = 0; i < ctls.length && !m; i++) m = checkValue(ctls[i]);
    setError(field, m);
    return !m;
  }
  function validateForm(form) {
    var first = null;
    Array.prototype.forEach.call(form.querySelectorAll('.field'), function (f) { if (!validateField(f) && !first) first = f; });
    return first;
  }
  function focusField(field) {
    var el = field.querySelector('input, select, textarea');
    if (!el) return;
    el.focus({ preventScroll: true });
    field.scrollIntoView({ behavior: SW.reducedMotion && SW.reducedMotion() ? 'auto' : 'smooth', block: 'center' });
  }
  function collect(form) {
    var data = {};
    controlsIn(form).forEach(function (el) {
      if (el.type === 'radio') {
        if (!(el.name in data)) data[el.name] = '';
        if (el.checked) data[el.name] = el.value;
        return;
      }
      data[el.name] = el.type === 'checkbox' ? el.checked : (el.value || '').trim();
    });
    return data;
  }
  function readable(form, data) {
    return controlsIn(form).map(function (el) {
      var v = data[el.name];
      if (!v || el.type === 'hidden') return null;
      if (el.type === 'checkbox') return { label: T.consentLabel, text: T.yes };
      if (el.type === 'radio') {
        if (!el.checked) return null;
        var box = el.nextElementSibling;
        return { label: labelText(fieldOf(el)) || el.name, text: box ? box.textContent.trim() : v };
      }
      var text = el.tagName === 'SELECT' ? el.options[el.selectedIndex].text : v;
      return { label: labelText(fieldOf(el)) || el.name, text: text };
    }).filter(Boolean);
  }
  function updateCounters(scope) {
    Array.prototype.forEach.call(scope.querySelectorAll('textarea[data-counter]'), function (ta) {
      var c = document.querySelector('[data-count-for="' + ta.id + '"]');
      if (c) c.textContent = ta.value.length.toLocaleString(LANG === 'ko' ? 'ko-KR' : 'en-US');
    });
  }

  /* ---------- Submission ---------- */
  function previewResponse() {
    // Preview copies (opened from disk or the design preview): nothing is sent.
    return new Promise(function (r) { setTimeout(r, 700); }).then(function () { return { ok: true, ref: 'SW-Q-PREVIEW', preview: true }; });
  }
  function send(kind, data, hp, startedAt) {
    if (SW.preview) return previewResponse();
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 25000);
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: kind, data: data, hp: hp || '', elapsed: Date.now() - startedAt, page: location.pathname }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      clearTimeout(timer);
      return res.text().then(function (txt) {
        var json = null;
        try { json = JSON.parse(txt); } catch (e) { json = null; }
        if (!json) return { ok: false, error: res.status === 404 ? 'no_backend' : 'bad_response' };
        return json;
      });
    }, function () {
      clearTimeout(timer);
      return { ok: false, error: 'network' };
    });
  }

  function mailtoFor(rows) {
    var body = rows.map(function (r) { return r.label + ': ' + r.text; }).join('\n');
    if (body.length > 1800) body = body.slice(0, 1800) + '\n…';
    return 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent(T.mailSubject) + '&body=' + encodeURIComponent(body);
  }

  function renderFailure(box, rows, error, onRetry) {
    var text = rows.map(function (r) { return r.label + ': ' + r.text; }).join('\n');
    box.innerHTML =
      '<span class="result-icon is-error">' + ICON_ALERT + '</span>' +
      '<div><h2>' + esc(T.failTitle) + '</h2><p class="lead">' + esc(T.fail[error] || T.fail.server_error) + esc(T.failKeep) + '</p></div>' +
      '<div class="result-actions"><button type="button" class="btn btn-talent" data-retry>' + esc(T.retry) + '</button><a class="btn btn-ghost" href="' + esc(mailtoFor(rows)) + '">' + esc(T.emailIt) + '</a><button type="button" class="btn btn-ghost" data-copy-answers>' + esc(T.copyIt) + '</button></div>' +
      '<div class="fallback-box"><p>' + esc(T.fallback) + '</p>' +
      '<p class="email-line"><code>' + CONTACT_EMAIL + '</code><button type="button" class="copy-btn" data-copy="' + CONTACT_EMAIL + '">' + esc(T.copyAddr) + '</button></p>' +
      '<label class="sr-only" for="answers-copy">' + esc(T.copyIt) + '</label><textarea id="answers-copy" readonly>' + esc(text) + '</textarea></div>';
    box.querySelector('[data-retry]').addEventListener('click', onRetry);
    box.querySelector('[data-copy-answers]').addEventListener('click', function () { SW.copy(text, T.copied); });
  }

  function renderSuccess(box, data, res) {
    var ref = res.ref ? '<p class="ref">' + esc(T.ref) + ' <b>' + esc(res.ref) + '</b></p>' : '';
    var html = '<span class="result-icon">' + ICON_CHECK + '</span>';
    if (res.preview) html += '<p class="preview-banner"><span>' + T.preview + '</span></p>';
    html += '<div><h2>' + esc(T.doneTitle) + '</h2><p class="lead">' + T.doneLead(data) + '</p></div>' + ref +
      '<div><h3 class="small">' + esc(T.next) + '</h3><ol class="next-steps">' + T.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>' +
      '<div class="result-actions"><button type="button" class="btn btn-ghost" data-another>' + esc(T.another) + '</button></div>';
    box.innerHTML = html;
  }

  function setBusy(btn, busy, label) {
    if (!btn) return;
    if (busy) {
      btn._label = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>' + esc(label || T.sending);
    } else {
      btn.disabled = false;
      if (btn._label) btn.innerHTML = btn._label;
    }
  }
  function scrollToCard(card) {
    var r = card.getBoundingClientRect();
    if (r.top < 70 || r.top > window.innerHeight * 0.6) {
      var far = Math.abs(r.top) > window.innerHeight;
      card.scrollIntoView({ behavior: far || (SW.reducedMotion && SW.reducedMotion()) ? 'auto' : 'smooth', block: 'start' });
    }
  }

  /* ---------- Form ---------- */
  function initForm(form) {
    var kind = form.getAttribute('data-form');
    var card = form.closest('.form-card');
    var result = card.querySelector('[data-result]');
    var submit = form.querySelector('[data-submit]');
    var draftKey = 'sw-draft-' + kind + '-' + LANG;
    var startedAt = Date.now();

    function saveDraft() {
      var data = collect(form);
      var any = Object.keys(data).some(function (k) { return data[k] && k !== 'contact_language'; });
      if (any) SW.store.set(draftKey, JSON.stringify({ v: 1, t: Date.now(), data: data }));
      else SW.store.del(draftKey);
    }
    function loadDraft() {
      var raw = SW.store.get(draftKey);
      if (!raw) return;
      try {
        var d = JSON.parse(raw);
        if (!d || d.v !== 1 || Date.now() - d.t > 14 * 864e5) { SW.store.del(draftKey); return; }
        Object.keys(d.data || {}).forEach(function (n) {
          if (n === 'contact_language') return;
          var els = form.querySelectorAll('[name="' + n + '"]');
          if (!els.length || d.data[n] == null) return;
          Array.prototype.forEach.call(els, function (el) {
            if (el.type === 'radio') el.checked = el.value === d.data[n];
            else if (el.type === 'checkbox') el.checked = !!d.data[n];
            else el.value = d.data[n];
          });
        });
        updateCounters(form);
        var note = document.createElement('p');
        note.className = 'draft-note';
        note.innerHTML = '<span>' + esc(T.draft) + '</span><button type="button">' + esc(T.clear) + '</button>';
        note.querySelector('button').addEventListener('click', function () {
          SW.store.del(draftKey); form.reset(); updateCounters(form); note.remove(); if (steps.length) showStep(0, false);
          Array.prototype.forEach.call(form.querySelectorAll('.field.is-invalid'), function (f) { setError(f, ''); });
        });
        var nav = form.querySelector('.flow-nav, .q-nav');
        if (nav) nav.before(note); else form.appendChild(note);
      } catch (e) { SW.store.del(draftKey); }
    }

    form.addEventListener('input', onEdit);
    form.addEventListener('change', onEdit);
    function onEdit(e) {
      var f = e.target.closest && e.target.closest('.field');
      if (f && f.classList.contains('is-invalid')) validateField(f);
      if (e.target.matches && e.target.matches('textarea[data-counter]')) updateCounters(form);
      clearTimeout(onEdit.t);
      onEdit.t = setTimeout(saveDraft, 400);
    }

    /* ---------- Slides: one short question per screen ---------- */
    var steps = Array.prototype.slice.call(form.querySelectorAll('[data-step]'));
    var current = 0;
    var btnNext = form.querySelector('[data-next]'), btnBack = form.querySelector('[data-back]');
    var stepNow = form.querySelector('[data-step-now]'), stepBar = form.querySelector('[data-step-bar]');
    function stepOf(el) { var s = el.closest('[data-step]'); return s ? steps.indexOf(s) : -1; }
    function showStep(i, focus) {
      if (!steps.length) return;
      current = Math.max(0, Math.min(i, steps.length - 1));
      steps.forEach(function (s, k) { s.hidden = k !== current; });
      var last = current === steps.length - 1;
      if (btnBack) btnBack.hidden = current === 0;
      if (btnNext) btnNext.hidden = last;
      if (submit) submit.hidden = !last;
      if (stepNow) stepNow.textContent = String(current + 1);
      if (stepBar) stepBar.style.width = ((current + 1) / steps.length * 100) + '%';
      if (focus) {
        var first = steps[current].querySelector('input:checked, input:not([type=hidden]), textarea');
        if (first) first.focus({ preventScroll: true });
        scrollToCard(card);
      }
    }
    function stepValid(i) {
      var bad = null;
      Array.prototype.forEach.call(steps[i].querySelectorAll('.field'), function (f) { if (!validateField(f) && !bad) bad = f; });
      if (bad) focusField(bad);
      return !bad;
    }
    function next() { if (stepValid(current)) showStep(current + 1, true); }
    if (steps.length) {
      if (btnNext) btnNext.addEventListener('click', next);
      if (btnBack) btnBack.addEventListener('click', function () { showStep(current - 1, true); });
      // Tapping a type of work moves on by itself, like a lead form.
      // Only after a tap or click, so keyboard users can arrow through the options and press Next.
      var lastPointer = 0;
      form.addEventListener('pointerdown', function () { lastPointer = Date.now(); });
      form.addEventListener('change', function (e) {
        if (e.target.type === 'radio' && Date.now() - lastPointer < 1000 && stepOf(e.target) === current && current < steps.length - 1) {
          setTimeout(function () { if (stepValid(current)) showStep(current + 1, true); }, 220);
        }
      });
      showStep(0, false);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      // Enter on an earlier slide moves forward instead of sending.
      if (steps.length && current < steps.length - 1) { next(); return; }
      var bad = validateForm(form);
      if (bad) { if (steps.length) showStep(stepOf(bad), false); focusField(bad); return; }
      var data = collect(form);
      var rows = readable(form, data);
      setBusy(submit, true);
      send(kind, data, (form.querySelector('[name="website_url"]') || {}).value, startedAt).then(function (res) {
        setBusy(submit, false);
        if (res && res.error === 'invalid' && res.fields) {
          var firstBad = null;
          Object.keys(res.fields).forEach(function (n) {
            var el = form.querySelector('[name="' + n + '"]');
            if (el) { setError(fieldOf(el), T[n] || res.fields[n]); if (!firstBad) firstBad = fieldOf(el); }
          });
          if (firstBad) { if (steps.length) showStep(stepOf(firstBad), false); focusField(firstBad); }
          return;
        }
        form.hidden = true;
        result.hidden = false;
        if (res && res.ok) {
          SW.store.del(draftKey);
          renderSuccess(result, data, res);
          // Ads: count a successful quote request as a Meta "Lead" (no personal details are sent)
          try { if (window.fbq) window.fbq('track', 'Lead', { content_category: data.service || '' }); } catch (e) {}
          SW.toast(T.toast);
          var again = result.querySelector('[data-another]');
          if (again) again.addEventListener('click', function () {
            form.reset(); updateCounters(form); result.hidden = true; result.innerHTML = ''; form.hidden = false; startedAt = Date.now(); showStep(0, false);
          });
        } else {
          renderFailure(result, rows, res && res.error, function () { result.hidden = true; result.innerHTML = ''; form.hidden = false; });
        }
        scrollToCard(card);
        result.focus({ preventScroll: true });
      });
    });

    loadDraft();
    // ?service=test_edit on a link (for example the free test offer) pre-selects the type of work.
    function pickService(id) {
      if (!id || !/^[a-z_]+$/.test(id)) return;
      var radio = form.querySelector('input[name="service"][value="' + id + '"]');
      if (radio) {
        radio.checked = true; var f = fieldOf(radio); if (f && f.classList.contains('is-invalid')) validateField(f);
        if (steps.length && current === 0) showStep(1, false);
      }
    }
    pickService(new URLSearchParams(location.search).get('service'));
    Array.prototype.forEach.call(document.querySelectorAll('[data-pick-service]'), function (a) {
      a.addEventListener('click', function () { pickService(a.getAttribute('data-pick-service')); saveDraft(); });
    });
    updateCounters(form);
  }

  Array.prototype.forEach.call(document.querySelectorAll('form[data-form]'), initForm);
})();
