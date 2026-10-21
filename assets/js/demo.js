/* The demo's page side: the guide with its short tours, the room's light that automations react
   to, the Panel / Web admin switch on a phone, and Reset. The two frames (demo/surface.html) tell
   it what the visitor did over a BroadcastChannel; it answers with the control to ring. */
(function () {
  var section = document.getElementById('look');
  if (!section) return;
  var KEY = 'muralis-demo-v2', GUIDE = 'muralis-demo-guide';
  var demo = section.querySelector('.demo'), guide = section.querySelector('.demo-guide');
  var count = guide.querySelector('.demo-count'), text = guide.querySelector('.demo-text');
  var next = guide.querySelector('.demo-next'), skip = guide.querySelector('.demo-skip'), show = section.querySelector('.demo-show');
  var toursBtn = guide.querySelector('.demo-tours button'), toursList = document.getElementById('demo-tour-list');
  var lux = section.querySelector('.demo-lux input'), luxNow = document.getElementById('demo-lux-now');
  var channel = null;
  try { channel = new BroadcastChannel('muralis-demo'); } catch (e) { channel = null; }
  function post(m) { if (channel) channel.postMessage(m); }
  function readState() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }

  // Each step: what to do, which control to ring (panel, web or the page), and what ends it.
  // Plain words, one thing at a time (NN/g: a short pull at the moment of need).
  var TOURS = [
    { id: 'wayout', name: 'The way out', steps: [
      { t: 'The panel shows only its page. Tap its bottom-left corner three times.', on: 'panel', at: '.demo-corner.bl', until: 'settings-open' },
      { t: 'You are in the settings. On your own panel you choose these taps yourself, under Way out.', on: 'panel', at: '[data-box="box-sequences"]' }
    ] },
    { id: 'page', name: 'The page on the wall', steps: [
      { t: 'On the phone, open Dashboard.', on: 'web', at: '#box-dashboard > summary', until: 'section:dashboard', home: true },
      { t: 'Change the address to shop.sample and press Save.', on: 'web', at: '#f-dashboard_url', until: 'saved:dashboard' },
      { t: 'Look at the tablet: it shows the new page. If it shows its settings, press Open dashboard.', on: 'panel' }
    ] },
    { id: 'sensors', name: 'Sensors', steps: [
      { t: 'Sensors are what the tablet feels: light, movement, battery. On the phone, open Sensors.', on: 'web', at: '#box-sensors > summary', until: 'section:sensors', home: true },
      { t: 'Press More sensor settings.', on: 'web', at: '[data-go="sensors"]', until: 'page:sensors' },
      { t: 'Turn on Light.', on: 'web', at: '[data-demo="sensor"]', until: 'sensor:light:on' }
    ] },
    { id: 'rule', name: 'Your first automation', steps: [
      { t: 'An automation needs its sensor on. On the phone, open Sensors, then More sensor settings, and turn on Light.', on: 'web', at: '#box-sensors > summary, [data-go="sensors"], [data-demo="sensor"]', until: 'sensor:light:on', home: true, skip: 'lightOn' },
      { t: 'An automation does something by itself. On the phone, open Automations.', on: 'web', at: '#box-automations > summary', until: 'section:automations', home: true },
      { t: 'Press More automation settings, then Add.', on: 'web', at: '[data-go="automations"], [data-demo-target="add"]', until: 'page:automation' },
      { t: 'Type a name. Under When, choose Light and Darker than, and type 100 in Level.', on: 'web', at: '#a-name', until: 'never', next: true },
      { t: 'Under Then, choose Display off. Press Add.', on: 'web', at: '#a-action', until: 'saved:rule' },
      { t: 'Now make the room dark: move Light in the room to the left.', on: 'page', at: '.demo-lux', until: 'rule-fired' },
      { t: 'The screen turned off by itself. Tap the tablet to wake it.', on: 'panel', until: 'woken' }
    ] },
    { id: 'ambient', name: 'Pictures when nobody is there', steps: [
      { t: 'Ambient shows pictures when nobody uses the panel. On the phone, open Ambient and choose Pictures.', on: 'web', at: '#ambient-mode', until: 'ambient:pictures', home: true },
      { t: 'Press More Ambient settings.', on: 'web', at: '[data-go="ambient"]', until: 'page:ambient' },
      { t: 'Type a name for a playlist. Press Create.', on: 'web', at: '#new-playlist-name', until: 'created:playlist' },
      { t: 'Pick a few pictures. Press Save.', on: 'web', at: '.demo-picks', until: 'saved:playlist' },
      { t: 'Press Preview. The tablet shows your pictures.', on: 'web', at: '[data-demo="preview"]', until: 'preview' }
    ] },
    { id: 'about', name: 'About this panel', steps: [
      { t: 'On the phone, open About this panel and give the panel a new name.', on: 'web', at: '#f-device_id', until: 'saved:name', home: true },
      { t: 'The tablet has the new name too: its settings show it. Now, on the phone, open System stats and log.', on: 'web', at: '[data-go="stats"]', until: 'page:stats' },
      { t: 'Turn on Show system stats on the dashboard. The panel shows them over its page.', on: 'web', at: '#stats-overlay', until: 'stats:on' }
    ] }
  ];
  var START_TEXT = 'Pick a tour, or just tap around. Each tour is a few short steps.';
  var g = loadGuide(), webPage = 'home';
  function loadGuide() { try { var s = JSON.parse(localStorage.getItem(GUIDE)); if (s) return s; } catch (e) {} return { tour: -1, step: 0, hidden: false, done: [] }; }
  function saveGuide() { try { localStorage.setItem(GUIDE, JSON.stringify(g)); } catch (e) {} }

  function paint() {
    // A step already done by what the visitor did before (the Light sensor on) is passed over.
    var cur = TOURS[g.tour] && TOURS[g.tour].steps[g.step], st0 = readState();
    if (cur && cur.skip === 'lightOn' && st0 && st0.sensors && st0.sensors.light) { g.step++; saveGuide(); }
    guide.hidden = g.hidden; show.hidden = !g.hidden;
    var tour = TOURS[g.tour], step = tour && tour.steps[g.step];
    if (!tour) { count.textContent = ''; text.textContent = START_TEXT; next.textContent = 'Start a tour'; next.hidden = false; }
    else if (!step) { count.textContent = ''; text.textContent = 'Done: ' + tour.name + '. Pick another tour, or just look around.'; next.textContent = nextTour() >= 0 ? 'Next tour' : 'Start again'; next.hidden = false; }
    else {
      count.textContent = 'Step ' + (g.step + 1) + ' of ' + tour.steps.length + '.';
      var t = step.t;
      if (tour.id === 'rule' && step.until === 'rule-fired') { var st = readState(); if (st && !st.sensors.light) t = 'The Light sensor is off, so nothing happens. Turn on Light in Sensors, then move Light in the room to the left.'; }
      // A step that starts from the phone's settings page, while the phone shows another page.
      if (step.home && webPage !== 'home') t = 'On the phone, go back with the arrow first. ' + t.replace(/On the phone, (\w)/g, function (m, c) { return c.toUpperCase(); });
      text.textContent = t;
      next.textContent = step.until ? 'Skip this step' : 'Next'; next.hidden = false;
      if (step.next) next.textContent = 'Next';
    }
    toursList.innerHTML = TOURS.map(function (t, i) { return '<li><button type="button" data-tour="' + i + '">' + (g.done.indexOf(t.id) >= 0 ? '✓ ' : '') + t.name + '</button></li>'; }).join('');
    // The ring, on the surface that has the control; on a phone the other surface's button gets a dot.
    var on = step && !g.hidden ? step.on : null;
    post({ highlight: on && on !== 'page' && step.at ? { surface: on, selector: step.at } : null });
    section.querySelectorAll('.demo-ringed').forEach(function (el) { el.classList.remove('demo-ringed'); });
    if (on === 'page' && step.at) { var el = section.querySelector(step.at); if (el) el.classList.add('demo-ringed'); }
    section.querySelectorAll('.demo-switch button').forEach(function (b) { b.classList.toggle('demo-dot', !!on && on !== 'page' && b.dataset.show === on && demo.dataset.show !== on); });
  }
  function nextTour() { for (var i = 0; i < TOURS.length; i++) if (g.done.indexOf(TOURS[i].id) < 0) return i; return -1; }
  function startTour(i) {
    g.tour = i; g.step = 0; g.hidden = false; saveGuide(); paint();
    // The whole tablet in view, its corners included, under the guide.
    var r = demo.getBoundingClientRect();
    if (r.bottom > innerHeight || r.top < 0) window.scrollBy({ top: r.bottom - innerHeight + 24, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  function advance() {
    var tour = TOURS[g.tour];
    if (!tour) { startTour(nextTour() < 0 ? 0 : nextTour()); return; }
    if (g.step >= tour.steps.length) { var n = nextTour(); startTour(n < 0 ? 0 : n); return; }
    g.step++;
    if (g.step >= tour.steps.length && g.done.indexOf(tour.id) < 0) g.done.push(tour.id);
    saveGuide(); paint();
  }
  next.addEventListener('click', advance);
  skip.addEventListener('click', function () { g.hidden = true; saveGuide(); paint(); });
  show.addEventListener('click', function () { g.hidden = false; saveGuide(); paint(); });
  toursBtn.addEventListener('click', function () { var open = toursList.hidden; toursList.hidden = !open; toursBtn.setAttribute('aria-expanded', String(open)); });
  toursList.addEventListener('click', function (e) { var b = e.target.closest('[data-tour]'); if (!b) return; toursList.hidden = true; toursBtn.setAttribute('aria-expanded', 'false'); startTour(+b.dataset.tour); });
  document.addEventListener('click', function (e) { if (!e.target.closest('.demo-tours')) { toursList.hidden = true; toursBtn.setAttribute('aria-expanded', 'false'); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !toursList.hidden) { toursList.hidden = true; toursBtn.setAttribute('aria-expanded', 'false'); toursBtn.focus(); } });

  // What the frames say the visitor did: a step whose "until" matches is done.
  if (channel) channel.addEventListener('message', function (e) {
    var m = e.data;
    if (m.state) showLux(m.state);
    if (m.event) {
      if (m.surface === 'web' && m.event.indexOf('page:') === 0) webPage = m.event.slice(5);
      if (m.surface === 'web' && m.event === 'ready') webPage = 'home';
      if (m.event === 'ready') { paint(); return; }
      // The first tap on a corner, or what its taps opened, retires that corner's arrow.
      if (/^corner:BL|^settings-open/.test(m.event)) section.querySelector('.demo-arrow.l').classList.add('gone');
      if (/^corner:BR|^launcher/.test(m.event)) section.querySelector('.demo-arrow.r').classList.add('gone');
      var tour = TOURS[g.tour], step = tour && tour.steps[g.step];
      if (step && step.until && m.event.indexOf(step.until) === 0 && (step.on === 'page' || step.on === m.surface || m.event === 'rule-fired' || m.event.indexOf('rule-fired') === 0)) advance();
      if (m.event.indexOf('page:') === 0 || m.event.indexOf('section:') === 0) setTimeout(paint, 50);
    }
  });

  // The room's light: what the panel's light sensor reads, for the automations to react to.
  function setLux(v) {
    luxNow.textContent = v + ' lx';
    var s = readState();
    if (!s) return;
    s.lux = v; s.seq = (s.seq || 0) + 1;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    post({ state: s, from: 'page' });
  }
  lux.addEventListener('input', function () { setLux(+lux.value); });
  // The room's light is there only while an automation reacts to it.
  var luxBox = section.querySelector('.demo-lux');
  function showLux(s) { luxBox.hidden = !(s && s.rules && s.rules.some(function (r) { return r.sensor === 'light'; })); }
  showLux(readState());
  var st = readState(); if (st && st.lux != null) { lux.value = st.lux; luxNow.textContent = st.lux + ' lx'; }

  // On a phone one surface at a time, chosen here.
  section.querySelectorAll('.demo-switch button').forEach(function (b) {
    b.addEventListener('click', function () {
      demo.dataset.show = b.dataset.show;
      section.querySelectorAll('.demo-switch button').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      paint();
    });
  });

  section.querySelector('.demo-reset').addEventListener('click', function () {
    try { localStorage.removeItem(KEY); localStorage.removeItem(GUIDE); } catch (e) {}
    g = loadGuide(); lux.value = 320; luxNow.textContent = '320 lx'; luxBox.hidden = true;
    post({ reset: true });
    section.querySelectorAll('.demo-arrow').forEach(function (el) { el.classList.remove('gone'); });
    section.querySelectorAll('.demo iframe').forEach(function (f) { f.src = f.src; });
    paint();
  });
  paint();
})();
