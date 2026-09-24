/*
 * Theme pick: the page is light unless a reader chose Dark here, and the
 * choice is remembered in localStorage. The
 * initial read is a separate inline snippet in each page's <head> so the
 * correct palette is applied before first paint; this file only wires the
 * buttons.
 *
 * Every access is guarded: localStorage throws outright in some privacy modes,
 * and a thrown exception here would leave the buttons dead rather than merely
 * unable to remember a preference.
 */
(function () {
  var pick = document.querySelector('.themepick');
  if (!pick) return;

  function current() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function reflect() {
    var now = current();
    pick.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.theme === now));
    });
  }

  pick.addEventListener('click', function (event) {
    var button = event.target.closest('button[data-theme]');
    if (!button) return;
    document.documentElement.setAttribute('data-theme', button.dataset.theme);
    try { localStorage.setItem('muralis-theme', button.dataset.theme); } catch (e) { /* ignore */ }
    reflect();
  });

  reflect();
})();
