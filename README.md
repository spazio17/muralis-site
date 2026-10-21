# muralis-site

The Muralis product page, served by GitHub Pages at **https://muralis.spazio17.org/**.

Plain static HTML and CSS. No Jekyll (`.nojekyll` is present), no dependencies, and one generated directory: `download/` is built from the APK in it, see below. Run `scripts/generate-download.py` once after cloning, then open `index.html` in a browser and what you see is what Pages serves.

## Layout

```
index.html                product page (its own style and script: assets/css/home.css, assets/js/home.js)
features/index.html       Free, Pro and Business compared, and what a tablet needs
api/index.html            the remote-control reference: HTTP, commands, settings, stats, MQTT
setup/index.html          the device setup page: battery limits, WebView, what to turn off
download/                 the Play-signed APK, and everything derived from it (see below)
privacy/index.html        privacy policy, the public URL Play requires, in addition to the in-app copy
terms/index.html          terms
imprint/index.html        imprint
legal/*.txt               the canonical privacy and terms texts the two pages are generated from
demo/                     the live demo on the product page: the panel and its web admin, drawn with the app's own stylesheet
assets/css/home.css       the product page's styles, with its fonts in assets/fonts/
assets/css/site.css       the other pages' styles
assets/js/theme.js        light/dark toggle wiring; light unless a reader chose Dark
assets/js/menu.js         the site menu behind the Menu button
assets/js/copy.js         the Copy button on every code block
assets/js/home.js         the product page: the hero tablet, the day, Home/Pro/Business, the bricks, the price cards
assets/js/demo.js         the demo's guide, tours, room light and reset, around the two demo frames
assets/js/talk.js         the scenes where another system talks to the panel, and the Home Assistant card
assets/js/setup.js        the setup page's own wiring
assets/img/               icon, badge, Play banner; home/ holds the product page's screens
assets/video/             the QR setup clip on the download page
scripts/                  the generators and the checks CI runs (legal text, download/)
.github/workflows/        the checks, and pages-deploy.yml, which builds and publishes the site
.nojekyll                 serve the files as-is instead of running them through Jekyll
```

## The palette

One palette with the app: the ultramarine seed `#1C39BB` and its Material 3 tones. The product page
has night bands (`#12131d`) for the panel in the dark, plaster (`#f7f3ea`, `#efe7d6`) for the wall
by day, ultramarine for what you press, and fresco gold (`#e0a93b`) only as light on the wall.
Headings are Archivo, text Atkinson Hyperlegible, both self-hosted in `assets/fonts/` (SIL Open Font
License, its text beside them): the privacy page promises that every byte comes from this domain.
The other pages keep `site.css`, light by default with a dark choice in the menu.

## Legal text is a copy, not a source

`privacy/index.html` and `terms/index.html` render the text bundled in the app at
`app/src/main/res/raw/privacy_policy.txt` and `app/src/main/res/raw/terms.txt`. The app is the
source; this repo is a publication of it. When that text changes, update these pages to match, Play requires the public copy and the in-app copy to say the same thing.

`legal-check.yml` fails when the generated pages differ from what `scripts/generate-legal.py`
makes of `legal/*.txt`.

## Screens

`assets/img/home/` holds the product page's screens: WebP captures of a real panel (`page` and
`stats` for the stats switch; `settings`, `escape`, `automations`, `ambient`, `fleet` and
`webadmin`, each also at 640 pixels for the gallery) and the drawn example pages the hero tablet and the day show (SVG). The
captures come from the Play screenshot set, sanitized: demo dashboard only, documentation
addresses.

## download/ is built, not committed

`download/muralis-latest.apk` is the Play-signed universal APK, fetched by hand from Play Console
(App bundle explorer, the version's Downloads tab). It is the only file in that directory under
version control. The checksum, the provisioning payload the QR encodes, the QR itself and the
listing page are all derived from it by `scripts/generate-download.py`, and `.gitignore` keeps
the results out of git so there is never a committed copy that could disagree with the APK.

The generator also refuses two APKs that would provision fine and go wrong afterwards: one not
signed with Google's app signing certificate for Muralis (a debug or upload-key build), and one
carrying Play's automatic integrity protection, which locks up a tablet that has no Google
account. The expected certificate is a constant at the top of the script, on purpose.

To ship a new version: copy the new APK over `download/muralis-latest.apk`, commit, open a PR.
The dry run on the PR builds the page and refuses a wrong file; the merge publishes it. The QR
does not change between versions, because the certificate does not.

For a local preview, run `scripts/generate-download.py` (it needs `segno`, nothing else) and
serve the tree. `--base-url` points the QR at a throwaway address for a test tablet.

## Deploying

Push to `main`. `.github/workflows/pages-deploy.yml` generates `download/`, uploads the tree and
deploys it. Pages is set to publish from **GitHub Actions** (Settings, Pages, Source), not from
the branch; with the branch as source the derived files would be missing from the site. The same
workflow runs on every pull request as a dry run without deploying. A failed run leaves the
previous deployment in place, so a broken build means a stale site, not a missing one.

The custom domain is configured in **Settings → Pages → Custom domain**. `muralis.spazio17.org`
needs a DNS `CNAME` record pointing at `spazio17.github.io`, the org's Pages host, not this
repo's name. The `CNAME` file in the repo dates from when the branch was the source and is
harmless; the setting is what routes the domain now. *Enforce HTTPS* is on.
