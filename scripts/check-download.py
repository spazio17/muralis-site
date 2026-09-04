#!/usr/bin/env python3
"""Verifies that everything in download/ still describes the APK sitting there.

The one that matters is the QR. It carries the SHA-256 of the APK's signing certificate,
and Android checks it against the file it downloads during setup. A QR left over from a
different APK fails late, on a tablet that has just been wiped, with a message that does not
say which field was wrong, and by then the person holding it has no way back.

So this regenerates everything and requires no diff, the same way legal-check.py does for the
privacy policy. A forgotten `scripts/generate-download.py` fails here instead of on hardware.
"""

import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOWNLOAD = ROOT / "download"
# Paths relative to the repository root.
GENERATED = ("download/muralis-latest.apk.sha256", "download/provisioning-qr.json",
             "download/provisioning-qr.svg", "download/index.html")


def main():
    apk = DOWNLOAD / "muralis-latest.apk"
    if not apk.exists():
        # Not an error: the directory only exists once there is a signed APK to put in it.
        print("download/muralis-latest.apk is not here yet; nothing to check.")
        return 0

    before = {name: (ROOT / name).read_bytes() if (ROOT / name).exists() else None
              for name in GENERATED}
    # Not capture_output: when the generator itself fails, a missing QR library say, its own
    # message is the useful one, and swallowing it would leave CI showing a CalledProcessError
    # with the reason hidden inside it.
    ran = subprocess.run([sys.executable, str(ROOT / "scripts" / "generate-download.py")],
                         stdout=subprocess.DEVNULL)
    if ran.returncode != 0:
        print("::error::scripts/generate-download.py failed; its message is above.")
        return ran.returncode

    status = 0
    for name in GENERATED:
        after = (ROOT / name).read_bytes()
        if before[name] is None:
            print(f"::error file={name}::{name} was missing and had to be generated. "
                  f"Run scripts/generate-download.py and commit it.")
            status = 1
        elif before[name] != after:
            print(f"::error file={name}::{name} does not match the APK in download/. "
                  f"Run scripts/generate-download.py and commit the result.")
            status = 1
        else:
            print(f"{name} matches the APK")
    return status


if __name__ == "__main__":
    sys.exit(main())
