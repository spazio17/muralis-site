# Screenshots

Five of the six gallery slots are filled. Captured from the real panel on 2026-08-21 — a Huawei
MediaPad on Android 8.0 (API 26), 1920x1200, provisioned as device owner.

| File | What it shows |
| --- | --- |
| `panel-in-place.png` | Home Assistant's own public demo under lock task |
| `web-admin.png` | The web admin in a desktop browser, with its live status block populated |
| `config-screen.png` | The on-device configuration screen |
| `escape-recorder.png` | The corner-tap recorder, four taps in |
| `stats-overlay.png` | The stats overlay over the top-right of the dashboard |

Still wanted: the Home Assistant device page showing the MQTT-discovered entities. It needs a
logged-in admin session, and the panel's own WebView is signed in as a non-admin user, so `/config`
redirects to the default dashboard when the kiosk is pointed at it.

## Two rules these captures follow

**The dashboard shown is Home Assistant's public demo, not a real one.** A real dashboard put the
household's names in the title bar and a still from a Makoto Shinkai film behind it — personal data
and third-party artwork, neither of which belongs on a commercial product page. The demo is built to
be shown publicly and is unmistakably Home Assistant.

**Private addresses are redacted, and redacted by removal.** The panel's LAN address appeared in the
status chip, the "Listening at" line, the overlay's `IP` row and twice in the web admin. Each is
painted out with a block sampled from the surrounding background, so the removal is invisible rather
than a grey smear — and it is a block, not a blur, because a blurred short string is recoverable by
brute force. Every redaction was verified programmatically: the pixel range is re-scanned afterwards
and must contain nothing but background.

## Re-capturing

`adb exec-out screencap -p > name.png` for the tablet's own screens. The web admin needs its live
`/api/stats` poll to work, which means the browser must send Basic auth on the XHR too — headless
Chrome will not attach credentials from a `user:pass@host` URL to a subresource request, so put a
small auth-injecting reverse proxy in front of it and point the browser at that.
