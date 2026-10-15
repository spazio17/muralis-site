// The system stats pair on the overview: two buttons choose which of the two pictures shows.
(function () {
  var pair = document.querySelector('.statspair');
  if (!pair) return;
  var buttons = pair.querySelectorAll('[data-show]');
  Array.prototype.forEach.call(buttons, function (button) {
    button.addEventListener('click', function () {
      pair.setAttribute('data-stats', button.getAttribute('data-show'));
      Array.prototype.forEach.call(buttons, function (other) {
        other.setAttribute('aria-pressed', String(other === button));
      });
    });
  });
})();
