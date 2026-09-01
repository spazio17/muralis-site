/*
 * The "In motion" clip switcher.
 *
 * One clip is shown at a time, chosen from the list beside it. That is the whole
 * design: four clips stacked made a section three times the height of every
 * other one on the page, and four panels looping at once was tiring to look at
 * whatever size they were.
 *
 * Three rules, each of which the section needed:
 *
 *   Nothing loads until it is wanted. The markup carries no autoplay attribute
 *   and preload="none", so a visitor who never reaches the section pays for one
 *   poster image rather than 780 KB of video. The posters are real files rather
 *   than a #t=0.1 fragment: a video that has not been played is not obliged to
 *   paint anything, and an empty box is not a clip.
 *
 *   Only the chosen clip runs, and only while the section is on screen. An
 *   offscreen video still decodes, which on a laptop is a fan spinning up for a
 *   picture nobody is looking at.
 *
 *   Reduced motion is honoured by handing the clip back to the reader: controls
 *   appear and nothing starts on its own. A silent loop that plays whether you
 *   want it or not is exactly what that preference is about.
 *
 * Without this file every panel is visible and every clip sits on its poster, so
 * the section degrades to a list of four stills with their text. Longer than
 * intended, but a section. That is the same bargain motion.js made, and it is
 * why the panels are NOT marked hidden in the markup: they were at first, and
 * with scripting off that left three of the four clips unreachable behind tabs
 * that could not do anything. The script hides them on load instead.
 */
(function () {
  var deck = document.querySelector('.clipdeck');
  if (!deck) return;

  var tabs = Array.prototype.slice.call(deck.querySelectorAll('[role="tab"]'));
  var panels = tabs.map(function (tab) {
    return document.getElementById(tab.getAttribute('aria-controls'));
  });
  if (!tabs.length || panels.indexOf(null) !== -1) return;

  var still = false;
  try {
    still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { /* no matchMedia: treat as motion allowed */ }

  // False until the observer says otherwise, when there is an observer: settle()
  // runs once at load, and starting from true made it play the first clip while
  // the section was still below the fold. Pausing a moment later does not unsend
  // the request, so every visitor paid for a clip they had not scrolled to.
  var onScreen = !('IntersectionObserver' in window);
  var current = 0;

  function videoIn(index) {
    return panels[index].querySelector('video');
  }

  // play() rejects with NotAllowedError when the browser declines to autoplay,
  // and that one deserves an answer: hand the clip its controls and leave the
  // page alone. It also rejects with AbortError whenever a pause lands before
  // playback started, which switching tabs quickly does all the time, and
  // treating that as a refusal put player chrome on clips nobody had refused.
  function play(video) {
    if (!video) return;
    var playing = video.play();
    if (playing && typeof playing.catch === 'function') {
      playing.catch(function (error) {
        if (error && error.name === 'NotAllowedError') video.controls = true;
      });
    }
  }

  function settle() {
    tabs.forEach(function (tab, index) {
      var chosen = index === current;
      tab.setAttribute('aria-selected', chosen ? 'true' : 'false');
      tab.tabIndex = chosen ? 0 : -1;
      panels[index].hidden = !chosen;
      var video = videoIn(index);
      if (!video) return;
      if (chosen && !still && onScreen) {
        play(video);
      } else if (!video.paused) {
        video.pause();
      }
    });
  }

  function choose(index, focus) {
    if (index < 0) index = tabs.length - 1;
    if (index >= tabs.length) index = 0;
    // The clip being left is rewound, so coming back to it starts at the
    // beginning rather than halfway through a story the reader has not seen.
    var leaving = videoIn(current);
    if (leaving && index !== current) leaving.currentTime = 0;
    current = index;
    settle();
    if (focus) tabs[current].focus();
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () { choose(index, false); });
  });

  // The list runs down the side of the clip on a wide screen and along the top of
  // it on a narrow one, so its orientation is not something the markup can state
  // once. Announcing the wrong one tells a screen reader user the arrow keys work
  // along an axis the list is not on. Both axes are handled either way.
  var list = deck.querySelector('[role="tablist"]');
  try {
    var sideways = window.matchMedia('(max-width: 56rem)');
    var orient = function () {
      list.setAttribute('aria-orientation', sideways.matches ? 'horizontal' : 'vertical');
    };
    orient();
    if (sideways.addEventListener) sideways.addEventListener('change', orient);
    else if (sideways.addListener) sideways.addListener(orient);
  } catch (e) { /* no matchMedia: leave whatever the markup says */ }

  list.addEventListener('keydown', function (event) {
    var key = event.key;
    if (key === 'ArrowRight' || key === 'ArrowDown') { choose(current + 1, true); }
    else if (key === 'ArrowLeft' || key === 'ArrowUp') { choose(current - 1, true); }
    else if (key === 'Home') { choose(0, true); }
    else if (key === 'End') { choose(tabs.length - 1, true); }
    else { return; }
    event.preventDefault();
  });

  if (still) {
    tabs.forEach(function (tab, index) {
      var video = videoIn(index);
      if (video) video.controls = true;
    });
  } else if ('IntersectionObserver' in window) {
    // threshold 0, deliberately. A ratio threshold is a share of the WHOLE deck,
    // and on a phone the deck is taller than the window, so a threshold of 0.2
    // is unreachable on a short enough screen and the clip would never start.
    // The question here is only "is any of this on screen".
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { onScreen = entry.isIntersecting; });
      settle();
    }, { threshold: 0 }).observe(deck);
  }

  settle();
})();
