#!/usr/bin/env python3
"""Check the recipe cards against the blueprints they claim to offer.

Every recipe names its blueprint three times: in the Add to Home Assistant link,
on the button that opens the YAML, and in the On GitHub link beside it. Three
names for one file is three chances to drift, and all four ways this section can
lie are silent in a browser:

  * a card opens a blueprint file that is not there, so the overlay shows an
    error where the YAML should be;
  * the Add to Home Assistant link points at a different blueprint than the one
    the card shows, so a reader imports something other than what they read;
  * the On GitHub link points at a third file again;
  * a blueprint file exists but no card offers it, which is how a recipe gets
    published and then quietly forgotten.

Run from the repository root. Prints what it checked, exits non-zero on any
mismatch.
"""
import pathlib
import re
import sys
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
BLUEPRINTS = ROOT / "blueprints"
REPO = "https://github.com/spazio17/muralis-blueprints/blob/main/"

html = INDEX.read_text(encoding="utf-8")
problems = []

shown = re.findall(r'data-blueprint="([^"]+)"', html)
imports = re.findall(r'blueprint_import/\?blueprint_url=([^"]+)', html)
# The import URL carries its own copy of that path percent-encoded, so an
# unencoded blob/main/ can only be one of the plain On GitHub links.
sources = re.findall(r'blob/main/([A-Za-z0-9._-]+\.yaml)', html)

for path in shown:
    if not (ROOT / path).is_file():
        problems.append("a card offers " + path + ", which does not exist")

on_disk = sorted(p.name for p in BLUEPRINTS.glob("*.yaml"))
# Document order, not sorted: pairing each link with the button beside it is the
# whole point, and sorting both sides would hide a swap.
shown_names = [pathlib.Path(p).name for p in shown]
for name in on_disk:
    if name not in shown_names:
        problems.append(name + " exists but no card offers it")

# The import link is what a reader actually gets, so it has to name the same
# blueprint as the button it sits next to, in the same order.
imported_names = [pathlib.Path(urllib.parse.unquote(u)).name for u in imports]
if imported_names != shown_names:
    problems.append("import links name " + str(imported_names)
                    + " but the cards offer " + str(shown_names))

if sources != shown_names:
    problems.append("On GitHub links name " + str(sources)
                    + " but the cards offer " + str(shown_names))

for url in imports:
    decoded = urllib.parse.unquote(url)
    if not decoded.startswith(REPO):
        problems.append("import link does not point at the blueprint repository: " + decoded)

for problem in problems:
    print("error: " + problem, file=sys.stderr)

print("checked %d recipe card(s) against %d blueprint file(s)" % (len(shown), len(on_disk)))
sys.exit(1 if problems else 0)
