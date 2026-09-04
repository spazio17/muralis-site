# muralis-site

The Muralis product page, served by GitHub Pages at **https://muralis.spazio17.org/**.

Plain static HTML and CSS. No Jekyll (`.nojekyll` is present), no dependencies, and one generated directory: `download/` is built from the APK in it, see below. Run `scripts/generate-download.py` once after cloning, then open `index.html` in a browser and what you see is what Pages serves.

## Layout

```
index.html                product page
setup/index.html          the device setup page: battery limits, WebView, what to turn off
download/                 the Play-signed APK, and everything derived from it (see below)
privacy/index.html        privacy policy, the public URL Play requires, in addition to the in-app copy
terms/index.html          terms
imprint/index.html        imprint
legal/*.txt               the canonical privacy and terms texts the two pages are generated from
assets/css/site.css       all styles; the palette is copied from the app (see below)
assets/js/theme.js        light/dark toggle wiring
assets/js/menu.js         the site menu behind the Menu button
assets/js/motion.js       the roller pass that brings each block on, and the masthead rail
assets/js/waydeck.js      the two-way install tabs
assets/js/clips.js        the demo clip deck
assets/js/lightbox.js     opens a screenshot full size
assets/js/recipes.js      fills the blueprint overlay, and the copy button in it
assets/js/setup.js        the setup page's own wiring
assets/img/               icon, badge, screenshots
assets/video/             the demo clips and their poster frames
blueprints/*.yaml         copies of the Home Assistant blueprints, shown by the recipes section
scripts/                  the generators and the checks CI runs (legal text, blueprints, download/)
.github/workflows/        the checks, and pages-deploy.yml, which builds and publishes the site
.nojekyll                 serve the files as-is instead of running them through Jekyll
```

## The palette is not independent

`assets/css/site.css` carries the same Catppuccin custom properties as the app itself, Mocha for
dark, Latte for light, accents pushed further towards saturation. The sources of truth are
`KioskTheme.java` (tablet) and `PAGE_CSS` in `HttpAdminServer.java` (web admin) in
[`spazio17/muralis`](https://github.com/spazio17/muralis). Change a colour there and change it here,
or the site stops looking like the product.

## Legal text is a copy, not a source

`privacy/index.html` and `terms/index.html` render the text bundled in the app at
`app/src/main/res/raw/privacy_policy.txt` and `app/src/main/res/raw/terms.txt`. The app is the
source; this repo is a publication of it. When that text changes, update these pages to match, Play requires the public copy and the in-app copy to say the same thing.

The privacy policy was finalized on 2026-08-31: reviewed line by line against the app's source,
dated, and given a rights section; its draft banner is gone. The terms still carry theirs, and the
governing-law section is still a placeholder on purpose. **Do not remove the terms' draft banner
until reviewed text lands in `legal/terms.txt`.**

## Automation recipes are copies too

The recipes section offers two Home Assistant blueprints. The files in `blueprints/` are **copies**,
and the originals live in [`spazio17/muralis-blueprints`](https://github.com/spazio17/muralis-blueprints),
a separate public repository.

That split is forced, not a preference. Home Assistant imports a blueprint from GitHub, from a gist
or from its own forums, and from nowhere else, so an Add to Home Assistant button cannot hand it a
file served from this site. The button hands it the repository; the page shows the copy so a reader
can see what they are about to import without leaving.

A copy is a thing that drifts, so `.github/workflows/blueprint-check.yml` fails closed on two counts.
It diffs every file in `blueprints/` against the same file upstream, and it runs
`scripts/check-recipes.py`, which checks that every card names a blueprint that exists, that the
import link and the On GitHub link beside it name that same blueprint, and that no blueprint in the
repository has been published and then quietly forgotten. Same instinct as `legal-check.yml`.

To add a recipe: commit the YAML upstream first, copy it into `blueprints/`, then add a card that
names it in all three places. The check will tell you if you missed one.

## Screenshots

`assets/img/screenshots/` holds the gallery images. Slots on the product page that are still waiting
for a capture are marked `class="pending"` and render as a labelled dashed frame; to fill one,
replace its `<div class="placeholder">…</div>` with `<img src="…" alt="…">` and drop the `pending`
class. Portrait captures (the tablet's own screens) additionally take `class="portrait"` for a taller
frame.

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
