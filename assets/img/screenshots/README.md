# Screenshots

All six gallery slots are filled. Captured from the real panel, a Huawei MediaPad on Android 8.0
(API 26), 1920x1200, provisioned as device owner. `web-admin.png`, `escape-recorder.png`,
`stats-overlay.png` and `home-assistant.png` were recaptured on 2026-08-25 after the UI drifted
(sorted quick actions, the Legal card, the retired outage-cause sensor); `panel-in-place.png` and
`config-screen.png` are still the 2026-08-21 captures.

| File | What it shows |
| --- | --- |
| `panel-in-place.png` | Home Assistant's own public demo under lock task |
| `web-admin.png` | The web admin in a desktop browser, with its live status block populated |
| `config-screen.png` | The on-device configuration screen |
| `escape-recorder.png` | The corner-tap recorder, four taps in |
| `stats-overlay.png` | The stats overlay over the top-right of the dashboard |
| `home-assistant.png` | The Muralis device page in Home Assistant, as MQTT discovery created it |

The Home Assistant capture needed a logged-in admin session, which the panel's own WebView does not
have, it is signed in as a non-admin, so pointing the kiosk at `/config` just redirects to the
default dashboard. It was taken from a headless browser here instead, authenticated through Home
Assistant's own login flow, so the panel's session was never disturbed. Its left sidebar is cropped
away: that lists unrelated dashboards and the temporary account used to take it, and none of it is
part of what the shot is about.

## Two rules these captures follow

**The dashboard shown is Home Assistant's public demo, not a real one.** A real dashboard put the
household's names in the title bar and a still from a Makoto Shinkai film behind it, personal data
and third-party artwork, neither of which belongs on a commercial product page. The demo is built to
be shown publicly and is unmistakably Home Assistant.

**Private addresses are redacted, and redacted by removal.** The panel's LAN address appeared in the
status chip, the "Listening at" line, the overlay's `IP` row and twice in the web admin. Each is
painted out with a block sampled from the surrounding background, so the removal is invisible rather
than a grey smear, and it is a block, not a blur, because a blurred short string is recoverable by
brute force. Every redaction was verified programmatically: the pixel range is re-scanned afterwards
and must contain nothing but background.

## Re-capturing

`adb exec-out screencap -p > name.png` for the tablet's own screens. The web admin needs its live
`/api/stats` poll to work, which means the browser must send Basic auth on the XHR too. Headless
Chrome will not attach credentials from a `user:pass@host` URL to a subresource request, but a
browser-level extra header (`Authorization: Basic ...` set on the Playwright context) rides along on
every request including the poll, which is simpler than the reverse proxy used for the first
capture. The config values shown are illustrative, swapped in the DOM before the shot, so the real
broker host and dashboard URL never appear.
