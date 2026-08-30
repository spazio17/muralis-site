/*
 * The recipes: hand each blueprint to the overlay, and wire the copy button.
 *
 * The YAML is fetched from blueprints/ rather than pasted into index.html, so
 * the page and the file it hands to Home Assistant cannot drift apart: there is
 * one copy, and the copy button copies exactly what is on screen. Those files
 * are in turn checked against the blueprint repository by CI, since that
 * repository is what Home Assistant actually imports from.
 *
 * It opens in a dialog rather than inside the card, and that is the shape of
 * this section. A blueprint is seventy columns of text; a card is twenty rem
 * wide. Printed in the card, nearly every line would scroll sideways, and the
 * card would grow to twice the height of its neighbour the moment anyone asked
 * to see it. The dialog is the same one the screenshots open in, so showModal()
 * brings the focus trap, the Escape key and the inert page with it.
 *
 * Everything degrades. Without <dialog> the buttons are removed rather than left
 * dead, and the On GitHub link beside each one still goes to the same file. A
 * failed fetch says so and points at GitHub. The Add to Home Assistant button
 * never depended on this script at all, because it is a plain link.
 */
(function () {
  'use strict';

  var buttons = document.querySelectorAll('button.read-yaml');
  if (!buttons.length) {
    return;
  }

  var dialog = document.getElementById('blueprint');
  if (!dialog || typeof dialog.showModal !== 'function') {
    // No modal support: take the affordance away rather than leave a control
    // that does nothing. On GitHub, next to it, still reaches the file.
    Array.prototype.forEach.call(buttons, function (button) {
      button.remove();
    });
    return;
  }

  var code = document.getElementById('blueprint-code');
  var title = document.getElementById('blueprint-title');
  var file = document.getElementById('blueprint-file');
  var copy = document.getElementById('blueprint-copy');
  var close = document.getElementById('blueprint-close');

  var FAILED = 'The blueprint could not be loaded here. It is on GitHub, linked '
    + 'on the card, and the Add to Home Assistant button works regardless.';

  // One request per distinct file, started as soon as the page has, so the
  // overlay opens on the text rather than on the word Loading.
  var loaded = Object.create(null);
  var showing = null;

  function load(path) {
    if (!loaded[path]) {
      loaded[path] = fetch(path, { credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) {
            throw new Error(response.status + ' ' + response.statusText);
          }
          return response.text();
        });
    }
    return loaded[path];
  }

  Array.prototype.forEach.call(buttons, function (button) {
    var path = button.getAttribute('data-blueprint');
    load(path);

    button.addEventListener('click', function () {
      showing = path;
      title.textContent = button.getAttribute('data-title') || '';
      file.textContent = path.replace(/^.*\//, '');
      code.textContent = 'Loading the blueprint…';
      dialog.showModal();

      load(path).then(function (text) {
        // The reader may have closed this one and opened the other while the
        // request was in flight, in which case this answer is no longer wanted.
        if (showing !== path) return;
        // textContent, never innerHTML: this string is a file the page did not
        // write.
        code.textContent = text;
      }, function () {
        if (showing !== path) return;
        code.textContent = FAILED;
      });
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

  copy.addEventListener('click', function () {
    // The clipboard API rejects outside a secure context and under some privacy
    // settings, so a refusal has to say so rather than look like a no-op.
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      flash(copy, 'Copying is blocked');
      return;
    }
    // The two ways this fails are different and must not share a message: the
    // file never arrived, or the browser refused the clipboard.
    load(showing).then(function (text) {
      return navigator.clipboard.writeText(text).then(function () {
        flash(copy, 'Copied');
      }, function () {
        flash(copy, 'Copying is blocked');
      });
    }, function () {
      flash(copy, 'The blueprint is not loaded');
    });
  });

  close.addEventListener('click', function () {
    dialog.close();
  });

  // Clicking the backdrop closes. The test is that the dialog itself is the
  // target: the sheet inside it stops the event getting here, so a click on the
  // code does not dismiss what the reader just opened.
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  // Cleared on close so reopening for the other recipe cannot flash the previous
  // blueprint before the new one is in place.
  dialog.addEventListener('close', function () {
    showing = null;
    code.textContent = '';
  });
}());
