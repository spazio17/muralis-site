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

None of the four derived files is committed. .github/workflows/pages-deploy.yml runs this on
every push to main and publishes the result, so the site cannot carry a QR that disagrees
with the APK beside it; the same job runs on pull requests as a dry run, which is where a
wrong APK is refused (refuse_unless_publishable, below). Locally, run it once after cloning
or after swapping the APK, and the working tree is what Pages serves.
"""

import argparse
import base64
import hashlib
import json
import pathlib
import sys
import zipfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import apksig

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOWNLOAD = ROOT / "download"
APK = DOWNLOAD / "muralis-latest.apk"
PUBLISHED_BASE = "https://muralis.spazio17.org/download"

# Google's app signing certificate for Muralis: what apksigner prints for every Play-signed
# build, and the number the download page and the recruiting post quote as the seal. The QR
# is derived from whatever APK is in download/, so on its own it would describe a debug
# build or an upload-key build just as faithfully, and provisioning would install it. This
# constant is what makes the wrong file fail here instead. It changes only if Google rotates
# the key, and then on purpose, in a commit that says so.
PLAY_SIGNING_CERTIFICATE_SHA256 = \
    "7e76196a63e6f1a98a124fb3072956d1c91ed503f61480bd7c4221d30e9dfd91"

# Play Console's automatic integrity protection rewrites the signed APK: the application
# class becomes com.pairip's and a licence activity is added that refuses to run unless Play
# itself installed the app for a signed-in account. A QR-provisioned tablet has no account,
# so a protected 0.4.5 locked one up on 2026-09-03. The switch is per release and nothing in
# a local build shows it, so every APK going behind the QR is scanned for the injected code.
PAIRIP_MARKER = b"Lcom/pairip/"


def refuse_unless_publishable(certificate_hex):
    """Stops on the two APKs that would provision fine and go wrong afterwards."""
    where = APK.relative_to(ROOT)
    if certificate_hex != PLAY_SIGNING_CERTIFICATE_SHA256:
        sys.exit(f"{where} is signed with {certificate_hex}, which is not Google's app signing "
                 f"certificate for Muralis. Put the Play-signed universal APK here (Play "
                 f"Console, App bundle explorer, the version's Downloads tab), not a local build.")
    with zipfile.ZipFile(APK) as archive:
        for name in archive.namelist():
            if name.startswith("classes") and name.endswith(".dex") \
                    and PAIRIP_MARKER in archive.read(name):
                sys.exit(f"{where} carries Play's automatic integrity protection ({name} "
                         f"references com.pairip), which locks up a tablet with no Google "
                         f"account. Turn it off for this release in Play Console (Test and "
                         f"release, App integrity, Automatic protection) and download it again.")

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
    refuse_unless_publishable(certificate_hex)
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
    # harder for an older front-facing camera to read off a screen.
    text = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    # Error correction H, the strongest, because the app's icon covers the centre: it reads
    # through about 30 percent of the code lost, and the icon takes about a fifth of its width.
    # Read by the Lenovo's camera, the weakest of the test tablets, off a phone's screen.
    code = segno.make(text, error="h")
    buffer = io.BytesIO()
    # Black on white in both themes, deliberately, rather than following the page's
    # palette. A light-on-dark code is inverted, and while most scanners cope, the one
    # that has to read this is the Android setup wizard on a tablet nobody can log into
    # yet. That is not the place to find out which scanners are the exception.
    # With width and height, not just a viewBox. An SVG carrying only a viewBox has no
    # intrinsic size, and an <img> of one inside a shrink-to-fit box asks its parent for a
    # width while the parent asks it back: Chrome breaks the tie with the HTML attributes,
    # Firefox resolves it to zero and the code vanishes. Reported on the page 2026-09-02.
    # scale=4 makes that intrinsic size 468px for today's payload at H; the CSS
    # scales it from there and it stays sharp because it is still vector.
    code.save(buffer, kind="svg", scale=4, border=2, dark="#000000", light="#ffffff",
              xmldecl=False, svgns=True)
    return buffer.getvalue().decode().replace("</svg>", icon_svg(code.symbol_size(scale=1,
                                                                                    border=0)[0],
                                                                 scale=4, border=2) + "</svg>")


def icon_svg(modules, scale, border):
    """The app's icon over the centre of the code, as the app's own Join QR draws it
    (QrCodes.java): a white square of about a fifth of the code, the dark tile, and the
    launcher icon's glyph from res/drawable/ic_launcher_foreground.xml, drawn larger."""
    side = max(7, round(modules * 0.22))
    side += side % 2 == 0
    start = border + (modules - side) / 2
    unit = (side - 1) / 108
    glyph = 41 / 28
    panes = "".join(
        f'<rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}" rx="2" fill="{fill}"/>'
        for x0, y0, x1, y1, fill in ((33, 40, 57, 52, "#B9C3FF"), (61, 40, 75, 52, "#6F86FF"),
                                     (33, 56, 47, 68, "#6F86FF"), (51, 56, 75, 68, "#B9C3FF")))
    return (f'<g transform="scale({scale})"><rect x="{start}" y="{start}" width="{side}" '
            f'height="{side}" fill="#ffffff"/><g transform="translate({start + 0.5} {start + 0.5}) '
            f'scale({unit})"><rect width="108" height="108" rx="24" fill="#12131D"/>'
            f'<g transform="translate(54 54) scale({glyph}) translate(-54 -54)">'
            f'<rect x="26" y="30" width="56" height="48" rx="6" fill="none" stroke="#B9C3FF" '
            f'stroke-width="4"/><circle cx="54" cy="30" r="1.25" fill="#12131D"/>{panes}'
            f'</g></g></g>')


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
<link rel="stylesheet" href="../assets/css/site.css?v=50">
<script>
  /* The same bootstrap every page carries: a theme chosen anywhere on the site holds
     here too, applied before first paint so an explicit choice never flashes the other
     palette. */
  try {{
    var t = localStorage.getItem('muralis-theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  }} catch (e) {{ /* private mode: follow the system */ }}
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
      <a href="../features/">Features</a>
      <a href="../download/" aria-current="page">Download</a>
      <a href="../setup/">Setup</a>
      <a href="../api/">API</a>
    </nav>
    <button class="menubtn" type="button" aria-expanded="false" aria-controls="sitemenu">
      <span class="bars" aria-hidden="true"></span>
      <span class="menubtn-label">Menu</span>
    </button>
  </div>
  <div class="sitemenu" id="sitemenu" hidden>
    <div class="wrap menuwrap">
      <nav class="menugroup" aria-label="Pages">
        <p class="menuhead">Pages</p>
        <a href="../">Overview</a>
        <a href="../features/">Features</a>
        <a href="../download/" aria-current="page">Download</a>
        <a href="../setup/">Setup</a>
        <a href="../api/">API</a>
      </nav>
      <div class="menugroup">
        <p class="menuhead">Appearance</p>
        <div class="themepick" role="group" aria-label="Colour theme">
          <button type="button" data-theme="auto" aria-pressed="false">Auto</button>
          <button type="button" data-theme="light" aria-pressed="false">Light</button>
          <button type="button" data-theme="dark" aria-pressed="false">Dark</button>
        </div>
      </div>
    </div>
  </div>
</header>

<main class="wrap downloads">
  <h1>Download</h1>
  <p class="lede">Everything the provisioning QR installs, published so you can check it before a tablet does.</p>

  <figure class="clip">
    <div class="frame"><video src="../assets/video/qr-provisioning.mp4" poster="../assets/video/poster/qr-provisioning.jpg" preload="none" controls muted playsinline width="1280" height="800"></video></div>
    <p class="clip-note">Thirty seconds, from the welcome screen of a wiped tablet to the panel on the wall. Drawn rather than filmed, so no real tablet and no real home is in it.</p>
  </figure>

  <h2>The steps</h2>
  <div class="steps-qr">
    <div>
      <p>Muralis owns the tablet and holds the screen on your page. Android grants that only during setup, which is why the tablet has to be reset first.</p>
      <ol class="steps-list"><li>Back up anything on the tablet.</li><li>Factory reset, and stop at the welcome screen.</li><li>Tap the screen six times, then join a network when it asks.</li><li>Scan this code with the tablet. A tablet that cannot verify the code&#8217;s signing fingerprint refuses to go on.</li></ol>
    </div>
    <p class="qr"><img src="provisioning-qr.svg" alt="The provisioning QR code" width="340" height="340"></p>
  </div>

  <dl class="filelist">
{chr(10).join(row(*item) for item in rows)}
  </dl>

  <h2>Authenticity</h2>
  <p>Two different fingerprints, for two different questions.</p>
  <p><b>The file checksum</b>, the SHA-256 of the APK, proves that your download is exactly the file published here. It will not match an app installed from Google Play, because Play builds its own APK for each device.</p>
  <div class="code-scroll" role="region" aria-label="The APK checksum"><pre tabindex="0"><code>{found['apk_sha256']}</code></pre></div>
  <p><b>The certificate fingerprint</b>, the SHA-256 of the certificate the app is signed with, proves who made it. It is Google&#8217;s app signing key for Muralis, the same for this file and for every install from Google Play, and it does not change between releases:</p>
  <div class="code-scroll" role="region" aria-label="The signing certificate fingerprint"><pre tabindex="0"><code>{found['certificate_sha256']}</code></pre></div>
  <p>Read it back off the file yourself:</p>
  <div class="code-scroll" role="region" aria-label="The command that prints the certificate"><pre tabindex="0"><code>apksigner verify --print-certs muralis-latest.apk</code></pre></div>
  <p class="note">Generated from the APK in this directory by <code>scripts/generate-download.py</code>.</p>
</main>

<footer>
  <div class="wrap">
    <span>Muralis, a <a href="https://spazio17.org/">Spazio17</a> project. Made in Vienna, Austria.</span>
    <nav>
      <a href="../privacy/">Privacy</a>
      <a href="../terms/">Terms</a>
      <a href="../imprint/">Imprint</a>
      <a href="https://github.com/spazio17/muralis">Source</a>
    </nav>
  </div>
</footer>

<script src="../assets/js/menu.js?v=1"></script>
<script src="../assets/js/theme.js?v=6"></script>
</body>
</html>
"""


if __name__ == "__main__":
    sys.exit(main())
