/* The home page's motion: the hero tablet sized to one screen with its cord, its pages turning,
   the day that changes the panel and the light on the wall as each hour is read, the switch
   between Home, Pro and Business, and the system stats switched on and off. */
(function () {
  var html = document.documentElement;
  var still = matchMedia('(prefers-reduced-motion: reduce)');

  // A day on the wall: each step sets the panel's screen, the wall's colour and where the light falls.
  var room = document.querySelector('.room'), clock = room.querySelector('.clock');
  var light = {
    restart: ['#1d2236', 'rgba(120,140,255,.18)', '70%', '0%', 'night'],
    wake: ['#ece4d3', 'rgba(224,169,59,.42)', '15%', '15%', 'day'],
    reload: ['#f2ece0', 'rgba(255,240,215,.6)', '50%', '0%', 'day'],
    ambient: ['#eee7da', 'rgba(255,240,215,.5)', '85%', '5%', 'day'],
    frozen: ['#ddcfb5', 'rgba(224,150,59,.45)', '95%', '30%', 'day'],
    off: ['#141626', 'rgba(80,90,160,.12)', '50%', '0%', 'night']
  };
  function steps() { return [].slice.call(document.querySelectorAll('.steps[data-for~="' + html.dataset.mode + '"] .step')); }
  function show(step) {
    if (!step) return;
    steps().forEach(function (s) { s.classList.toggle('on', s === step); });
    var st = step.dataset.state, l = light[st];
    room.dataset.state = st; room.dataset.light = l[4]; clock.textContent = step.dataset.time;
    room.style.setProperty('--wall', l[0]); room.style.setProperty('--light', l[1]);
    room.style.setProperty('--lx', l[2]); room.style.setProperty('--ly', l[3]);
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) show(e.target); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  [].forEach.call(document.querySelectorAll('.step'), function (s) { io.observe(s); });

  // The bricks drop once; the no-cloud picture plays while it is in view.
  [['.fleet', .3], ['.more', .25]].forEach(function (p) {
    var el = document.querySelector(p[0]);
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) el.classList.add('live');
        else if (p[0] === '.fleet') el.classList.remove('live');
      });
    }, { threshold: p[1] }).observe(el);
  });

  // The hero fits the window: the tablet takes the height left, its cord included.
  var hero = document.querySelector('.hero'), hall = hero.querySelector('.hall'), cord = hero.querySelector('.cord'),
      side = hero.querySelector('.sidecord'), sidePath = side.querySelector('path'), sock = side.querySelector('.socket');
  function fit() {
    if (innerWidth >= 1000) {
      var cs = getComputedStyle(hero), col = parseFloat(cs.gridTemplateColumns.split(' ')[1]),
          free = hero.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      var w = Math.max(320, Math.min(col - 80, 980, (free - 28) * 1.6 + 28)); hall.style.width = w + 'px';
      var th = hall.querySelector('.tablet').offsetHeight, hb = hero.getBoundingClientRect(), hl = hall.getBoundingClientRect();
      var x0 = w, y0 = th * .62, x1 = w + 46, y1 = hb.bottom - hl.top - 30;
      side.setAttribute('width', x1 + 40); side.setAttribute('height', y1 + 20);
      sidePath.setAttribute('d', 'M' + x0 + ' ' + y0 + ' C' + (x0 + 40) + ' ' + y0 + ' ' + x1 + ' ' + (y0 + 30) + ' ' + x1 + ' ' + (y0 + 90) + ' V' + (y1 - 18));
      // drawn once, as the arrival's last step; a later fit only reshapes it
      var len = sidePath.getTotalLength(); sidePath.style.strokeDasharray = len + ' ' + len;
      if (!sidePath.dataset.drawn) {
        sidePath.dataset.drawn = 1;
        if (still.matches || !sidePath.animate) sidePath.style.strokeDashoffset = 0;
        else sidePath.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 1200, delay: 1400, easing: 'ease-in-out', fill: 'both' });
      }
      sock.setAttribute('transform', 'translate(' + (x1 - 26) + ' ' + (y1 - 18) + ')');
      return;
    }
    hall.style.width = '';
    var top = hall.getBoundingClientRect().top + scrollY, left = innerHeight - top - cord.getBoundingClientRect().height - 12;
    hall.style.width = Math.max(280, Math.min(820, innerWidth * .92, (left - 28) * 1.6 + 28)) + 'px';
  }
  fit(); addEventListener('resize', fit); if (document.fonts) document.fonts.ready.then(fit);

  // The hero tablet's pages turn every few seconds while it is in view.
  var glass = hero.querySelector('.glass'), inView = true, timer = null, settle = null;
  function pages() { return [].slice.call(hero.querySelectorAll('.reel[data-for~="' + html.dataset.mode + '"] img')); }
  function turn(i) {
    var p = pages(), n = i % p.length;
    p.forEach(function (img, k) {
      img.classList.toggle('was', img.classList.contains('on') && k !== n);
      img.classList.toggle('on', k === n);
    });
    clearTimeout(settle);
    settle = setTimeout(function () { p.forEach(function (img) { img.classList.remove('was'); }); }, 1000);
  }
  function cycle(wait) {
    clearTimeout(timer); timer = null;
    if (still.matches || !inView || document.hidden) return;
    timer = setTimeout(function () {
      var p = pages(), i = p.findIndex(function (img) { return img.classList.contains('on'); });
      turn(i + 1); cycle(4500);
    }, wait);
  }
  new IntersectionObserver(function (es) { inView = es[0].isIntersecting; cycle(4500); }).observe(glass);
  document.addEventListener('visibilitychange', function () { cycle(4500); });

  // Home, Pro, Business.
  function replay(sel) {
    var el = document.querySelector(sel);
    if (el && el.classList.contains('live')) { el.classList.remove('live'); void el.offsetWidth; el.classList.add('live'); }
  }
  function setMode(m) {
    if (html.dataset.mode === m) return;
    html.dataset.mode = m;
    turn(0); cycle(5400);
    try { localStorage.setItem('muralis-mode', m); } catch (e) { /* private mode: not remembered */ }
    document.querySelectorAll('.mode button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === m)); });
    document.querySelectorAll('[data-for~="' + m + '"]').forEach(function (el) { el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap'); });
    replay('.more'); replay('.fleet'); fit();
    var on = steps().filter(function (s) { return s.getBoundingClientRect().top < innerHeight * .55; });
    show(on.length ? on[on.length - 1] : steps()[0]);
  }
  document.querySelectorAll('.mode button').forEach(function (b) {
    b.setAttribute('aria-pressed', String(b.dataset.mode === html.dataset.mode));
    b.addEventListener('click', function () { setMode(b.dataset.mode); });
  });

  // The system stats, off and on: the same page, the same minute.
  var pair = document.querySelector('.look .pair'), toggle = pair.querySelector('.toggle');
  toggle.addEventListener('click', function () {
    var on = toggle.getAttribute('aria-checked') !== 'true';
    toggle.setAttribute('aria-checked', String(on)); pair.classList.toggle('on', on);
  });

  show(steps()[0]);
  cycle(6200);
})();
