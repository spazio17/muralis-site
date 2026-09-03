/*
 * The setup page's maker switcher.
 *
 * Buttons choose a maker and one panel shows at a time. Ordinary tab semantics,
 * so the markup is already correct without this file: every panel stays visible
 * and the page reads as one long list, which is longer but not broken. The same
 * bargain assets/js/clips.js makes, and the reason no panel carries `hidden` in
 * the HTML: hiding is this file's doing, so a reader with no JavaScript is never
 * left with a deck that shows nothing.
 */
(function () {
  var deck = document.querySelector('.vendordeck');
  if (!deck) {
    return;
  }

  var tabs = Array.prototype.slice.call(deck.querySelectorAll('[role="tab"]'));
  var panels = Array.prototype.slice.call(deck.querySelectorAll('[role="tabpanel"]'));
  // Paired by position, so an unequal pair means the markup changed under this
  // file. Leaving every panel visible is the honest failure, not guessing.
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
