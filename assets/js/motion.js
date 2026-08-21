/*
 * Motion for muralis.spazio17.org: the roller pass that brings each block onto
 * the page, and the pigment rail under the masthead once the page has scrolled.
 *
 * The stylesheet keeps the clipped state inside the keyframes, so this file can
 * only ever ADD an animation to something already visible. That is deliberate,
 * and it is the second attempt: the first version hid every block and revealed
 * it on an IntersectionObserver callback, and when that callback did not arrive
 * most of the page was invisible. Now the worst case is a page that does not
 * animate, which is a page.
 *
 * Reduced motion is checked here as well as in CSS, so nothing is even marked.
 */
(function () {
  var root = document.documentElement;
  var still = false;

  try {
    still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { /* no matchMedia: treat as motion allowed */ }

  if (!still && 'IntersectionObserver' in window) {
    var strokes = document.querySelectorAll('.stroke');

    // A roller covers a wall in overlapping passes, so siblings are staggered
    // rather than starting together. Per parent, not per document: a stagger
    // counted across the whole page would leave the last block waiting seconds
    // after it came into view.
    var seen = new Map();
    strokes.forEach(function (el) {
      var n = seen.get(el.parentNode) || 0;
      seen.set(el.parentNode, n + 1);
      el.style.animationDelay = Math.min(n * 90, 450) + 'ms';
    });

    // The positive bottom margin fires the callback about a tenth of a viewport
    // BEFORE the block scrolls into view, so the pass is already running when it
    // arrives. Without that the block is briefly on screen unpainted, and the
    // animation then looks like a flicker rather than a stroke.
    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('on');
        watcher.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px 10% 0px', threshold: 0 });

    strokes.forEach(function (el) { watcher.observe(el); });
  }

  // Read scrollY at most once a frame: the handler runs on every scroll event,
  // and an ungated read is the classic way to make a cheap effect feel dear.
  var queued = false;
  function rail() {
    queued = false;
    root.classList.toggle('scrolled', window.scrollY > 24);
  }
  window.addEventListener('scroll', function () {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(rail);
  }, { passive: true });
  rail();
})();
