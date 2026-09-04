#!/usr/bin/env python3
"""Builds everything in download/ from the APK that is sitting there.

One APK, and every other file in that directory derived from it: the checksum people
verify, the provisioning payload the QR encodes, the QR itself, and a plain index page,
because GitHub Pages does not list a directory and a bare URL would otherwise 404. Nothing
about the APK is quoted anywhere else on the site: the front page sends readers here.

The point is that none of it can be stale in an interesting way. The QR carries the
SHA-256 of the APK's *signing certificate*, and a wrong one fails late, on a freshly
wiped tablet, with a message that does not say which field was wrong. So it is read out
of the APK next to it (scripts/apksig.py) rather than copied from a note.

Usage:
    scripts/generate-download.py                     # the published QR
    scripts/generate-download.py --base-url http://192.168.1.5:8000/download
                                                     # a throwaway QR for a local test

check-download.py re-runs all of this and requires no diff, so a forgotten regeneration
fails in CI rather than on someone's tablet.
"""

import argparse
import base64
import hashlib
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import apksig

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOWNLOAD = ROOT / "download"
APK = DOWNLOAD / "muralis-latest.apk"
PUBLISHED_BASE = "https://muralis.spazio17.org/download"

# The provisioning payload, minus the download location and the checksum, which are read
# from the APK. LEAVE_ALL_SYSTEM_APPS_ENABLED is true on purpose: left at its default,
# device-owner provisioning disables every non-required system app, which on some OEM
# builds is a large undocumented set including things the launcher depends on.
PAYLOAD_CONSTANTS = {
    "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME":
        "org.spazio17.muralis/.KioskDeviceAdminReceiver",
    "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": True,
    "android.app.extra.PROVISIONING_SKIP_ENCRYPTION": True,
}


def facts(base_url):
    """Everything the generated files need, all of it read out of the APK."""
    blob = APK.read_bytes()
    certificate_hex = apksig.certificate_sha256(APK)
    payload = dict(PAYLOAD_CONSTANTS)
    payload["android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION"] = \
        f"{base_url}/{APK.name}"
    # Base64url with the padding stripped, which is the encoding Android expects here.
    payload["android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM"] = \
        base64.urlsafe_b64encode(bytes.fromhex(certificate_hex)).decode().rstrip("=")
    return {
        "size": len(blob),
        "apk_sha256": hashlib.sha256(blob).hexdigest(),
        "certificate_sha256": certificate_hex,
        "payload": payload,
    }


def qr_svg(payload):
    """The QR as an SVG, so it stays sharp at whatever size the page gives it."""
    import io
    import segno
    # Compact separators: every byte saved is one less module, and a denser code is
    # harder for an older front-facing camera to read off a screen. Error correction M
    # is the usual compromise; this is read off a screen, not off a dusty crate.
    text = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    code = segno.make(text, error="m")
    buffer = io.BytesIO()
    # Black on white in both themes, deliberately, rather than following the page's
    # palette. A light-on-dark code is inverted, and while most scanners cope, the one
    # that has to read this is the Android setup wizard on a tablet nobody can log into
    # yet. That is not the place to find out which scanners are the exception.
    # With width and height, not just a viewBox. An SVG carrying only a viewBox has no
    # intrinsic size, and an <img> of one inside a shrink-to-fit box asks its parent for a
    # width while the parent asks it back: Chrome breaks the tie with the HTML attributes,
    # Firefox resolves it to zero and the code vanishes. Reported on the page 2026-09-02.
    # scale=4 makes that intrinsic size 372px, a sensible natural size for a QR; the CSS
    # scales it from there and it stays sharp because it is still vector.
    code.save(buffer, kind="svg", scale=4, border=2, dark="#000000", light="#ffffff",
              xmldecl=False, svgns=True)
    return buffer.getvalue().decode()


def write(path, text):
    existing = path.read_text(encoding="utf-8") if path.exists() else None
    if existing == text:
        print(f"{path.relative_to(ROOT)}: already current")
        return False
    path.write_text(text, encoding="utf-8")
    print(f"{path.relative_to(ROOT)}: written")
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=PUBLISHED_BASE,
                        help="where the APK will be served from, no trailing slash")
    args = parser.parse_args()
    if not APK.exists():
        sys.exit(f"No APK at {APK}. Put the Play-signed universal APK there first.")

    found = facts(args.base_url.rstrip("/"))
    payload_text = json.dumps(found["payload"], separators=(",", ":"), sort_keys=True)

    # sha256sum's own format, so `sha256sum -c muralis-latest.apk.sha256` just works.
    write(DOWNLOAD / "muralis-latest.apk.sha256",
          f"{found['apk_sha256']}  {APK.name}\n")
    write(DOWNLOAD / "provisioning-qr.json", payload_text + "\n")
    write(DOWNLOAD / "provisioning-qr.svg", qr_svg(found["payload"]) + "\n")
    write(DOWNLOAD / "index.html", index_page(found))
    return 0


def index_page(found):
    """A plain listing, because Pages serves no directory index and a bare URL 404s."""
    kb = found["size"] / 1024
    rows = [
        ("muralis-latest.apk", f"{kb:,.0f} KB",
         "The app, exactly as Google Play signs and distributes it."),
        ("muralis-latest.apk.sha256", None,
         "Checksum of the file above, in sha256sum's format."),
        ("provisioning-qr.json", None,
         "What the provisioning QR encodes, character for character."),
        ("provisioning-qr.svg", None, "The QR itself."),
    ]
    def row(name, size, note):
        # The size rides on the one file where it matters, the download itself, and is
        # read off the file on every run, so it cannot go stale. Nothing else here has a
        # size worth printing.
        meta = f' <small>{size}</small>' if size else ""
        return (f'      <dt><a href="{name}">{name}</a>{meta}</dt>\n'
                f'      <dd>{note}</dd>')
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Muralis downloads</title>
<meta name="description" content="The Play-signed Muralis APK, its checksum, the signing fingerprint, and the provisioning QR, published so anyone can check them.">
<link rel="canonical" href="https://muralis.spazio17.org/download/">
<link rel="icon" href="../assets/img/icon-512.png" type="image/png">
<link rel="stylesheet" href="../assets/css/site.css?v=26">
<script>
  /* The same bootstrap every page carries: a theme chosen anywhere on the site holds
     here too, applied before first paint so an explicit choice never flashes the other
     palette. */
  try {{
    var t = localStorage.getItem('muralis-theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  }} catch (e) {{ /* private mode: fall through to prefers-color-scheme */ }}
</script>
</head>
<body>

<header class="masthead">
  <div class="wrap">
    <a class="brand" href="../">
      <img src="../assets/img/icon-512.png" alt="">
      Muralis
    </a>
    <nav class="pagenav" aria-label="Pages">
      <a href="../">Overview</a>
      <a href="../setup/">Setup</a>
      <a href="../download/" aria-current="page">Download</a>
    </nav>
    <button class="menubtn" type="button" aria-expanded="false" aria-controls="sitemenu">
      <span class="bars" aria-hidden="true"></span>
      <span class="menubtn-label">Menu</span>
    </button>
  </div>
  <!-- One menu for the whole site, at every width. The bar carries the pages, which is
       the site's structure and is the same everywhere; the menu carries this page's own
       sections, which only the front page has, and the theme, which is a setting rather
       than a destination and was taking bar space on every page for it. Hidden here in
       the markup rather than by CSS alone, so it is closed before the script runs and a
       reader with no JavaScript is not given a panel that can never be shut. -->
  <div class="sitemenu" id="sitemenu" hidden>
    <div class="wrap menuwrap">
      <nav class="menugroup" aria-label="Pages">
        <p class="menuhead">Pages</p>
        <a href="../">Overview</a>
        <a href="../setup/">Setup</a>
        <a href="../download/" aria-current="page">Download</a>
      </nav>
      <div class="menugroup">
        <p class="menuhead">Appearance</p>
        <div class="themepick" role="group" aria-label="Colour theme">
          <button type="button" data-theme="light" aria-pressed="false">Light</button>
          <button type="button" data-theme="dark" aria-pressed="false">Dark</button>
        </div>
      </div>
    </div>
  </div>
</header>

<main class="wrap downloads">
  <h1 class="stroke">Download</h1>
  <p class="lede stroke">Everything the provisioning QR installs, published so you can check it before a tablet does.</p>

  <figure class="clip stroke">
    <div class="frame"><video src="../assets/video/qr-provisioning.mp4" poster="../assets/video/poster/qr-provisioning.jpg" preload="none" controls muted playsinline width="1280" height="800"></video></div>
    <p class="clip-note">Thirty seconds, from the welcome screen of a wiped tablet to the panel on the wall. Drawn rather than filmed, so no real tablet and no real home is in it.</p>
  </figure>

  <dl class="filelist stroke">
{chr(10).join(row(*item) for item in rows)}
  </dl>

  <h2 class="stroke">Authenticity</h2>
  <p class="stroke">SHA-256 of the APK:</p>
  <div class="code-scroll stroke" tabindex="0" role="region" aria-label="The APK checksum"><pre><code>{found['apk_sha256']}</code></pre></div>
  <p class="stroke">SHA-256 of the certificate it is signed with, which is Google&#8217;s app signing key for
  Muralis and does not change between releases:</p>
  <div class="code-scroll stroke" tabindex="0" role="region" aria-label="The signing certificate fingerprint"><pre><code>{found['certificate_sha256']}</code></pre></div>
  <p class="stroke">Read it back off the file yourself:</p>
  <div class="code-scroll stroke" tabindex="0" role="region" aria-label="The command that prints the certificate"><pre><code>apksigner verify --print-certs muralis-latest.apk</code></pre></div>
  <p class="note stroke">Generated from the APK in this directory by <code>scripts/generate-download.py</code>.</p>
</main>

<footer>
  <div class="wrap">
    <span>Muralis, a <a href="https://spazio17.org/">Spazio17</a> project.</span>
    <nav>
      <a href="../privacy/">Privacy</a>
      <a href="../terms/">Terms</a>
      <a href="../imprint/">Imprint</a>
      <a href="https://github.com/spazio17/muralis">Source</a>
    </nav>
  </div>
</footer>

<script src="../assets/js/menu.js?v=1"></script>
<script src="../assets/js/theme.js?v=4"></script>
<script src="../assets/js/motion.js?v=5"></script>
</body>
</html>
"""


if __name__ == "__main__":
    sys.exit(main())
