/*
 * Theme pick, the same three-way control the app's web admin has: Auto follows the system,
 * Light and Dark are explicit choices remembered in localStorage, and Auto forgets them. The
 * initial read is a separate inline snippet in each page's <head> so the correct palette is
 * applied before first paint; this file only wires the buttons.
 *
 * Every access is guarded: localStorage throws outright in some privacy modes, and a thrown
 * exception here would leave the buttons dead rather than merely unable to remember a
 * preference.
 */
(function () {
  var pick = document.querySelector('.themepick');
  if (!pick) return;
  var root = document.documentElement;

  function reflect() {
    var chosen = root.getAttribute('data-theme') || 'auto';
    pick.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.theme === chosen));
    });
  }

  pick.addEventListener('click', function (event) {
    var button = event.target.closest('button[data-theme]');
    if (!button) return;
    if (button.dataset.theme === 'auto') {
      root.removeAttribute('data-theme');
      try { localStorage.removeItem('muralis-theme'); } catch (e) { /* ignore */ }
    } else {
      root.setAttribute('data-theme', button.dataset.theme);
      try { localStorage.setItem('muralis-theme', button.dataset.theme); } catch (e) { /* ignore */ }
    }
    reflect();
  });

  reflect();
})();
