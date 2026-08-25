#!/usr/bin/env python3
"""Regenerates the legal document bodies of the site from the canonical texts.

legal/privacy.txt and legal/terms.txt are the single source of truth for the privacy
policy and the terms, decided 2026-08-25. This script renders each of them into the
matching page, replacing only what sits between the BEGIN/END GENERATED LEGAL TEXT
markers; everything outside the markers (masthead, preamble, the draft notice, footer)
is hand-kept template.

The app bundles the same two texts verbatim as res/raw/privacy_policy.txt and
res/raw/terms.txt in spazio17/muralis, copied by that repo's scripts/sync-legal.sh and
byte-compared against this repo's files by its release workflow. So the flow on a legal
change is: edit legal/*.txt here, run this script, commit both; then sync and release
the app.

Rendering rules, all of them read off the pages this replaced:
  - a line entirely in capitals is a section heading -> <h2>, sentence-cased with a
    small proper-noun dictionary (this is presentation only; the canonical casing is
    the txt's)
  - a block whose lines all start with "- " -> <ul><li>
  - a paragraph starting with an "• " bullet -> a bullet-lead <p> holding the first
    sentence, then a normal <p> with the rest
  - anything else -> <p>
  - HTML special characters are escaped

scripts/check-legal.py verifies the result the independent way, by stripping the HTML
back to text, so a bug here cannot certify itself. CI runs both.
"""

import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = {"privacy": ROOT / "privacy" / "index.html",
        "terms": ROOT / "terms" / "index.html"}
BEGIN_PREFIX = "<!-- BEGIN GENERATED LEGAL TEXT"
END_MARKER = "<!-- END GENERATED LEGAL TEXT -->"

# Presentation casing for words that a naive sentence-casing of an all-caps heading
# would get wrong. The live site once said "If you buy muralis pro" for exactly this
# reason. Extend it when a new heading needs it; check-legal.py compares
# case-insensitively, so review is what catches a missing entry.
PROPER_NOUNS = {"muralis": "Muralis", "pro": "Pro", "mqtt": "MQTT",
                "google": "Google", "play": "Play", "wi-fi": "Wi-Fi",
                "android": "Android"}


def escape(text):
    return (text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace("'", "&#x27;").replace('"', "&quot;"))


def heading(line):
    cased = line.lower()
    cased = cased[0].upper() + cased[1:]
    for word, proper in PROPER_NOUNS.items():
        cased = re.sub(r"(?<![\w-])" + re.escape(word) + r"(?![\w-])",
                       proper, cased, flags=re.IGNORECASE)
    # Never let the dictionary lowercase the sentence opener.
    return cased[0].upper() + cased[1:]


def is_heading(block):
    if len(block) != 1:
        return False
    line = block[0]
    return len(line) > 2 and line == line.upper() and re.fullmatch(r"[A-Z0-9 ,.'&-]+", line)


def render(text):
    blocks = [b.split("\n") for b in re.split(r"\n\s*\n", text.strip())]
    out = []
    for block in blocks:
        if is_heading(block):
            out.append("  <h2>%s</h2>" % escape(heading(block[0])))
        elif all(line.startswith("- ") for line in block):
            out.append("  <ul>")
            out.extend("    <li>%s</li>" % escape(line[2:]) for line in block)
            out.append("  </ul>")
        elif len(block) == 1 and block[0].startswith("• "):
            body = block[0][2:]
            lead, _, rest = body.partition(". ")
            out.append('  <p class="bullet-lead">%s.</p>' % escape(lead))
            out.append("  <p>%s</p>" % escape(rest))
        else:
            out.append("  <p>%s</p>" % escape(" ".join(block)))
    return out


def splice(page_path, txt_path):
    page = page_path.read_text(encoding="utf-8")
    text = txt_path.read_text(encoding="utf-8")
    begin_at = page.find(BEGIN_PREFIX)
    end_at = page.find(END_MARKER)
    if begin_at < 0 or end_at < 0 or end_at < begin_at:
        sys.exit("%s: BEGIN/END GENERATED LEGAL TEXT markers missing or reversed"
                 % page_path)
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    begin = ("%s: rendered from %s (sha256 %s) by scripts/generate-legal.py. "
             "Edit the txt and re-run the script; do not edit this block by hand. -->"
             % (BEGIN_PREFIX, txt_path.relative_to(ROOT), digest))
    body = "\n".join([begin] + render(text) + ["  " + END_MARKER])
    updated = page[:begin_at] + body + page[end_at + len(END_MARKER):]
    changed = updated != page
    page_path.write_text(updated, encoding="utf-8")
    return changed


def main():
    for name, page_path in DOCS.items():
        txt_path = ROOT / "legal" / (name + ".txt")
        changed = splice(page_path, txt_path)
        print("%s: %s" % (page_path.relative_to(ROOT),
                          "regenerated" if changed else "already current"))


if __name__ == "__main__":
    main()
