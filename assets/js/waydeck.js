/*
 * The install section's picker: QR, or Google Play.
 *
 * Same bargain assets/js/setup.js makes for the maker picker, and the same reason no
 * panel carries `hidden` in the HTML: hiding is this file's doing, so a reader with no
 * JavaScript gets both ways one after the other, which is longer but complete, rather
 * than a deck showing nothing.
 *
 * Kept separate from setup.js rather than shared: that file is loaded only on /setup/ and
 * scoped to its own deck, and one generic tab helper for two pages that never appear
 * together would be a shared thing to break for no saving.
 */
(function () {
  var deck = document.querySelector('.waydeck');
  if (!deck) {
    return;
  }

  var tabs = Array.prototype.slice.call(deck.querySelectorAll('[role="tab"]'));
  var panels = Array.prototype.slice.call(deck.querySelectorAll('[role="tabpanel"]'));
  // Paired by position, so an unequal pair means the markup changed under this file.
  // Leaving every panel visible is the honest failure, not guessing.
  if (!tabs.length || tabs.length !== panels.length) {
    return;
  }

  function select(index, moveFocus) {
    for (var i = 0; i < tabs.length; i++) {
      var chosen = i === index;
      tabs[i].setAttribute('aria-selected', chosen ? 'true' : 'false');
      // Roving tabindex: one stop for the whole group, arrows move within it.
      tabs[i].tabIndex = chosen ? 0 : -1;
      panels[i].hidden = !chosen;
    }
    if (moveFocus) {
      tabs[index].focus();
    }
  }

  for (var i = 0; i < tabs.length; i++) {
    (function (index) {
      tabs[index].addEventListener('click', function () {
        select(index, false);
      });
      tabs[index].addEventListener('keydown', function (event) {
        var next = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          next = (index + 1) % tabs.length;
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          next = (index - 1 + tabs.length) % tabs.length;
        } else if (event.key === 'Home') {
          next = 0;
        } else if (event.key === 'End') {
          next = tabs.length - 1;
        }
        if (next === null) {
          return;
        }
        event.preventDefault();
        select(next, true);
      });
    })(i);
  }

  select(0, false);
})();
