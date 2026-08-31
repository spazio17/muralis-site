# muralis-site

The Muralis product page, served by GitHub Pages at **https://muralis.spazio17.org/**.

Plain static HTML and CSS. No Jekyll (`.nojekyll` is present), no build step, no dependencies, open `index.html` in a browser and what you see is what Pages serves.

## Layout

```
index.html            product page
privacy/index.html    privacy policy, the public URL Play requires, in addition to the in-app copy
terms/index.html      terms
assets/css/site.css   all styles; the palette is copied from the app (see below)
assets/js/theme.js    light/dark toggle wiring
assets/js/motion.js   the roller pass that brings each block on, and the masthead rail
assets/js/lightbox.js opens a screenshot full size
assets/js/recipes.js  fills the blueprint overlay, and the copy button in it
assets/img/           icon, screenshots
blueprints/*.yaml     copies of the Home Assistant blueprints, shown by the recipes section
scripts/              the checks CI runs: legal text, and the blueprint copies
.nojekyll             serve the files as-is instead of running them through Jekyll
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

## Deploying

Push to `main`. Pages serves it.

The custom domain is configured in **Settings → Pages → Custom domain**, which commits a `CNAME`
file to this repo automatically. `muralis.spazio17.org` needs a DNS `CNAME` record pointing at
`spazio17.github.io`, the org's Pages host, not this repo's name; Pages routes the request to this
repo by the `CNAME` file. Leave *Enforce HTTPS* off until the certificate is issued, then turn it on.
