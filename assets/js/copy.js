/*
 * A Copy button on every code block. Added by script so a reader without JavaScript sees
 * the block as it is, and skipped where the clipboard is not available at all.
 */
(function () {
  if (!navigator.clipboard || !navigator.clipboard.writeText) return;
  document.querySelectorAll('.code-scroll').forEach(function (block) {
    var code = block.querySelector('pre > code');
    if (!code || block.closest('dialog')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy';
    button.textContent = 'Copy';
    button.setAttribute('aria-live', 'polite');
    button.addEventListener('click', function () {
      navigator.clipboard.writeText(code.textContent).then(function () {
        button.textContent = 'Copied';
        window.setTimeout(function () { button.textContent = 'Copy'; }, 1600);
      }, function () {
        button.textContent = 'Blocked';
        window.setTimeout(function () { button.textContent = 'Copy'; }, 1600);
      });
    });
    block.classList.add('has-copy');
    block.appendChild(button);
  });
})();
