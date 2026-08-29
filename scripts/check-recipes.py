#!/usr/bin/env python3
"""Check the recipe sheets against the blueprints they claim to show.

Three ways the section can lie, all of them silent in a browser:

  * a sheet names a blueprint file that is not there, so the code block shows an
    error where the YAML should be;
  * the Add to Home Assistant link points at a different blueprint than the one
    printed above it, so a reader imports something other than what they read;
  * a blueprint file exists but no sheet shows it, which is how a recipe gets
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
copied = re.findall(r'data-for="([^"]+)"', html)
imports = re.findall(r'blueprint_import/\?blueprint_url=([^"]+)', html)

for path in shown:
    if not (ROOT / path).is_file():
        problems.append("a sheet shows " + path + ", which does not exist")

on_disk = sorted(p.name for p in BLUEPRINTS.glob("*.yaml"))
# Document order, not sorted: pairing each link with the block above it is the
# whole point, and sorting both sides would hide a swap.
shown_names = [pathlib.Path(p).name for p in shown]
for name in on_disk:
    if name not in shown_names:
        problems.append(name + " exists but no sheet shows it")

if shown_names != [pathlib.Path(p).name for p in copied]:
    problems.append("the copy buttons do not match the blocks they copy: "
                    + str(shown_names) + " vs " + str(copied))

# The import link is what a reader actually gets, so it has to name the same
# blueprint as the YAML printed directly above it, in the same order.
imported_names = [pathlib.Path(urllib.parse.unquote(u)).name for u in imports]
if imported_names != shown_names:
    problems.append("import links name " + str(imported_names)
                    + " but the sheets show " + str(shown_names))

for url in imports:
    decoded = urllib.parse.unquote(url)
    if not decoded.startswith(REPO):
        problems.append("import link does not point at the blueprint repository: " + decoded)

for problem in problems:
    print("error: " + problem, file=sys.stderr)

print("checked %d sheet(s) against %d blueprint file(s)" % (len(shown), len(on_disk)))
sys.exit(1 if problems else 0)
