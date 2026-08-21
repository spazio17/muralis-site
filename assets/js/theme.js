/*
 * Theme pick, mirroring the web admin's own control: the page follows the
 * system by default and remembers an explicit choice in localStorage. The
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
    var explicit = document.documentElement.getAttribute('data-theme');
    if (explicit) return explicit;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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

  // Follow the system while no explicit choice has been made.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', reflect);
  reflect();
})();
