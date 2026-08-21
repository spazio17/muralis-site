# Screenshots

Gallery images for the product page. Empty for now — the slots on `index.html` are marked
`class="pending"` and render as labelled dashed frames until real captures land here.

Wanted, in the order the page shows them:

| File | What it should show |
| --- | --- |
| `panel-in-place.png` | A Home Assistant dashboard running under lock task, as it looks on the wall |
| `web-admin.png` | The web admin in a desktop browser, settings and live status visible |
| `config-screen.png` | The on-device configuration screen |
| `escape-recorder.png` | The corner-tap recorder mid-recording |
| `stats-overlay.png` | The stats overlay drawn over a dashboard |
| `home-assistant.png` | The device page in Home Assistant, entities as MQTT discovery created them |

Capture the tablet's own screens with `adb exec-out screencap -p > name.png`. Prefer whatever theme
the panel actually runs in; the page frames them identically either way.
