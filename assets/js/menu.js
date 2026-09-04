/*
 * The site menu: one panel, every page, every width.
 *
 * The panel carries `hidden` in the markup rather than being hidden by CSS, so it is shut
 * before this file runs and a reader with no JavaScript is left with a button that does
 * nothing rather than a panel stuck open across the page. That is the same bargain
 * setup.js and waydeck.js make with their decks.
 *
 * Closing on Escape, on a click outside, and on following a link inside are all the same
 * rule: the panel is a detour, and anything that means "I am done here" should end it.
 * The in-page section links matter most for that, since without it the panel would sit
 * over the very heading it just scrolled to.
 */
(function () {
  var button = document.querySelector('.menubtn');
  var panel = document.getElementById('sitemenu');
  if (!button || !panel) {
    return;
  }

  function open() {
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('menu-open');
  }

  function close(focusButton) {
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('menu-open');
    if (focusButton) {
      button.focus();
    }
  }

  button.addEventListener('click', function () {
    if (panel.hidden) {
      open();
    } else {
      close(false);
    }
  });

  panel.addEventListener('click', function (event) {
    if (event.target.closest('a')) {
      close(false);
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !panel.hidden) {
      close(true);
    }
  });

  document.addEventListener('click', function (event) {
    if (panel.hidden) {
      return;
    }
    // A click on the button is its own toggle above; anything else outside shuts the panel.
    if (!panel.contains(event.target) && !button.contains(event.target)) {
      close(false);
    }
  });

  // A width change can move the pages from the bar into the panel and back. Leaving the
  // panel open across that is how a menu ends up covering a page nobody asked it to.
  window.matchMedia('(min-width: 60rem)').addEventListener('change', function () {
    if (!panel.hidden) {
      close(false);
    }
  });
})();
