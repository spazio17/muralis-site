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
assets/img/           icon, screenshots
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

Both pages currently carry a draft banner, and two sections are unfilled placeholders on purpose:
the privacy policy's contact address and the terms' governing law. **Do not remove the draft banners
until reviewed text replaces the draft in the app repo.**

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
