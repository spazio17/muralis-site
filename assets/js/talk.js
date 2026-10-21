/* Your other systems can talk to it. The visitor plays the other system: a doorbell, a smart plug,
   a status monitor, a desk button, an alarm, a temperature or air sensor, or a room calendar. Its button sends
   the panel's real command along the wire, and the drawn panel shows what that command does there.
   Three situations per edition, following the page's Home, Pro and Business switch. Nothing runs
   until the visitor clicks, so there is nothing to pause off screen. */
(function () {
  var demo = document.querySelector('.talkdemo');
  if (!demo) return;
  var html = document.documentElement, still = matchMedia('(prefers-reduced-motion: reduce)');
  var chips = [].slice.call(demo.querySelectorAll('.scenes button'));
  var kind = demo.querySelector('.svc-kind'), body = demo.querySelector('.svc-body');
  var act = demo.querySelector('.svc-act'), undo = demo.querySelector('.svc-undo');
  var cmds = demo.querySelector('.cmds'), route = demo.querySelector('.route'), line = demo.querySelector('.wire .line');
  var base = demo.querySelector('.base'), page = demo.querySelector('.page'), pop = demo.querySelector('.pop');
  var say = demo.querySelector('.say'), status = demo.querySelector('.status');
  var IMG = 'assets/img/home/';
  var TODAY = '<span class="ok">Works today</span>', SOON = '<span class="soon-tag">Coming</span>';
  var door = '<svg viewBox="0 0 160 90" aria-hidden="true"><rect width="160" height="90" fill="#3a3f4f"/><rect x="58" y="14" width="44" height="76" fill="#6b5a45"/><circle cx="94" cy="54" r="2.5" fill="#e0a93b"/><circle cx="40" cy="44" r="10" fill="#c9cede"/><path d="M24 90c0-20 7-30 16-30s16 10 16 30z" fill="#c9cede"/><rect x="0" y="0" width="160" height="10" fill="#2a2e3a"/></svg>';
  // run counts the scene picks: a command still on the wire when another scene is picked lands
  // into nothing, instead of painting the old scene's state over the new one.
  var cur = null, st = {}, timers = [], run = 0;
  // What the panel shows; every other key is the other system's own state, drawn at once.
  var PANEL = ['lit', 'off', 'page', 'pop', 'say'];

  // One entry per situation: what the other system looks like, what it sends, which way, and what
  // the panel then shows. send() and back() return the commands and change the drawn state.
  var MQTT = 'via MQTT, for example from Home Assistant or Node-RED';
  var scenes = {
    door: { kind: 'A doorbell', base: 'mirror.svg', act: 'Ring', route: 'via Home Assistant, Node-RED or MQTT',
      note: TODAY + 'Through Home Assistant, Node-RED or anything that speaks MQTT. On the panel, an automation “When Door is triggered, show Door as a pop-up” wakes the screen and chimes.',
      draw: function () { return '<h3>Front door</h3><p>' + (st.rung ? 'Ding dong.' : 'Nobody there yet.') + '</p>'; },
      send: function () { st.rung = true; st.pop = '<b>Door</b>' + door + 'Someone is at the door.'; return ['camera.trigger Door']; } },
    wash: { kind: 'A smart plug', base: 'page.webp', act: 'Finish the cycle', route: 'via an automation, for example Home Assistant',
      note: TODAY + 'An automation watches the plug’s power and sends the pop-up and the sentence.',
      draw: function () { return '<h3>Washing machine</h3><p class="svc-big">' + (st.done ? '3 W' : '1,840 W') + '</p><p>' + (st.done ? 'Done.' : 'Washing.') + '</p>'; },
      send: function () { st.done = true; st.pop = '<b>Washing machine</b>The washing is done.'; st.say = 'The washing is done.'; return ['panel.notify', 'audio.say']; },
      back: function () { st.done = false; st.pop = st.say = null; return []; }, undo: 'Start again' },
    nas: { kind: 'A status monitor, for example Uptime Kuma', base: 'page.webp', act: 'Stop the NAS', route: 'via Uptime Kuma’s webhook',
      note: TODAY + 'With Uptime Kuma: its webhook sends the command, with the panel’s password, once it trusts the panel’s certificate. Or through Home Assistant.',
      draw: function () { return monitors(['Website', 'NAS', 'Photos'], 1); },
      send: function () { st.down = true; st.lit = true; return ['light.on 235,55,55']; },
      back: function () { st.down = false; st.lit = false; return ['light.off']; }, undo: 'Bring it back up' },
    late: { kind: 'A button at the desk', base: 'waiting.svg', act: 'Running late', route: MQTT,
      note: TODAY + 'A wireless button and an automation send the pop-up. The words are yours.',
      draw: function () { return '<h3>Reception</h3><p>Dr Berger: ' + (st.late ? 'about 20 minutes late' : 'on time') + '</p>'; },
      send: function () { st.late = true; st.pop = '<b>Dr Berger</b>Running about 20 minutes late. Thank you for waiting.'; return ['panel.notify']; } },
    closed: { kind: 'An alarm system', base: 'shop.svg', act: 'Arm for the night', route: MQTT,
      note: TODAY + 'No web page needed: the Closed picture sits in a playlist you fill once in the web admin, with Ambient set to Pictures. A fixed closing time needs no other system: the panel’s own automation can do it.',
      draw: function () { return '<h3>Shop alarm</h3><p class="svc-big">' + (st.armed ? 'Armed' : 'Off') + '</p><p>' + (st.armed ? 'For the night' : 'Open for business') + '</p>'; },
      send: function () { st.armed = true; st.page = ['closed', '<p class="pg-title">We are closed</p><p class="pg-sub">Open again tomorrow at 8:00</p>']; return ['ambient.playlist Closed', 'ambient.start']; },
      back: function () { st.armed = false; st.page = null; return ['ambient.stop']; }, undo: 'Disarm in the morning' },
    // On the staff's screen in the back office, the waiting area's cameras as its main view:
    // where an alarm belongs, not on the patients' screen.
    fridge: { kind: 'A temperature sensor', base: 'staff.svg', act: 'Let it warm up', route: MQTT,
      note: TODAY + 'A Zigbee or Wi-Fi sensor and an automation send both commands. The pop-up stays until someone touches it.',
      draw: function () { return '<h3>Vaccine fridge</h3><p class="svc-big">' + (st.warm ? '9 °C' : '5 °C') + '</p><p>' + (st.warm ? 'Too warm' : 'Fine') + '</p>'; },
      send: function () { st.warm = true; st.lit = true; st.pop = '<b>Fridge</b>The vaccine fridge is at 9 °C.'; return ['light.on 235,55,55', 'panel.notify']; },
      back: function () { st.warm = false; st.lit = false; st.pop = null; return ['light.off']; }, undo: 'Cool it down' },
    room: { kind: 'A room calendar, for example Microsoft 365', base: 'room.svg', act: 'Book now, 30 min', route: SOON + '<br>Business integration',
      note: SOON + 'With Business the panel reads the room’s calendar and lights the frame. The room page shows In use by itself. Today, a bridge such as Home Assistant can do it.',
      draw: function () { return '<h3>Danube</h3><div class="svc-slot' + (st.booked ? ' booked' : '') + '"><span>14:00 to 14:30</span><span>' + (st.booked ? 'Booked' : 'Free') + '</span></div><div class="svc-slot"><span>15:00 to 16:00</span><span>Team call</span></div>'; },
      send: function () { st.booked = true; st.lit = true; st.page = ['busy', '<span class="pg-tag">In use</span><p class="pg-title">Danube</p><p class="pg-sub">Until 14:30</p>']; return ['light.on 235,55,55']; },
      back: function () { st.booked = false; st.lit = false; st.page = null; return ['light.off']; }, undo: 'Cancel the booking' },
    incident: { kind: 'A status monitor, for example Uptime Kuma', base: 'floor.svg', act: 'Take the mail server down', route: 'via Uptime Kuma’s webhook',
      note: TODAY + 'With Uptime Kuma: when a service goes down the screens open its status page, and go back when all is up. UptimeRobot comes with the Monitors integration.',
      draw: function () { return monitors(['Mail server', 'VPN', 'Intranet'], 0); },
      send: function () { st.down = true; st.page = ['status', '<p class="k-banner">Mail server is down</p><ul><li class="down">Mail server<i>Down</i></li><li>VPN<i>Up</i></li><li>Intranet<i>Up</i></li></ul>']; return ['kiosk.open_url status page']; },
      back: function () { st.down = false; st.page = null; return ['kiosk.home']; }, undo: 'Fix it' },
    air: { kind: 'An air quality sensor', base: 'room.svg', act: 'Hold a long meeting', route: MQTT,
      note: TODAY + 'An air quality sensor and an automation send the pop-up.',
      draw: function () { return '<h3>Meeting room Danube</h3><p class="svc-big">' + (st.stale ? '1,600' : '800') + ' ppm</p><p>CO₂' + (st.stale ? ', stale air' : '') + '</p>'; },
      send: function () { st.stale = true; st.pop = '<b>Air</b>The air is stale. Please open a window for five minutes.'; return ['panel.notify']; },
      back: function () { st.stale = false; st.pop = null; return []; }, undo: 'Open the window' }
  };

  function monitors(names, which) {
    return '<ul class="svc-list">' + names.map(function (n, i) {
      var down = st.down && i === which;
      return '<li' + (down ? ' class="down"' : '') + '><i></i>' + n + '<span>' + (down ? 'Down' : 'Up') + '</span></li>';
    }).join('') + '</ul>';
  }
  function clear() { timers.forEach(clearTimeout); timers = []; }

  // The Home Assistant card under the scenes: the rows a command changes there, lit once. A
  // command with no row of its own (a camera's event, a page to open) leaves the card as it is.
  var ha = document.querySelector('.ha-card');
  function row(name) { return ha.querySelector('[data-ha="' + name + '"]'); }
  function hit(name) { var r = row(name); r.classList.remove('hit'); void r.offsetWidth; r.classList.add('hit'); }
  function toggle(name, on) { var r = row(name), sw = r.querySelector('.ha-sw'); r.classList.toggle('on', on); sw.classList.toggle('on', on); sw.setAttribute('aria-label', on ? 'on' : 'off'); }
  function haReset() {
    if (!ha) return;
    toggle('light', false); toggle('ambient', false); row('light').style.removeProperty('--led');
    row('popup').querySelector('.ha-val').textContent = 'Send a message';
    row('playlist').querySelector('.ha-val').textContent = 'Family';
    ha.querySelectorAll('.hit').forEach(function (r) { r.classList.remove('hit'); });
  }
  function haShow(list) {
    if (!ha) return;
    list.forEach(function (c) {
      var word = c.split(' ')[0], rest = c.slice(word.length + 1);
      if (word === 'light.on') { toggle('light', true); row('light').style.setProperty('--led', 'rgb(' + rest + ')'); hit('light'); }
      else if (word === 'light.off') { toggle('light', false); hit('light'); }
      else if (word === 'panel.notify') { var t = document.createElement('div'); t.innerHTML = (st.pop || '').replace(/<b>.*?<\/b>|<svg.*<\/svg>/g, ''); row('popup').querySelector('.ha-val').textContent = t.textContent || 'Send a message'; hit('popup'); }
      else if (word === 'ambient.start' || word === 'ambient.stop') { toggle('ambient', word === 'ambient.start'); hit('ambient'); }
      else if (word === 'ambient.playlist') { row('playlist').querySelector('.ha-val').textContent = rest; hit('playlist'); }
    });
  }

  // The panel's side: the page, the frame, a pop-up, the spoken sentence and the dark film.
  function paint() {
    var s = scenes[cur];
    body.innerHTML = s.draw();
    demo.classList.toggle('lit', !!st.lit);
    demo.classList.toggle('off', !!st.off);
    page.hidden = !st.page;
    if (st.page) { page.className = 'page ' + st.page[0]; page.innerHTML = st.page[1]; }
    pop.hidden = !st.pop; if (st.pop) pop.innerHTML = st.pop;
    say.hidden = !st.say; if (st.say) say.textContent = st.say;
    undo.hidden = !s.back || !st.sent;
    act.hidden = !!(s.back && st.sent);
  }

  // The command chips ride the wire from the other system to the panel; the result shows when they
  // arrive. Without motion they appear and the result follows at once.
  function travel(list, then) {
    cmds.innerHTML = list.map(function (c) { return '<code>' + c + '</code>'; }).join('');
    if (!list.length || still.matches || !line.animate) { then(); return; }
    var from = line.getBoundingClientRect(), box = demo.getBoundingClientRect(), vertical = from.height > from.width;
    var chip = document.createElement('span');
    chip.className = 'packet'; chip.textContent = list[0].split(' ')[0]; chip.setAttribute('aria-hidden', 'true');
    demo.appendChild(chip);
    var x0 = from.left - box.left, y0 = from.top - box.top - chip.offsetHeight / 2;
    if (vertical) { x0 = from.left - box.left - chip.offsetWidth / 2; y0 = from.top - box.top; }
    chip.style.left = x0 + 'px'; chip.style.top = y0 + 'px';
    var dx = vertical ? 0 : from.width - chip.offsetWidth, dy = vertical ? from.height - chip.offsetHeight / 2 : 0;
    chip.animate([{ transform: 'translate(0,0)', opacity: 0 }, { opacity: 1, offset: .15 }, { transform: 'translate(' + dx + 'px,' + dy + 'px)', opacity: 1 }],
      { duration: 650, easing: 'ease-in-out' }).onfinish = function () { chip.remove(); then(); };
  }

  function fire(back) {
    var s = scenes[cur];
    clear();
    var keep = JSON.parse(JSON.stringify(st));
    var list = back ? s.back() : s.send();
    var next = st; st = keep;
    // The other system changes at once; the panel only when the command arrives.
    Object.keys(next).forEach(function (k) { if (PANEL.indexOf(k) < 0) st[k] = next[k]; });
    body.innerHTML = s.draw();
    act.disabled = undo.disabled = true;
    var mine = run;
    travel(list, function () {
      if (mine !== run) return;
      st = next; st.sent = !back;
      act.disabled = undo.disabled = false;
      paint(); haShow(list);
      if (st.say) timers.push(setTimeout(function () { st.say = null; say.hidden = true; }, 4000));
    });
  }

  function pick(id) {
    clear();
    run++;
    demo.querySelectorAll('.packet').forEach(function (p) { p.remove(); });
    act.disabled = undo.disabled = false;
    cur = id; var s = scenes[id];
    st = { off: !!s.off };
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.scene === id)); });
    kind.textContent = s.kind;
    act.textContent = s.act; undo.textContent = s.undo || '';
    route.innerHTML = s.route; cmds.innerHTML = '';
    base.src = IMG + s.base;
    status.innerHTML = s.note;
    paint(); haReset();
  }

  function firstOfMode() {
    var m = html.dataset.mode || 'home';
    var c = chips.filter(function (b) { return (b.dataset.for || '').split(' ').indexOf(m) >= 0; })[0];
    if (c && (!cur || scenes[cur] && !chips.some(function (b) { return b.dataset.scene === cur && b.dataset.for.split(' ').indexOf(m) >= 0; }))) pick(c.dataset.scene);
  }

  chips.forEach(function (c) { c.addEventListener('click', function () { pick(c.dataset.scene); }); });
  act.addEventListener('click', function () { fire(false); });
  undo.addEventListener('click', function () { fire(true); });
  // A touch on the pop-up closes it, as on the panel.
  pop.addEventListener('click', function () { st.pop = null; pop.hidden = true; });
  new MutationObserver(firstOfMode).observe(html, { attributes: true, attributeFilter: ['data-mode'] });
  firstOfMode();
})();
