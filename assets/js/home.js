/* The home page's motion: the hero tablet sized to one screen with its cord, the greeting the
   scroll draws, its pages turning, the day that changes the panel and the light on the wall as
   each hour is read, the switch between Home, Pro and Business, the bricks, the price cards'
   sliding highlight and the tablet switching on at the end. */
(function () {
  var html = document.documentElement;
  var still = matchMedia('(prefers-reduced-motion: reduce)');

  // A day on the wall: each step sets the panel's screen, the wall's colour and where the light falls.
  var room = document.querySelector('.room'), clock = room.querySelector('.clock');
  var light = {
    ready: ['#1d2236', 'rgba(120,140,255,.18)', '70%', '0%', 'night'],
    wake: ['#ece4d3', 'rgba(224,169,59,.42)', '15%', '15%', 'day'],
    reload: ['#f2ece0', 'rgba(255,240,215,.6)', '50%', '0%', 'day'],
    notify: ['#efe8da', 'rgba(255,240,215,.55)', '30%', '5%', 'day'],
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
  // The current step is the last one whose dot has passed the line: on a wide screen the middle
  // under the bar, where the panel sits (home.css); on a narrow one, just below the panel.
  var wideDay = matchMedia('(min-width:901px) and (orientation:landscape)'), dayQueued = false;
  function current() {
    var line = wideDay.matches ? (innerHeight + 64) / 2 : innerHeight * .5, all = steps();
    var on = all.filter(function (s) { return s.getBoundingClientRect().top + 14 <= line; });
    return on.length ? on[on.length - 1] : all[0];
  }
  function follow() { dayQueued = false; show(current()); }
  addEventListener('scroll', function () { if (!dayQueued) { dayQueued = true; requestAnimationFrame(follow); } }, { passive: true });
  addEventListener('resize', follow);

  // The bricks drop once; the no-cloud picture plays while it is in view.
  // The highlights' scenes play while they are in view, and their tiles rise in the first time.
  [['.fleet', .3], ['.more', .25], ['#does', .15], ['.end', .3]].forEach(function (p) {
    var el = document.querySelector(p[0]);
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { el.classList.add('live'); el.classList.add('seen'); }
        else if (p[0] !== '.more') el.classList.remove('live');
      });
    }, { threshold: p[1] }).observe(el);
  });

  // The price's dark card: one shape behind the three tiers, moved onto the chosen edition's card
  // (home.css slides it). Measured, since the cards differ in height and stack on a phone.
  var tierBox = document.querySelector('.tiers'), tierHl = document.createElement('div');
  tierHl.className = 'tier-hl'; tierHl.setAttribute('aria-hidden', 'true'); tierBox.insertBefore(tierHl, tierBox.firstChild);
  function placeTier() {
    var t = tierBox.querySelector('[data-tier="' + ({ home: 'free', pro: 'pro', business: 'business' })[html.dataset.mode] + '"]');
    if (!t) return;
    tierHl.style.transform = 'translate(' + t.offsetLeft + 'px,' + t.offsetTop + 'px)';
    tierHl.style.width = t.offsetWidth + 'px'; tierHl.style.height = t.offsetHeight + 'px';
  }
  placeTier(); addEventListener('resize', placeTier); if (document.fonts) document.fonts.ready.then(placeTier);

  // The bricks, one at a time: picked up to show on a tag what each may do, then pressed back in.
  // The round plays once per visit to the section, after the drop, and waits while the pointer is
  // on the wall; pointing at, tabbing to or tapping a brick lifts that one at once.
  (function () {
    var more = document.querySelector('.more'), still = matchMedia('(prefers-reduced-motion: reduce)');
    var timer = 0, idx = 0, held = false, shown = null;
    function wall() { return [].filter.call(more.querySelectorAll('.brick'), function (b) { return b.offsetParent; }); }
    function lift(b) { if (shown && shown !== b) drop(shown); shown = b; b.classList.add('up'); }
    function drop(b) {
      if (!b.classList.contains('up')) return;
      b.classList.remove('up'); b.classList.add('press', 'shine');
      setTimeout(function () { b.classList.remove('press'); }, 180);
      setTimeout(function () { b.classList.remove('shine'); }, 460);
      if (shown === b) shown = null;
    }
    function stop() { clearTimeout(timer); timer = 0; if (shown) drop(shown); }
    function next() {
      var bricks = wall();
      if (idx >= bricks.length) { timer = 0; return; }
      if (held) { timer = setTimeout(next, 1200); return; }
      var b = bricks[idx++]; lift(b);
      timer = setTimeout(function () { drop(b); timer = setTimeout(next, 1200); }, 2100);
    }
    function start() { stop(); idx = 0; if (!still.matches) timer = setTimeout(next, 1600); }
    new IntersectionObserver(function (es) { if (es[0].isIntersecting) start(); else stop(); }, { threshold: .25 }).observe(more);
    document.querySelectorAll('.mode button').forEach(function (b) { b.addEventListener('click', function () { if (timer) start(); }); });
    more.querySelectorAll('.bricks').forEach(function (w) {
      w.addEventListener('pointerenter', function () { held = true; });
      w.addEventListener('pointerleave', function () { held = false; });
    });
    more.querySelectorAll('.brick').forEach(function (b) {
      b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') lift(b); });
      b.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') drop(b); });
      b.addEventListener('focus', function () { lift(b); });
      b.addEventListener('blur', function () { drop(b); });
      b.addEventListener('click', function () { if (!b.classList.contains('up')) lift(b); });
    });
  })();

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

  // The greeting, drawn by the scroll (html.scrollhero, set in the head): at the top of the page
  // the hero tablet is big and centred with "Welcome to Muralis"; the first stretch of scrolling
  // shrinks it into its place while the text comes in, and scrolling back up reverses it. The
  // track around the hero gives that stretch; the hero stays pinned in it. Only the tablet's
  // transform and opacities move, so nothing shifts.
  var track = document.querySelector('.hero-track'), greet = hero.querySelector('.greet'), words = hero.querySelector('.in');
  var travel = 0, big = { x: 0, y: 0, s: 1 }, drawing = false;
  function between(p, a, b) { return Math.min(1, Math.max(0, (p - a) / (b - a))); }
  function ease(x) { return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function measure() {
    if (!html.classList.contains('scrollhero')) return;
    travel = Math.round(innerHeight * .7);
    track.style.height = (hero.offsetHeight + travel) + 'px';
    hall.style.transform = 'none';
    fit();
    var tab = hall.querySelector('.tablet'), r = tab.getBoundingClientRect(), h = hall.getBoundingClientRect(), hb = hero.getBoundingClientRect();
    // Where the tablet sits while the hero is pinned (its top under the 64 px bar).
    var top = 64 + (r.top - hb.top), left = r.left, avail = innerHeight - 64;
    big.s = Math.min((innerWidth * .9) / r.width, (avail * .85) / r.height);
    big.x = innerWidth / 2 - (left + r.width / 2);
    big.y = 64 + avail / 2 - (top + r.height / 2);
    hall.style.transformOrigin = (r.left - h.left + r.width / 2) + 'px ' + (r.top - h.top + r.height / 2) + 'px';
    draw();
  }
  function draw() {
    drawing = false;
    if (!html.classList.contains('scrollhero')) return;
    var p = travel ? Math.min(1, Math.max(0, scrollY / travel)) : 1, k = 1 - ease(between(p, 0, .85));
    hall.style.transform = k ? 'translate(' + big.x * k + 'px,' + big.y * k + 'px) scale(' + (1 + (big.s - 1) * k) + ')' : 'none';
    greet.style.opacity = 1 - between(p, .55, .8);
    var t = between(p, .4, .85);
    words.style.opacity = t; words.style.transform = t < 1 ? 'translateY(' + 12 * (1 - t) + 'px)' : '';
    var c = between(p, .85, 1); cord.style.opacity = c; side.style.opacity = c;
  }
  if (html.classList.contains('scrollhero')) {
    addEventListener('scroll', function () { if (!drawing) { drawing = true; requestAnimationFrame(draw); } }, { passive: true });
    addEventListener('resize', measure);
    measure();
    if (document.fonts) document.fonts.ready.then(function () { fit(); measure(); });
  }

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
    replay('.more'); replay('.fleet'); fit(); placeTier();
    show(current());
  }
  document.querySelectorAll('.mode button').forEach(function (b) {
    b.setAttribute('aria-pressed', String(b.dataset.mode === html.dataset.mode));
    b.addEventListener('click', function () { setMode(b.dataset.mode); });
  });

  follow();
  cycle(6200);

  // The bar's menus, Product and Documentation: each opened by its button, closed by Escape, a
  // click elsewhere or the focus leaving it, as a disclosure menu does. One open at a time.
  var drops = document.querySelectorAll('nav .drop');
  drops.forEach(function (drop) {
    var opener = drop.querySelector('button'), list = drop.querySelector('ul');
    function openDrop(on) { opener.setAttribute('aria-expanded', String(on)); list.hidden = !on; }
    drop.openDrop = openDrop;
    opener.addEventListener('click', function () {
      var on = list.hidden;
      drops.forEach(function (other) { if (other !== drop) other.openDrop(false); });
      openDrop(on);
    });
    drop.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !list.hidden) { openDrop(false); opener.focus(); } });
    drop.addEventListener('focusout', function (e) { if (!drop.contains(e.relatedTarget)) openDrop(false); });
    document.addEventListener('click', function (e) { if (!drop.contains(e.target)) openDrop(false); });
  });

  // The phone menu: Menu opens it under the bar; a link inside, Escape, a click outside or a
  // wider window closes it, as the other pages' menu does.
  var menuBtn = document.querySelector('nav .menubtn'), menu = document.getElementById('homemenu');
  if (menuBtn && menu) {
    function openMenu(on, refocus) {
      menu.hidden = !on;
      menuBtn.setAttribute('aria-expanded', String(on));
      if (!on && refocus) menuBtn.focus();
    }
    menuBtn.addEventListener('click', function () { openMenu(menu.hidden, false); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) openMenu(false, false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) openMenu(false, true); });
    document.addEventListener('click', function (e) { if (!menu.hidden && !menu.contains(e.target) && !menuBtn.contains(e.target)) openMenu(false, false); });
    matchMedia('(min-width: 1101px)').addEventListener('change', function (e) { if (e.matches) openMenu(false, false); });
  }
})();
