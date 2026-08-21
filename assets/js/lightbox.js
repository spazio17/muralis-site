/*
 * Opens a screenshot at full size.
 *
 * A native <dialog> does the work: showModal() traps focus, closes on Escape, makes the
 * page behind it inert and restores focus to the trigger on close. All of that is
 * fiddly to reimplement and easy to get subtly wrong, which is the usual reason a
 * hand-rolled lightbox is a keyboard trap.
 *
 * Degrades honestly: if <dialog> is unsupported the buttons are left alone rather than
 * becoming dead controls, so a click still does nothing surprising.
 */
(function () {
  var dialog = document.getElementById('lightbox');
  if (!dialog || typeof dialog.showModal !== 'function') {
    // No modal support: strip the affordance rather than leave a button that lies.
    document.querySelectorAll('button.shot-open').forEach(function (b) {
      b.style.cursor = 'default';
    });
    return;
  }

  var full = document.getElementById('lightbox-img');
  var caption = document.getElementById('lightbox-caption');
  var close = document.getElementById('lightbox-close');

  document.querySelectorAll('button.shot-open').forEach(function (button) {
    button.addEventListener('click', function () {
      var img = button.querySelector('img');
      if (!img) return;
      full.src = img.currentSrc || img.src;
      full.alt = img.alt;
      caption.textContent = img.alt;
      dialog.showModal();
    });
  });

  close.addEventListener('click', function () {
    dialog.close();
  });

  // Clicking the backdrop closes. The check is on the dialog itself being the target:
  // the sheet inside it stops the event reaching here, so a click on the image does not
  // dismiss the thing the reader just opened.
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  // Drop the (potentially large) image once it is no longer on screen.
  dialog.addEventListener('close', function () {
    full.removeAttribute('src');
  });
})();
