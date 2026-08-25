#!/usr/bin/env python3
"""Verifies that the published legal pages say what the canonical texts say.

The independent half of the pair with scripts/generate-legal.py: instead of re-running
the generator's transform, this strips the generated HTML back to plain text and
compares it, word for word, against legal/privacy.txt and legal/terms.txt. A generator
bug therefore cannot certify itself, and a hand edit inside a generated block is caught
whichever side it was made on.

The comparison is case-insensitive because heading case is presentation (the generator
sentence-cases the txt's all-caps section lines); everything else, including
punctuation, must match exactly. Exits non-zero with the first divergence shown.
"""

import html
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = {"privacy": ROOT / "privacy" / "index.html",
        "terms": ROOT / "terms" / "index.html"}
BEGIN_PREFIX = "<!-- BEGIN GENERATED LEGAL TEXT"
END_MARKER = "<!-- END GENERATED LEGAL TEXT -->"


def page_text(path):
    page = path.read_text(encoding="utf-8")
    begin_at = page.find(BEGIN_PREFIX)
    end_at = page.find(END_MARKER)
    if begin_at < 0 or end_at < 0 or end_at < begin_at:
        sys.exit("%s: BEGIN/END GENERATED LEGAL TEXT markers missing or reversed" % path)
    body = page[page.index("-->", begin_at) + 3:end_at]
    body = re.sub(r"<[^>]+>", " ", body)
    return normalise(html.unescape(body))


def canonical_text(path):
    text = path.read_text(encoding="utf-8")
    text = text.replace("• ", " ")
    text = re.sub(r"^- ", " ", text, flags=re.M)
    return normalise(text)


def normalise(text):
    return re.sub(r"\s+", " ", text).strip().lower()


def main():
    failed = False
    for name, page_path in DOCS.items():
        txt_path = ROOT / "legal" / (name + ".txt")
        page = page_text(page_path)
        canon = canonical_text(txt_path)
        if page == canon:
            print("%s: matches %s" % (page_path.relative_to(ROOT),
                                      txt_path.relative_to(ROOT)))
            continue
        failed = True
        at = next((i for i in range(min(len(page), len(canon)))
                   if page[i] != canon[i]), min(len(page), len(canon)))
        print("%s: DIVERGES from %s at character %d"
              % (page_path.relative_to(ROOT), txt_path.relative_to(ROOT), at))
        print("  page: ...%s" % page[max(0, at - 60):at + 90])
        print("  txt : ...%s" % canon[max(0, at - 60):at + 90])
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
