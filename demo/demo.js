/* The Muralis demo: one renderer for both surfaces, the panel (?surface=panel) and the web admin.
   The markup is the app's own (HttpAdminServer and KioskActivity: the app bar, the sections in
   groups, the list rows, the cards, the fields), drawn with the app's own stylesheet, so the demo
   looks as the app does. One state, kept in the browser and shared between the two frames and the
   page around them: a change on one surface shows on the other at once. Only the parts the demo
   offers are live; the rest is drawn and greyed, and says so when touched. */
(function () {
  var KEY = 'muralis-demo-v2';
  var PANEL = SURFACE === 'panel';
  var SAMPLES = {
    'home.sample': { title: 'Home', src: '../assets/img/home/mirror.svg', upright: '../assets/img/home/mirror-portrait.svg' },
    'shop.sample': { title: 'Shop window', src: '../assets/img/home/shop.svg', upright: '../assets/img/home/shop-portrait.svg' },
    'meeting.sample': { title: 'Meeting room', src: '../assets/img/home/room.svg', upright: '../assets/img/home/room-portrait.svg' }
  };
  var PICTURES = [
    { id: 'dog-meadow', name: 'Dog in the meadow' },
    { id: 'cat-forest', name: 'Cat in the forest' },
    { id: 'dog-lake', name: 'Dog by the lake' },
    { id: 'cat-garden', name: 'Cat in the garden' }
  ];
  // The sensors a demo panel has (Sensors.ALL, alphabetical, as the app lists them); Light is live.
  var SENSORS = [
    ['audio', 'Audio', 'Idle'], ['battery', 'Battery', '83 %'], ['bluetooth', 'Bluetooth beacons', 'None in reach'],
    ['camera', 'Camera', 'Clear'], ['display', 'Display', 'On'], ['light', 'Light', ''], ['memory', 'Memory', '41 %'],
    ['microphone', 'Microphone', '12 %'], ['movement', 'Movement', 'Still'], ['network', 'Network', 'Wi-Fi'],
    ['nfc', 'NFC', 'No tag yet'], ['power', 'Power', 'Charging'], ['processor', 'Processor', '12 %'],
    ['proximity', 'Proximity', 'Far'], ['ambient', 'Ambient', 'Not running']
  ];
  var START = {
    name: 'hallway-panel', url: 'http://home.sample/', settings: 'BL,BL,BL', launcher: 'BR,BR,BR',
    sensors: { battery: true, display: true, memory: true, network: true, power: true, processor: true, proximity: true },
    rules: [], ambient: 'off', playlists: [], stats: false, lux: 320, seq: 0
  };
  var state = load();
  // Per surface and never shared, as in the app: the panel's own setting and this browser's choice.
  var THEME_KEY = 'muralis-demo-theme-' + SURFACE;
  var channel = null;
  try { channel = new BroadcastChannel('muralis-demo'); } catch (e) { channel = null; }

  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.name) return s; } catch (e) {}
    // Kept from the first moment, so the page around the frames (the room's light) has it too.
    var fresh = copy(START);
    try { localStorage.setItem(KEY, JSON.stringify(fresh)); } catch (e) {}
    return fresh;
  }
  function save(changed, event) {
    state.seq = (state.seq || 0) + 1;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    post({ state: state, changed: changed, from: SURFACE });
    if (event) tell(event);
  }
  function post(message) { if (channel) channel.postMessage(message); }
  // What the visitor did, for the guide on the page around the frames.
  function tell(event) { post({ event: event, surface: SURFACE }); }

  // ---- markup, as the app writes it ----
  function glyph(name) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (GLYPHS[name] || '') + '</svg>'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function host(url) { return String(url).replace(/^[a-z]+:\/\//, '').replace(/\/.*$/, ''); }
  function sampleOf(url) { return SAMPLES[host(url)] || null; }
  function off(html) { return '<div class="demo-off" aria-disabled="true">' + html + '</div>'; }
  function field(id, label, value, attrs, support) {
    return '<div class="field"><input type="' + ((attrs || '').indexOf('type=') >= 0 ? '' : 'text') + '" id="' + id + '" value="' + esc(value) + '" placeholder=" "' +
      ' autocapitalize="off" autocorrect="off" spellcheck="false"' + (attrs || '') + '><label for="' + id + '">' + esc(label) + '</label>' +
      (support ? '<p class="support">' + esc(support) + '</p>' : '') + '</div>';
  }
  function select(id, label, options, attrs) {
    return '<div class="field"><select id="' + id + '"' + (attrs || '') + '>' + options + '</select><label for="' + id + '">' + esc(label) + '</label></div>';
  }
  function option(value, label, current, disabled) {
    return '<option value="' + esc(value) + '"' + (value === current ? ' selected' : '') + (disabled ? ' disabled' : '') + '>' + esc(label) + (disabled ? ' (not in this demo)' : '') + '</option>';
  }
  function switchRow(id, label, on, attrs) {
    return '<label class="switch"><span>' + esc(label) + '</span><input type="checkbox" id="' + id + '"' + (attrs || '') + (on ? ' checked' : '') + '></label>';
  }
  function summaryRow(g, title, summary, key) {
    return '<span class="lead">' + glyph(g) + '</span><span class="text"><span class="h">' + esc(title) +
      '</span><span class="s"' + (key ? ' id="sum-' + key + '"' : '') + '>' + esc(summary) + '</span></span>';
  }
  function linkRow(go, g, head, sub, trail, dim) {
    return '<li class="two' + (dim ? ' demo-dim' : '') + '"' + (dim ? ' aria-disabled="true"' : '') + '><a class="rowlink plain" href="#" ' + (go ? 'data-go="' + go + '"' : '') + '>' +
      '<span class="lead">' + glyph(g) + '</span><span class="text"><span class="h">' + esc(head) + '</span>' +
      (sub != null ? '<span class="s">' + esc(sub) + '</span>' : '') + '</span></a>' + (trail ? '<span class="trail">' + trail + '</span>' : '') + '</li>';
  }
  function appbar(title, sub, back) {
    return '<header class="appbar">' + (back ? '<a class="ib" href="#" data-go="' + back + '" title="Back" aria-label="Back">' + glyph('back') + '</a>' : '') +
      '<div class="titles"><h1>' + esc(title) + '</h1>' + (sub != null ? '<p class="sub" id="demo-name">' + esc(sub) + '</p>' : '') + '</div>' +
      (sub != null && !back ? chip() + themeToggle() : '') + '</header>';
  }
  function chip() {
    return '<div class="chip"><div class="row"><span>83% charging</span>' + CHIP.BATTERY_SVG + '</div>' +
      '<div class="row"><span>192.0.2.42</span>' + CHIP.ADDRESS_SVG + '</div>' +
      '<div class="row pair"><span class="row"><span>41%</span>' + CHIP.MEMORY_SVG + '</span><span class="row"><span>12%</span>' + CHIP.CPU_SVG + '</span></div></div>';
  }
  function themeToggle() {
    return '<button type="button" class="ib themetoggle" id="theme-toggle" title="Day and night" aria-label="Day and night">' +
      '<span class="m-light">' + glyph('sun') + '</span><span class="m-dark">' + glyph('moon') + '</span><span class="m-system">' + glyph('auto') + '</span></button>';
  }

  // ---- the summaries ----
  function sensorsOn() { var on = 0; SENSORS.forEach(function (s) { if (state.sensors[s[0]]) on++; }); return on + ' of ' + SENSORS.length + ' on'; }
  function rulesOn() { var on = state.rules.filter(function (r) { return r.enabled; }).length; return state.rules.length ? on + ' of ' + state.rules.length + ' on' : 'None yet'; }
  function ambientName(mode) { return { off: 'Off', dim: 'Dimmed page', film: 'Black film', url: 'Web page', pictures: 'Pictures' }[mode] || 'Off'; }
  function ambientSummary() { return state.ambient === 'off' ? 'Off' : ambientName(state.ambient) + ' · after 2 min'; }
  function zone(z) { return { TL: 'top-left', TR: 'top-right', BL: 'bottom-left', BR: 'bottom-right' }[z] || z; }
  function describe(seq) {
    var zones = seq.split(','), out = [], i = 0;
    while (i < zones.length) { var run = 1; while (zones[i + run] === zones[i]) run++; out.push(zone(zones[i]) + (run > 1 ? ' x' + run : '')); i += run; }
    return out.join(', ');
  }
  function lightReading() { return Math.round(state.lux) + ' lx'; }
  function sentence(r) {
    var ev = eventOf(r.sensor, r.event), ac = actionOf(r.action), t = ev ? ev.label : r.sensor;
    if (ev && ev.unit === 'time') t += ' ' + r.level;
    else if (ev && ev.unit && r.level !== '') t += ' ' + r.level + ' ' + ev.unit;
    if (ev && ev.holds && +r.minutes > 0) t += ' for ' + r.minutes + ' min';
    return t + ', then ' + (ac ? ac.label : r.action);
  }

  // ---- what the automation editor offers (Automations.EVENTS and ACTIONS) ----
  var EVENTS = {
    light: [{ id: 'darker', label: 'Darker than', unit: 'lx', holds: true }, { id: 'brighter', label: 'Brighter than', unit: 'lx' }],
    proximity: [{ id: 'near', label: 'Near' }, { id: 'far', label: 'Far' }],
    battery: [{ id: 'below', label: 'Battery below', unit: '%' }, { id: 'above', label: 'Battery above', unit: '%' }, { id: 'plugged', label: 'Charger plugged in' }, { id: 'unplugged', label: 'Charger unplugged' }],
    time: [{ id: 'at', label: 'At', unit: 'time' }]
  };
  var SENSOR_MENU = [['light', 'Light'], ['proximity', 'Proximity'], ['battery', 'Battery'], ['movement', 'Movement', 1], ['camera', 'Camera', 1], ['microphone', 'Microphone', 1], ['network', 'Network', 1], ['time', 'Time of day']];
  var ACTIONS = [['display_on', 'Display on'], ['display_off', 'Display off'], ['dashboard', 'Show the dashboard'], ['ambient', 'Start Ambient'],
    ['play_sound', 'Play a sound', 1], ['say', 'Say a sentence', 1], ['reload', 'Reload the page', 1], ['light_on', 'Status light on'], ['light_off', 'Status light off'],
    ['open_page', 'Open a page', 1], ['brightness', 'Set brightness', 1], ['ambient_mode', 'Ambient mode', 1], ['mqtt_publish', 'Publish an MQTT message', 1],
    ['call_url', 'Call an address', 1], ['popup', 'Show a pop-up', 1]];
  function eventOf(sensor, id) { return (EVENTS[sensor] || []).filter(function (e) { return e.id === id; })[0]; }
  function actionOf(id) { var a = ACTIONS.filter(function (x) { return x[0] === id; })[0]; return a ? { id: a[0], label: a[1] } : null; }

  // ---- the settings page: the sections, as each surface draws them ----
  function dashboardBody() {
    return '<p class="label" id="opt-shows-label">The panel shows</p>' +
      '<div class="segmented" role="group" aria-labelledby="opt-shows-label"><button type="button" aria-pressed="true">' + glyph('check') + 'A web page</button>' +
      '<a href="#" role="button" aria-pressed="false" class="demo-dimbtn" aria-disabled="true">An app</a>' +
      // Shown in the demo as it is once a camera exists, greyed as the rest it does not play.
      '<a href="#" role="button" aria-pressed="false" class="demo-dimbtn" aria-disabled="true">Cameras</a></div>' +
      '<form data-demo="dashboard">' + field('f-dashboard_url', 'Dashboard URL', state.url, ' inputmode="url" list="demo-samples"') +
      '<datalist id="demo-samples"><option value="http://home.sample/"><option value="http://shop.sample/"><option value="http://meeting.sample/"></datalist>' +
      '<p class="demo-aside"><span>Demo</span> Try home.sample, shop.sample or meeting.sample.</p>' +
      // The panel saves with Open dashboard at the foot of its settings; the web page with Save.
      '<div class="actions">' + (PANEL ? '' : '<button class="primary" type="submit">Save</button>') + '<button type="button" class="tonal" data-demo="open-once">Open once</button></div></form>' +
      (PANEL ? '<div class="actions"><button type="button" class="btn text demo-dimbtn" aria-disabled="true">Page options' + glyph('next') + '</button></div>'
        : '<div class="actions"><a class="onward demo-dimbtn" href="#" aria-disabled="true">Page options</a></div>');
  }
  function displayBody() {
    if (PANEL) {
      return off('<p class="label">Brightness</p>' + switchRow('d-auto', 'Adjust brightness automatically', true) +
        '<input type="range" min="1" max="100" value="20" aria-label="Brightness"><p class="hint">The light sensor is setting the brightness. Turn off the switch to set it by hand.</p>' +
        '<p class="label">Orientation</p><div class="radios"><label class="radio"><input type="radio" name="o">Auto-rotate</label><label class="radio"><input type="radio" name="o" checked>Landscape</label><label class="radio"><input type="radio" name="o">Portrait</label></div>' +
        '<p class="label">Display off</p><div class="radios"><label class="radio"><input type="radio" name="x" checked>Automatic</label><label class="radio"><input type="radio" name="x">Turn the screen off</label><label class="radio"><input type="radio" name="x">Black film</label></div>' +
        '<div class="switches">' + switchRow('d-light', 'Status light, a coloured frame around the screen', false) + '</div>');
    }
    return off('<div class="actions tight"><button type="button" class="tonal">Display on</button><button type="button" class="tonal">Display off</button></div>' +
      '<p class="label">Brightness</p><input type="range" min="1" max="100" value="20" aria-label="Brightness">' +
      switchRow('d-auto', 'Adjust brightness automatically', true) +
      select('d-orient', 'Orientation', option('auto', 'Auto-rotate') + option('landscape', 'Landscape', 'landscape') + option('portrait', 'Portrait')) +
      select('d-off', 'Display off', option('auto', 'Automatic', 'auto') + option('sleep', 'Turn the screen off') + option('film', 'Black film')) +
      '<div class="switches">' + switchRow('d-light', 'Status light, a coloured frame around the screen', false) + '</div>' +
      select('d-colour', 'Status light colour', option('blue', 'Blue', 'blue')));
  }
  function ambientBody() {
    var modes = option('off', 'Off', state.ambient) + option('dim', 'Dimmed page', state.ambient, 1) + option('film', 'Black film', state.ambient, 1) +
      option('url', 'Web page', state.ambient, 1) + option('pictures', 'Pictures', state.ambient);
    var note = state.ambient === 'off' ? 'Ambient off.' : 'Pictures after 2 min without a touch, the display stays on.';
    return select('ambient-mode', 'Mode', modes, ' data-demo="ambient-mode"') + '<p class="hint" id="ambient-note">' + note + '</p>' +
      '<div class="actions"><button type="button" class="tonal" data-demo="preview"' + (state.ambient === 'off' ? ' disabled title="Choose a mode first"' : '') + '>Preview</button>' +
      (state.ambient === 'off' ? '' : '<a class="btn text" href="#" data-go="ambient">More Ambient settings' + glyph('next') + '</a>') + '</div>';
  }
  // Cameras as the app has them with none yet: the More camera settings button, not part of the demo.
  function camerasBody() { return '<div class="actions top0"><a class="btn text demo-dimbtn" href="#" aria-disabled="true">More camera settings' + glyph('next') + '</a></div>'; }
  function sensorsBody() {
    var rows = SENSORS.filter(function (s) { return state.sensors[s[0]]; }).map(function (s) {
      var live = s[0] === 'light';
      return '<li class="two' + (live ? '' : ' demo-dim') + '"><span class="lead">' + glyph(s[0]) + '</span><span class="text"><span class="h">' + esc(s[1]) +
        '</span><span class="s">' + esc(live ? (state.sensors.light ? lightReading() : 'Off') : s[2]) + '</span></span><span class="trail"><input type="checkbox" class="sw" checked ' +
        (live ? 'data-demo="sensor" data-id="light"' : 'aria-disabled="true"') + ' aria-label="' + esc(s[1]) + '"></span></li>';
    }).join('');
    return (rows ? '<ul class="list seg" id="sensors-home">' + rows + '</ul>' : '') +
      '<div class="actions"><a class="btn text" href="#" data-go="sensors">More sensor settings' + glyph('next') + '</a></div>';
  }
  function automationsBody() {
    var rows = state.rules.filter(function (r) { return r.enabled; }).map(function (r) {
      return '<li class="two"><span class="lead">' + glyph('automations') + '</span><span class="text"><span class="h">' + esc(r.name) + '</span><span class="s">' + esc(sentence(r)) +
        '</span></span><span class="trail"><input type="checkbox" class="sw" checked data-demo="rule-switch" data-id="' + r.id + '" aria-label="' + esc(r.name) + '"></span></li>';
    }).join('');
    return (rows ? '<ul class="list seg">' + rows + '</ul>' : '') +
      '<div class="actions' + (rows ? '' : ' top0') + '"><a class="btn text" href="#" data-go="automations">More automation settings' + glyph('next') + '</a></div>';
  }
  function integrationsBody() { return '<div class="empty"><p class="h">No integrations yet</p><p class="s">Muralis will show and act on data from other services. The first integrations come in an update.</p></div>'; }
  function mqttBody() {
    return off(field('m-host', 'Broker host', '', ' readonly') + field('m-port', 'Broker port', '1883', ' readonly') + field('m-user', 'Username', '', ' readonly') +
      field('m-pass', 'Password', '', ' type="password" readonly', 'Blank keeps the current one.') + '<div class="switches">' + switchRow('m-tls', 'Encrypted (TLS)', false) + '</div>' +
      '<div class="actions"><button class="primary" type="button">Save</button></div>');
  }
  function webBody() {
    return off(field('w-port', 'Port', '8080', ' readonly') + field('w-pass', 'Admin password', '', ' type="password" readonly', 'Blank keeps the current one.') +
      '<p class="hint">At least 8 characters. No username.</p><div class="actions"><button class="primary" type="button">Save</button></div>');
  }
  function fleetBody() {
    return off('<div class="fleet-member"><p>Not in a fleet</p><div class="actions"><button type="button" class="tonal">' + (PANEL ? 'Join a fleet' : 'Join') + '</button></div></div>' +
      '<p class="label">Connection</p>' + field('f-port', 'Member port', '8081', ' readonly') + '<p class="hint">Listening on port 8081</p>' +
      '<div class="actions"><button class="primary" type="button">Save</button></div>');
  }
  function sequencesBody() {
    if (PANEL) {
      return '<p class="demo-escape">Settings: ' + esc(describe(state.settings)) + '<br>Home screen: ' + esc(describe(state.launcher)) + '<br>PIN: not set</p>' +
        '<div class="actions"><button type="button" class="text demo-dimbtn" aria-disabled="true">Change the combinations</button></div>' +
        off('<div class="switches">' + switchRow('v-buttons', 'Disable volume buttons', false) + '</div>');
    }
    return off('<p class="hint">Corner taps in order: TL, TR, BL, BR, separated by commas. Between 3 and 12 taps. Recording them on the tablet is easier than typing them here.</p>' +
      field('f-settings_sequence', 'Open Muralis settings', state.settings, ' readonly') + field('f-launcher_sequence', 'Leave Muralis for the home screen', state.launcher, ' readonly') +
      '<p class="hint">Optional PIN, asked after either combination: 4 to 8 digits. A combination can be watched and repeated; a PIN has to be known. None is set.</p>' +
      field('f-pin', 'PIN', '', ' type="password" readonly', 'Blank keeps the current one.') + '<div class="actions"><button class="primary" type="button">Save</button></div>' +
      '<div class="switches">' + switchRow('v-buttons', 'Disable volume buttons', false) + '</div>');
  }
  function aboutBody() {
    var name = '<form data-demo="name">' + field('f-device_id', 'Name', state.name, ' data-demo-name="1"') + '<p class="hint bad" id="name-problem" hidden></p></form>';
    var stats = linkRow('stats', 'stats', 'System stats and log', state.stats ? 'Overlay on' : 'Overlay off', glyph('next'));
    if (PANEL) {
      return name + '<ul class="list gap">' + stats + '</ul>' +
        '<p class="hint">Muralis 0.7.0 (build 412)</p><p class="label">Muralis Pro</p>' +
        '<p class="hint">The fleet: up to 6 panels managed from any of them, sharing their settings, with alerts and history. One panel has everything without it.</p>' +
        '<p>Free</p>' + off('<div class="actions"><button type="button" class="primary">Buy Muralis Pro</button></div>') +
        '<ul class="list">' + linkRow('legal:privacy', 'next', 'Privacy policy', null, glyph('next')) + linkRow('legal:terms', 'next', 'Terms and conditions', null, glyph('next')) +
        linkRow('version', 'next', 'Version and device details', null, glyph('next')) + '</ul>';
    }
    return name + '<ul class="list gap">' + stats +
      linkRow(null, 'open', 'Screenshot', 'https://192.0.2.42:8080/api/screenshot', '', true) +
      linkRow(null, 'download', 'Settings file', 'Export, import, a setup QR for a new tablet', glyph('next'), true) +
      linkRow(null, 'download', 'Download diagnostics', 'https://192.0.2.42:8080/api/diagnostics', '', true) +
      linkRow('repo', 'info', 'Muralis 0.7.0', 'github.com/spazio17/muralis', glyph('open')) +
      linkRow('legal:privacy', 'open', 'Privacy policy', null, glyph('next')) + linkRow('legal:terms', 'open', 'Terms and conditions', null, glyph('next')) + '</ul>';
  }
  function sections() {
    return [
      ['dashboard', 'dash', 'Dashboard', host(state.url) || 'No dashboard yet', dashboardBody, 'What the panel shows'],
      ['display', 'disp', 'Display', 'Landscape · automatic', displayBody, 'Screen'],
      ['ambient', 'saver', 'Ambient', ambientSummary(), ambientBody, 'Screen'],
      ['cameras', 'cameras', 'Cameras', 'None yet', camerasBody, 'Screen'],
      ['sensors', 'sensors', 'Sensors', sensorsOn(), sensorsBody, 'Automation'],
      ['automations', 'automations', 'Automations', rulesOn(), automationsBody, 'Automation'],
      ['integrations', 'integrations', 'Integrations', 'Coming soon', integrationsBody, 'Automation'],
      ['mqtt', 'mqtt', 'MQTT', 'Not configured', mqttBody, 'Connections'],
      ['webadmin', 'web', 'Web admin', 'Port 8080 · HTTPS', webBody, 'Connections'],
      ['fleet', 'fleet', 'Fleet', 'Port 8081', fleetBody, 'Connections'],
      ['sequences', 'esc', 'Way out', state.settings + ' · ' + state.launcher, sequencesBody, 'Security'],
      ['panel', 'panel', 'About this panel', state.name, aboutBody, '']
    ];
  }
  var DIM = { display: 1, cameras: 1, integrations: 1, mqtt: 1, webadmin: 1, fleet: 1 };

  function settingsPage() {
    var nav = '<nav class="sections" aria-label="Sections">', boxes = '<div class="boxes">', group = null;
    sections().forEach(function (s) {
      if (s[5] !== group) {
        boxes += (group === null ? '' : '</div>') + '<div class="grp">';
        group = s[5];
        if (group) { nav += '<p class="subhead">' + esc(group) + '</p>'; boxes += '<h2 class="subhead">' + esc(group) + '</h2>'; }
        else nav += '<p class="subhead gap"></p>';
      }
      var dim = DIM[s[0]] ? ' demo-dim' : '';
      nav += '<a class="item' + dim + '" href="#box-' + s[0] + '" data-box="box-' + s[0] + '">' + summaryRow(s[1], s[2], s[3], s[0]) + '</a>';
      boxes += '<details class="box' + dim + '" id="box-' + s[0] + '"><summary>' + summaryRow(s[1], s[2], s[3], null) +
        '<span class="chev">' + glyph('down') + '</span></summary><div class="body" data-title="' + esc(s[2]) + '" data-body="' + s[0] + '">' + s[4]() + '</div></details>';
    });
    nav += '</nav>';
    // The panel's one button, a card's gap under the menu: a menu row of one entry in the main colour (openDashboardRow).
    if (PANEL) nav = '<div class="demo-leftcol">' + nav + '<button type="button" class="demo-opendash" data-demo="to-wall">' + glyph('dash') + '<span>Open dashboard</span></button></div>';
    boxes += '</div></div>';
    var foot = PANEL ? '<div class="demo-opendash-foot"><button type="button" class="demo-opendash" data-demo="to-wall">' + glyph('dash') + '<span>Open dashboard</span></button></div>' : '';
    return appbar('Muralis', state.name, null) + '<div class="menu">' + nav + boxes + '</div>' + foot;
  }

  // ---- the pages under the settings ----
  function sensorsPage(selected) {
    selected = selected || 'light';
    var rows = SENSORS.map(function (s) {
      var live = s[0] === 'light';
      return '<li data-id="' + s[0] + '" class="two' + (s[0] === selected ? ' on' : '') + (live ? '' : ' demo-dim') + '"><span class="lead">' + glyph(s[0]) + '</span><span class="text"><span class="h">' + esc(s[1]) +
        '</span><span class="s">' + esc(live ? (state.sensors.light ? lightReading() : 'Off') : s[2]) + '</span></span><span class="trail"><input type="checkbox" class="sw"' + (state.sensors[s[0]] ? ' checked' : '') + ' ' +
        (live ? 'data-demo="sensor" data-id="light"' : 'aria-disabled="true"') + ' aria-label="' + esc(s[1]) + '"></span></li>';
    }).join('');
    var nav = '<section class="card nav"><div class="cardhead"><h2>Sensors</h2><span class="count">' + esc(sensorsOn()) + '</span></div><ul class="list seg">' + rows + '</ul></section>';
    var detail = '<section class="card"><h2>Light</h2><p class="hint">How bright the room is, from the tablet\'s light sensor.</p>' +
      '<div class="switches">' + switchRow('s-light', 'On', !!state.sensors.light, ' data-demo="sensor" data-id="light"') + '</div>' +
      '<p class="label">Now</p><p class="demo-reading" id="light-now">' + esc(state.sensors.light ? lightReading() : 'Off') + '</p>' +
      off(field('s-interval', 'Report every (seconds)', '30', ' readonly') + field('s-change', 'Report a change of at least (lx)', '20', ' readonly')) +
      '<p class="hint">Automations can use it: when the room gets darker or brighter.</p></section>';
    return appbar('Sensors', null, 'home:sensors') + '<div class="ld" data-kind="sensors" data-page="list">' + nav + '<div class="detail">' + detail + '</div></div>';
  }
  function automationsPage(editing) {
    var rows = state.rules.map(function (r) {
      return '<li data-id="' + r.id + '" class="two' + (editing === r.id ? ' on' : '') + '"><a class="rowlink plain" href="#" data-go="automation:' + r.id + '"><span class="lead">' + glyph('automations') +
        '</span><span class="text"><span class="h">' + esc(r.name) + '</span><span class="s">' + esc(sentence(r)) + '</span></span></a><span class="trail"><input type="checkbox" class="sw"' +
        (r.enabled ? ' checked' : '') + ' data-demo="rule-switch" data-id="' + r.id + '" aria-label="' + esc(r.name) + '"></span></li>';
    }).join('');
    var nav = '<section class="card nav"><div class="cardhead"><h2>Automations</h2><span class="count">' + esc(rulesOn()) + '</span></div>' +
      (rows ? '<ul class="list seg">' + rows + '</ul>' : '<p class="hint">No automations yet.</p>') +
      '<div class="actions"><a class="btn tonal" href="#" data-go="automation:new" data-demo-target="add">' + glyph('plus') + 'Add</a></div></section>';
    var detailPage = editing != null;
    var rule = editing === 'new' || editing == null ? null : state.rules.filter(function (r) { return r.id === editing; })[0];
    var title = !detailPage ? 'Automations' : rule ? 'Edit automation' : 'New automation';
    return appbar(title, null, detailPage ? 'automations' : 'home:automations') +
      '<div class="ld" data-kind="automations" data-page="' + (detailPage ? 'detail' : 'list') + '">' + nav + '<div class="detail">' + editor(rule) + '</div></div>';
  }
  function editor(rule) {
    var r = rule || { id: '', name: '', sensor: 'light', event: 'darker', level: '', minutes: '', action: 'display_off', enabled: true };
    var sensors = SENSOR_MENU.map(function (s) { return option(s[0], s[1], r.sensor, s[2]); }).join('');
    var events = Object.keys(EVENTS).map(function (k) {
      var list = EVENTS[k], one = list.length === 1 ? ' one' : '';
      return '<div class="radios events' + (k === r.sensor ? ' on' : '') + '" data-sensor="' + k + '" role="radiogroup" aria-label="' + k + ' events">' +
        list.map(function (e) { return '<label class="radio' + one + '"><input type="radio" name="event_' + k + '" value="' + e.id + '"' + ((k === r.sensor && e.id === r.event) || list.length === 1 ? ' checked' : '') + ' data-level="' + (e.unit || '') + '" data-holds="' + (e.holds ? 1 : '') + '">' + esc(e.label) + '</label>'; }).join('') + '</div>';
    }).join('');
    var actions = ACTIONS.map(function (a) { return option(a[0], a[1], r.action, a[2]); }).join('');
    return '<form class="automation" data-demo="rule" data-id="' + esc(r.id) + '">' +
      '<section class="card">' + field('a-name', 'Name', r.name, ' data-words="1"') + '</section>' +
      '<section class="card gap"><h2>When</h2>' + select('a-sensor', 'Sensor', sensors, ' data-demo="rule-sensor"') + events +
      field('a-level', 'Level', r.sensor === 'time' ? '' : r.level, ' type="number" step="any" min="0"') +
      field('a-at', 'At', r.sensor === 'time' ? r.level : '07:00', ' type="time"') +
      field('a-minutes', 'For (minutes)', r.minutes, ' type="number" min="0" max="1440"') + '</section>' +
      '<section class="card"><h2>Then</h2>' + select('a-action', 'Action', actions) + '</section>' +
      '<section class="card">' + off('<h2>Only</h2>' + switchRow('a-only', 'Between these times', false) +
        '<div class="two">' + field('a-from', 'From', '07:00', ' readonly') + field('a-to', 'To', '22:00', ' readonly') + '</div>') + '</section>' +
      '<p class="hint bad" id="rule-problem" hidden></p>' +
      '<div class="actions editor"><button type="submit" class="primary">' + (rule ? 'Save' : 'Add') + '</button><a class="btn text" href="#" data-go="automations">Cancel</a>' +
      (rule ? '<button type="button" class="danger" data-demo="rule-delete" data-id="' + r.id + '">Delete</button>' : '') + '</div></form>';
  }
  function ambientPage() {
    var list = state.playlists.length ? '<ul class="list seg">' + state.playlists.map(function (p) {
      var n = p.items.length;
      return '<li class="two"><a class="rowlink plain" href="#" data-go="playlist:' + p.id + '"><span class="lead">' + glyph('saver') + '</span><span class="text"><span class="h">' + esc(p.name) +
        '</span><span class="s">' + n + (n === 1 ? ' picture' : ' pictures') + (p.active ? ' · <span class="inuse">in use</span>' : '') + '</span></span></a><span class="trail">' +
        '<input type="radio" name="active" data-demo="playlist-use" data-id="' + p.id + '"' + (p.active ? ' checked' : '') + ' aria-label="Use ' + esc(p.name) + '"></span></li>';
    }).join('') + '</ul>' : '<p class="hint">No playlists yet. Create one, then open it and pick its pictures.</p>';
    return appbar('Ambient', null, 'home:ambient') + '<div class="two">' +
      '<section class="card"><h2>Playlists</h2>' + list +
      '<form class="beside newplaylist" data-demo="playlist-new">' + field('new-playlist-name', 'New playlist name', '', ' maxlength="40" data-words="1"') + '<button class="primary" type="submit">Create</button></form></section>' +
      '<section class="card">' + off('<h2>When it starts</h2>' + field('am-idle', 'After (minutes without a touch)', '2', ' readonly') + field('am-off', 'Display off after (minutes)', '0', ' readonly') +
        '<p class="label">Pictures</p>' + select('am-fit', 'Fit', option('cover', 'Fill the screen', 'cover')) + select('am-change', 'Change every', option('10', '10 seconds', '10')) + switchRow('am-credit', 'Show the credit', true)) +
        '<div class="actions"><button type="button" class="tonal" data-demo="preview">Preview</button></div></section></div>';
  }
  function playlistPage(id) {
    var p = state.playlists.filter(function (x) { return x.id === id; })[0];
    if (!p) return ambientPage();
    var grid = PICTURES.map(function (pic) {
      var on = p.items.indexOf(pic.id) >= 0;
      return '<label class="demo-pick"><input type="checkbox" value="' + pic.id + '"' + (on ? ' checked' : '') + '><img src="pictures/' + pic.id + '.svg" alt="' + esc(pic.name) + '"><span>' + esc(pic.name) + '</span></label>';
    }).join('');
    return appbar(p.name, null, 'ambient') + '<form data-demo="playlist-save" data-id="' + p.id + '"><section class="card"><h2>Pictures</h2>' +
      '<p class="hint">' + (p.items.length ? 'Pick the pictures this playlist shows.' : 'Name it, then pick its pictures') + '</p><div class="demo-picks">' + grid + '</div>' +
      off('<div class="actions"><button type="button" class="tonal">' + glyph('upload') + 'Upload</button></div>') +
      '<div class="actions"><button type="submit" class="primary">Save</button><button type="button" class="tonal" data-demo="preview">Preview</button></div></section></form>';
  }
  function statsText() {
    var t = Date.now() / 1000, cpu = 8 + Math.round(6 * Math.abs(Math.sin(t / 7))), ram = 1050 + Math.round(40 * Math.abs(Math.sin(t / 11)));
    var up = Math.max(1, Math.round((Date.now() - BOOT) / 60000));
    return 'CPU  ' + cpu + '%  1.81GHz  load 2.41\nRAM  ' + ram + 'M/2865M  ' + Math.round(ram / 28.65) + '%\nTEMP 31°cpu  30°gpu\nBAT  83% charging\nIP   192.0.2.42  -47dBm\nWEB  0 deaths  never\nUP   ' + up + 'm';
  }
  var BOOT = Date.now();
  function statsPage() {
    return appbar('System stats and log', null, 'home:panel') + '<div class="two"><section class="card"><h2>System stats</h2><pre class="mono" id="stats-readout">' + esc(statsText()) + '</pre>' +
      '<div class="switches">' + switchRow('stats-overlay', 'Show system stats on the dashboard', state.stats, ' data-demo="stats"') + '</div></section>' +
      '<section class="card"><h2>Log</h2>' + off('<div class="actions tight"><button type="button" class="text">' + glyph('pause') + 'Pause</button><button type="button" class="text">' + glyph('copy') + 'Copy</button><button type="button" class="text">' + glyph('download') + 'Download</button></div>') +
      '<pre class="mono">' + esc(new Date().toTimeString().slice(0, 8) + ' I Muralis: Dashboard loaded: ' + host(state.url) + '\n' + new Date().toTimeString().slice(0, 8) + ' I Muralis: Web admin listening on port 8080\n' + new Date().toTimeString().slice(0, 8) + ' I Muralis: Sensors: light every 30 s') + '</pre></section></div>';
  }
  function versionPage() {
    function row(k, v) { return '<li class="two"><span class="text"><span class="h">' + esc(k) + '</span><span class="s">' + esc(v) + '</span></span></li>'; }
    return appbar('About', null, 'home:panel').replace('</h1>', '</h1><p class="sub">Muralis 0.7.0 (build 412)</p>') + '<div class="two">' +
      '<section class="card"><h2>Muralis</h2><ul class="list">' + row('Version', '0.7.0') + row('Build', '412') + row('Package', 'org.spazio17.muralis') + '</ul></section>' +
      '<section class="card"><h2>This tablet</h2><ul class="list">' + row('Model', 'Demo Tablet 10') + row('Android', '14 (API 34)') + row('Rendering engine', 'com.google.android.webview 138.0.7204.181') + row('Device owner', 'yes') + '</ul></section>' +
      '<section class="card"><h2>Credits</h2><ul class="list">' + row('Eclipse Paho', 'MQTT client (EPL/EDL)') + row('ZXing', 'QR codes (Apache 2.0)') + row('Icons', 'After Material Symbols by Google (Apache 2.0)') + '</ul></section></div>';
  }

  // ---- routing inside a surface ----
  var route = 'home', openSection = null;
  function go(to) {
    var parts = to.split(':'), page = parts[0], arg = parts[1];
    if (page === 'repo') { window.open('https://github.com/spazio17/muralis', '_blank', 'noopener'); return; }
    if (page === 'legal') { window.open('../' + arg + '/', '_blank', 'noopener'); return; }
    route = to;
    if (page === 'home') openSection = arg ? 'box-' + arg : openSection;
    render();
    window.scrollTo(0, 0);
    tell('page:' + page);
  }
  function render() {
    var parts = route.split(':'), page = parts[0], arg = parts[1], html;
    if (page === 'sensors') html = sensorsPage(arg);
    else if (page === 'automations') html = automationsPage(null);
    else if (page === 'automation') html = automationsPage(arg);
    else if (page === 'ambient') html = ambientPage();
    else if (page === 'playlist') html = playlistPage(arg);
    else if (page === 'stats') html = statsPage();
    else if (page === 'version') html = versionPage();
    else html = settingsPage();
    var main = document.getElementById('settings');
    main.innerHTML = html;
    applyTheme();
    if (page === 'home') { if (window.MuralisMenuInit) window.MuralisMenuInit(openSection); }
    if (page === 'automation') syncEditor();
    ring();
  }
  // The app's menu script binds once to the boxes it finds; the demo draws them again on every
  // visit, so it runs the same rules here: one section open, the list choosing it from 840 px.
  window.MuralisMenuInit = function (want) {
    var boxes = [].slice.call(document.querySelectorAll('details.box')), items = [].slice.call(document.querySelectorAll('.sections .item'));
    var wide = matchMedia('(min-width:840px)');
    function open(id, byHand) {
      openSection = id;
      boxes.forEach(function (d) { var on = d.id === id; if (d.open !== on) d.open = on; });
      items.forEach(function (a) { a.classList.toggle('on', a.dataset.box === id); });
      if (id && byHand) tell('section:' + id.replace('box-', ''));
    }
    boxes.forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (d.open) { if (d.id !== openSection) open(d.id, true); return; }
        if (d.id !== openSection) return;
        if (wide.matches) d.open = true; else { openSection = null; items.forEach(function (a) { a.classList.remove('on'); }); }
      });
    });
    items.forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); open(a.dataset.box, true); }); });
    if (want && document.getElementById(want)) open(want); else if (wide.matches) open(boxes[0].id);
  };

  // ---- the theme toggle: light, dark, follow the device (admin_theme.js) ----
  var ORDER = ['light', 'dark', 'system'];
  function theme() { try { var t = localStorage.getItem(THEME_KEY); if (ORDER.indexOf(t) >= 0) return t; } catch (e) {} return PANEL ? 'dark' : 'system'; }
  function applyTheme() {
    var mode = theme();
    document.documentElement.setAttribute('data-theme', mode);
    var b = document.getElementById('theme-toggle');
    if (b) { var names = { light: 'Light', dark: 'Dark', system: 'Follow the device' }; b.title = 'Day and night: ' + names[mode] + '. Tap for ' + names[ORDER[(ORDER.indexOf(mode) + 1) % 3]].toLowerCase(); b.setAttribute('aria-label', b.title); }
  }

  // ---- the wall: the page the panel shows, the stats over it, Ambient, display off, the corners ----
  var wallView = 'dashboard', onceUrl = null, slide = 0, slideTimer = 0;
  function renderWall() {
    var wall = document.getElementById('wall'), url = onceUrl || state.url, s = sampleOf(url), html;
    if (wallView === 'off') html = '<div class="demo-black" role="img" aria-label="The display is off"></div>';
    else if (wallView === 'ambient') {
      var pics = activePictures();
      html = '<div class="demo-ambient">' + pics.map(function (id, i) { return '<img src="pictures/' + id + '.svg" alt="" class="' + (i === slide % pics.length ? 'on' : '') + '">'; }).join('') + '</div>';
    } else html = s ? '<picture><source media="(orientation:portrait)" srcset="' + s.upright + '"><img src="' + s.src + '" alt="' + esc(s.title) + ', a sample page"></picture>'
      : '<div class="demo-explain"><p>In this demo the panel shows sample pages.</p><p>On your panel, <b>' + esc(host(url)) + '</b> opens here.</p></div>';
    if (state.stats && wallView === 'dashboard') html += '<pre class="demo-overlay">' + esc(statsText()) + '</pre>';
    if (light) html += '<div class="demo-statuslight" style="--led:' + light + '"></div>';
    html += '<button type="button" class="demo-corner tl" aria-label="Top-left corner"></button><button type="button" class="demo-corner tr" aria-label="Top-right corner"></button>' +
      '<button type="button" class="demo-corner bl" aria-label="Bottom-left corner"></button><button type="button" class="demo-corner br" aria-label="Bottom-right corner"></button>';
    wall.innerHTML = html;
  }
  function activePictures() {
    var p = state.playlists.filter(function (x) { return x.active; })[0];
    return p && p.items.length ? p.items : PICTURES.map(function (x) { return x.id; });
  }
  function showWall(view) {
    wallView = view || 'dashboard';
    clearInterval(slideTimer);
    if (wallView === 'ambient') { slide = 0; slideTimer = setInterval(function () { slide++; var imgs = document.querySelectorAll('.demo-ambient img'); imgs.forEach(function (im, i) { im.classList.toggle('on', i === slide % imgs.length); }); }, 3500); }
    renderWall();
    document.getElementById('wall').hidden = false;
    document.getElementById('settings').hidden = true;
  }
  function showSettings() {
    clearInterval(slideTimer);
    document.getElementById('wall').hidden = true;
    document.getElementById('settings').hidden = false;
    route = 'home'; render();
    tell('settings-open');
  }
  var taps = [];
  function corner(which) {
    if (wallView !== 'dashboard') { showWall('dashboard'); return; }
    var now = Date.now();
    taps = taps.filter(function (t) { return now - t.at < 2500; });
    taps.push({ c: which, at: now });
    var seq = taps.map(function (t) { return t.c; }).join(',');
    if (seq.slice(-state.settings.length) === state.settings) { taps = []; showSettings(); }
    else if (seq.slice(-state.launcher.length) === state.launcher) { taps = []; snack('On your panel this leaves Muralis for the home screen.'); tell('launcher'); }
    else tell('corner:' + which);
  }

  // ---- automations, run against the demo's room light ----
  var light = null, lastLux = null, held = {};
  // A rule acts when its condition becomes true: the room gets darker (or brighter) than its
  // level. Only while the Light sensor is on, as on the panel, where a sensor listens only while
  // it is on. A rule saved while the room is already past its level acts at the next reading.
  function runRules(lux) {
    lastLux = lux;
    if (!state.sensors.light) return;
    state.rules.forEach(function (r) {
      if (!r.enabled || r.sensor !== 'light' || r.level === '') return;
      var L = +r.level, now = r.event === 'darker' ? lux < L : lux > L;
      if (now && !held[r.id]) act(r);
      held[r.id] = now;
    });
  }
  function act(r) {
    if (!PANEL) return;
    var a = r.action;
    if (a === 'display_off') { if (!document.getElementById('wall').hidden) showWall('off'); else onWallHidden('off'); }
    else if (a === 'display_on' || a === 'dashboard') showWall('dashboard');
    else if (a === 'ambient') showWall('ambient');
    else if (a === 'light_on') { light = '70,98,255'; renderWall(); }
    else if (a === 'light_off') { light = null; renderWall(); }
    tell('rule-fired:' + a);
  }
  function onWallHidden(view) { showWall(view); }

  // ---- the message line ----
  var snackTimer = 0;
  function snack(text) {
    var el = document.getElementById('snack');
    el.textContent = text; el.hidden = false;
    clearTimeout(snackTimer); snackTimer = setTimeout(function () { el.hidden = true; }, 3500);
  }

  // ---- a change made on the other surface ----
  function flash(el) { if (!el) return; el.classList.remove('demo-flash'); void el.offsetWidth; el.classList.add('demo-flash'); }
  function refresh(changed) {
    // The section open now, read from the page: a details element's toggle event comes a moment
    // after the click, so a change made right after opening would otherwise reopen the old one.
    var openNow = document.querySelector('details.box[open]');
    if (openNow) openSection = openNow.id;
    var focus = document.activeElement && document.activeElement.id;
    var y = window.scrollY;
    render();
    window.scrollTo(0, y);
    if (focus) { var f = document.getElementById(focus); if (f) f.focus(); }
    if (PANEL && !document.getElementById('wall').hidden) renderWall();
    if (changed) {
      flash(document.querySelector('.sections .item[data-box="box-' + changed + '"]'));
      flash(document.querySelector('#box-' + changed + ' > summary'));
      if (changed === 'panel') flash(document.getElementById('demo-name'));
    }
  }
  if (channel) channel.onmessage = function (e) {
    var m = e.data;
    if (m.state) {
      var luxBefore = state.lux;
      state = m.state;
      if (m.from !== SURFACE) refresh(m.changed);
      if (state.lux !== luxBefore) runRules(state.lux);
    }
    if (m.command && PANEL && m.command.to === 'panel') {
      var onWall = !document.getElementById('wall').hidden;
      if (m.command.open) { onceUrl = m.command.open; showWall('dashboard'); }
      if (m.command.show) { onceUrl = null; if (onWall) showWall('dashboard'); }
      if (m.command.preview) showWall('ambient');
    }
    if (m.highlight !== undefined) { ringTarget = m.highlight && m.highlight.surface === SURFACE ? m.highlight.selector : null; ring(); }
    if (m.reset) { try { localStorage.removeItem(THEME_KEY); } catch (e2) {} location.reload(); }
  };
  // The guide's ring on the control it points to.
  var ringTarget = null;
  function ring() {
    document.querySelectorAll('.demo-ring').forEach(function (el) { el.classList.remove('demo-ring'); });
    if (!ringTarget) return;
    var el = document.querySelector(ringTarget);
    if (el) el.classList.add('demo-ring');
  }

  // ---- the editor's live parts: the events of the chosen sensor, the boxes that apply ----
  function syncEditor() {
    var form = document.querySelector('form.automation'); if (!form) return;
    var sensor = form.querySelector('#a-sensor').value;
    form.querySelectorAll('.radios.events').forEach(function (g) { g.classList.toggle('on', g.dataset.sensor === sensor); g.hidden = false; });
    var ev = form.querySelector('.radios.events[data-sensor="' + sensor + '"] input:checked');
    var unit = ev ? ev.dataset.level : '', holds = ev ? ev.dataset.holds : '';
    var level = form.querySelector('#a-level').closest('.field'), at = form.querySelector('#a-at').closest('.field'), min = form.querySelector('#a-minutes').closest('.field');
    level.hidden = !unit || unit === 'time'; at.hidden = unit !== 'time'; min.hidden = !holds;
    if (unit && unit !== 'time') level.querySelector('label').textContent = 'Level (' + unit + ')';
  }

  // ---- what the visitor does ----
  document.addEventListener('submit', function (e) {
    var form = e.target, kind = form.dataset.demo;
    if (!kind) return;
    e.preventDefault();
    if (kind === 'dashboard') {
      var v = form.querySelector('input').value.trim();
      state.url = /^[a-z]+:\/\//.test(v) ? v : 'http://' + v;
      onceUrl = null;
      save('dashboard', 'saved:dashboard');
      post({ command: { to: 'panel', show: true } });
      if (PANEL) showWall('dashboard');
      else { snack('Saved. The panel shows it now.'); refresh('dashboard'); }
    } else if (kind === 'name') {
      storeName(form.querySelector('input'));
    } else if (kind === 'rule') {
      var id = form.dataset.id, sensor = form.querySelector('#a-sensor').value, ev = form.querySelector('.radios.events[data-sensor="' + sensor + '"] input:checked');
      var problem = form.querySelector('#rule-problem');
      var name = form.querySelector('#a-name').value.trim();
      var e2 = ev ? eventOf(sensor, ev.value) : null;
      var level = e2 && e2.unit === 'time' ? form.querySelector('#a-at').value : form.querySelector('#a-level').value.trim();
      var why = !name ? 'give it a name' : !ev ? 'choose what happens' : e2.unit && level === '' ? 'give it a level' : null;
      if (why) { problem.textContent = 'Not saved: ' + why + '.'; problem.hidden = false; return; }
      var rule = { id: id || 'r' + Date.now().toString(36), name: name, sensor: sensor, event: ev.value, level: level, minutes: form.querySelector('#a-minutes').value.trim(), action: form.querySelector('#a-action').value, enabled: true };
      if (id) state.rules = state.rules.map(function (r) { return r.id === id ? (rule.enabled = r.enabled, rule) : r; }); else state.rules.push(rule);
      save('automations', 'saved:rule:' + rule.sensor + ':' + rule.event + ':' + rule.action);
      go('automations');
      snack('Saved: ' + sentence(rule) + '.');
    } else if (kind === 'playlist-new') {
      var pname = form.querySelector('input').value.trim();
      if (!pname) { snack('Not created: give it a name.'); return; }
      var p = { id: 'p' + Date.now().toString(36), name: pname, items: [], active: state.playlists.length === 0 };
      state.playlists.push(p); save('ambient', 'created:playlist');
      go('playlist:' + p.id);
    } else if (kind === 'playlist-save') {
      var pl = state.playlists.filter(function (x) { return x.id === form.dataset.id; })[0];
      pl.items = [].slice.call(form.querySelectorAll('input[type=checkbox]:checked')).map(function (i) { return i.value; });
      save('ambient', 'saved:playlist:' + pl.items.length);
      snack('Saved. ' + pl.items.length + (pl.items.length === 1 ? ' picture.' : ' pictures.'));
      go('ambient');
    }
  });
  function storeName(input) {
    var name = input.value.trim(), problem = document.getElementById('name-problem');
    if (name === state.name) { if (problem) problem.hidden = true; return; }
    if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(name)) { if (problem) { problem.textContent = 'Not saved: the name may only use lowercase letters, digits and dashes.'; problem.hidden = false; } return; }
    if (problem) problem.hidden = true;
    state.name = name; save('panel', 'saved:name');
    var sub = document.getElementById('demo-name'); if (sub) sub.textContent = name;
    snack('Saved. The other screen shows it too.');
  }
  // The name stores when its box lets go of the focus, as on both surfaces.
  document.addEventListener('focusout', function (e) { if (e.target.dataset && e.target.dataset.demoName) storeName(e.target); });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset.demo === 'sensor') { state.sensors.light = t.checked; save('sensors', 'sensor:light:' + (t.checked ? 'on' : 'off')); refresh(); }
    else if (t.dataset.demo === 'rule-switch') { state.rules.forEach(function (r) { if (r.id === t.dataset.id) r.enabled = t.checked; }); save('automations'); refresh(); }
    else if (t.dataset.demo === 'stats') { state.stats = t.checked; save('panel', 'stats:' + (t.checked ? 'on' : 'off')); if (!PANEL) snack('The panel shows the stats over its page.'); }
    else if (t.dataset.demo === 'ambient-mode') {
      if (t.value !== 'off' && t.value !== 'pictures') { t.value = state.ambient; snack('Not in this demo. It works on your panel.'); return; }
      state.ambient = t.value; save('ambient', 'ambient:' + t.value); refresh();
    }
    else if (t.dataset.demo === 'playlist-use') { state.playlists.forEach(function (p) { p.active = p.id === t.dataset.id; }); save('ambient'); refresh(); }
    else if (t.id === 'a-sensor' || (t.name && t.name.indexOf('event_') === 0)) syncEditor();
    else if (t.id === 'a-action' && t.selectedOptions[0] && t.selectedOptions[0].disabled) snack('Not in this demo. It works on your panel.');
  });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[aria-disabled="true"], .demo-corner, [data-demo], [data-go], #theme-toggle, .demo-black, .demo-wake, .demo-ambient, .ld .nav li[data-id]');
    if (!t) return;
    if (t.classList.contains('demo-corner')) { corner(t.className.match(/\b(tl|tr|bl|br)\b/)[1].toUpperCase()); return; }
    if (t.getAttribute('aria-disabled') === 'true') { e.preventDefault(); e.stopPropagation(); snack('Not in this demo. It works on your panel.'); return; }
    if (t.id === 'theme-toggle') {
      var next = ORDER[(ORDER.indexOf(theme()) + 1) % 3];
      try { localStorage.setItem(THEME_KEY, next); } catch (e3) {}
      applyTheme(); tell('theme:' + next); return;
    }
    if (t.classList.contains('demo-black') || t.classList.contains('demo-wake') || t.classList.contains('demo-ambient')) { showWall('dashboard'); tell('woken'); return; }
    if (t.matches('.ld .nav li[data-id]') && !e.target.closest('input,a')) { if (route.indexOf('sensors') === 0) go('sensors:' + t.dataset.id); return; }
    if (t.dataset.go) { e.preventDefault(); go(t.dataset.go); return; }
    var d = t.dataset.demo;
    if (d === 'to-wall') {
      var box = document.getElementById('f-dashboard_url');
      if (box) { var typed = box.value.trim(), full = /^[a-z]+:\/\//.test(typed) ? typed : 'http://' + typed;
        if (typed && full !== state.url) { state.url = full; save('dashboard', 'saved:dashboard'); } }
      onceUrl = null; showWall('dashboard'); tell('wall');
    }
    else if (d === 'open-once') {
      var v = document.getElementById('f-dashboard_url').value.trim(), url = /^[a-z]+:\/\//.test(v) ? v : 'http://' + v;
      post({ command: { to: 'panel', open: url } });
      if (PANEL) { onceUrl = url; showWall('dashboard'); } else snack('The panel shows it until it restarts.');
      tell('open-once');
    } else if (d === 'preview') {
      post({ command: { to: 'panel', preview: true } });
      if (PANEL) showWall('ambient'); else snack('Ambient shows on the panel. Tap it to end.');
      tell('preview');
    } else if (d === 'rule-delete') {
      state.rules = state.rules.filter(function (r) { return r.id !== t.dataset.id; }); save('automations'); go('automations');
    }
  }, true);

  // The stats readout and overlay move, as the app's poll moves them.
  setInterval(function () {
    var r = document.getElementById('stats-readout'); if (r) r.textContent = statsText();
    var o = document.querySelector('.demo-overlay'); if (o) o.textContent = statsText();
    var n = document.getElementById('light-now'); if (n) n.textContent = state.sensors.light ? lightReading() : 'Off';
  }, 2000);

  render();
  applyTheme();
  if (PANEL) showWall('dashboard');
  else { document.getElementById('wall').hidden = true; }
  lastLux = state.lux;
  tell('ready');
})();
