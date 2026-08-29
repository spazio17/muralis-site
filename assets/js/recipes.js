/*
 * The recipe sheets: fill each one with the blueprint it names, and wire the
 * copy buttons.
 *
 * The YAML is fetched from blueprints/ at runtime rather than pasted into
 * index.html, so the page and the file it hands to Home Assistant cannot drift
 * apart: there is one copy, and the copy button copies exactly what is on
 * screen. Those files are in turn checked against the blueprint repository by
 * CI, since that repository is what Home Assistant actually imports from.
 *
 * Everything degrades: a failed fetch leaves the sheet saying so and pointing
 * at GitHub, and the Add to Home Assistant button never depended on this script
 * at all, because it is a plain link.
 */
(function () {
  'use strict';

  var blocks = document.querySelectorAll('code[data-blueprint]');
  if (!blocks.length) {
    return;
  }

  // One request per distinct file, shared by the block that shows it and the
  // button that copies it.
  var loaded = Object.create(null);

  Array.prototype.forEach.call(blocks, function (block) {
    var path = block.getAttribute('data-blueprint');
    fetch(path, { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) {
          throw new Error(response.status + ' ' + response.statusText);
        }
        return response.text();
      })
      .then(function (text) {
        loaded[path] = text;
        block.textContent = text;
      })
      .catch(function () {
        // textContent, never innerHTML: this string ends up next to a file the
        // page did not write.
        block.textContent = 'The blueprint could not be loaded here. '
          + 'It is on GitHub, linked below, and the Add to Home Assistant '
          + 'button works regardless.';
      });
  });

  function flash(button, message) {
    var original = button.getAttribute('data-label') || button.textContent;
    button.setAttribute('data-label', original);
    button.textContent = message;
    window.setTimeout(function () {
      button.textContent = original;
    }, 1600);
  }

  Array.prototype.forEach.call(document.querySelectorAll('.copy-yaml'), function (button) {
    button.addEventListener('click', function () {
      var text = loaded[button.getAttribute('data-for')];
      if (!text) {
        flash(button, 'Not loaded yet');
        return;
      }
      // The clipboard API rejects outside a secure context and in some privacy
      // settings, so a refusal has to say so rather than look like a no-op.
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        flash(button, 'Copying is blocked');
        return;
      }
      navigator.clipboard.writeText(text).then(function () {
        flash(button, 'Copied');
      }, function () {
        flash(button, 'Copying is blocked');
      });
    });
  });
}());
