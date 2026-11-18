/* SoloWorks — shared option lists for the inquiry form.
   Used by the browser (window.SW_OPTIONS) and by the API (require).
   Each option has a Korean (ko) and English (en) label. The dashboard shows the English label. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SW_OPTIONS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var services = [
    { id: 'video', ko: '숏폼 영상 편집', en: 'Short-form video editing', label: 'Short-form video editing', short: 'Short-form' },
    { id: 'development', ko: '웹·앱 개발', en: 'Web and app development', label: 'Web and app development', short: 'Web and app' },
    { id: 'translation', ko: 'AI 번역 검수', en: 'AI translation review', label: 'AI translation review', short: 'Translation review' },
    { id: 'test_edit', ko: '숏폼 무료 테스트 편집', en: 'Free short-form test edit', label: 'Free short-form test edit', short: 'Free test edit' },
    { id: 'other', ko: '기타 (디자인·리서치 등)', en: 'Other (design, research)', label: 'Other (design, research)', short: 'Other' }
  ];

  var timelines = [
    { id: 'unsure', ko: '아직 미정', en: 'Not sure yet', label: 'Not sure yet' },
    { id: '2w', ko: '2주 이내', en: 'Within 2 weeks', label: 'Within 2 weeks' },
    { id: '2-4w', ko: '2~4주', en: '2 to 4 weeks', label: '2 to 4 weeks' },
    { id: '1-3m', ko: '1~3개월', en: '1 to 3 months', label: '1 to 3 months' },
    { id: 'monthly', ko: '매월 정기', en: 'Ongoing, monthly', label: 'Ongoing, monthly' }
  ];

  var contactLanguages = [
    { id: 'ko', label: 'Korean' },
    { id: 'en', label: 'English' }
  ];

  // Inquiry pipeline in the team dashboard
  var projectStatus = [
    { id: 'new', label: 'New' },
    { id: 'scoping', label: 'PM called, scoping' },
    { id: 'quoted', label: 'Quote sent' },
    { id: 'active', label: 'In production' },
    { id: 'qc', label: 'Quality check' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'closed', label: 'Closed' }
  ];

  function ids(list) { return list.map(function (x) { return typeof x === 'string' ? x : x.id; }); }
  function label(list, id, lang) {
    for (var i = 0; i < list.length; i++) {
      var x = list[i];
      if ((typeof x === 'string' ? x : x.id) === id) return typeof x === 'string' ? x : (lang && x[lang]) || x.label;
    }
    return id || '';
  }
  function find(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  return {
    services: services, timelines: timelines, contactLanguages: contactLanguages, projectStatus: projectStatus,
    ids: ids, label: label, find: find
  };
});
