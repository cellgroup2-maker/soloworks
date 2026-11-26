/* Meta Pixel for SoloWorks ads (pixel 29621998667431074).
   Kept in its own file because the site's Content-Security-Policy blocks inline scripts.
   Same code as Meta's snippet, with straight quotes. The quote form also sends a "Lead"
   event after a successful submission (see forms.js). Not loaded on the team dashboard. */
!function (f, b, e, v, n, t, s) {
  if (f.fbq) return; n = f.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  };
  if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
  n.queue = []; t = b.createElement(e); t.async = !0;
  t.src = v; s = b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t, s);
}(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '29621998667431074');
fbq('track', 'PageView');
