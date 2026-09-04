#!/usr/bin/env python3
"""Reads an APK's signing certificate without the Android SDK.

The provisioning QR carries the SHA-256 of the APK's *signing certificate*, base64url
with the padding stripped, and Android compares that against the APK it downloads during
setup. Get it wrong and provisioning fails late, on a freshly wiped tablet, with a
message that does not say which field was wrong. So the checksum in the QR is derived
from the APK sitting next to it rather than copied from anywhere, and this module is
what derives it.

Why parse the file rather than shell out to apksigner: the check has to run in CI, on a
runner with no Android SDK, and it has to keep running years from now. The APK Signing
Block is a stable, documented format, and everything needed here is four length-prefixed
fields deep.

A Play-signed APK has no META-INF/*.RSA at all, so the old JAR signature is not an
option: v2 and v3 are the only signatures present.

Format, only as far as this needs it:

    ...zip entries...
    APK Signing Block:
        uint64  size (excluding this first field)
        repeated: uint64 length, uint32 id, (length - 4) bytes value
        uint64  size (again)
        16 bytes "APK Sig Block 42"
    Central directory
    End of central directory

and inside the v2 (id 0x7109871a) or v3 (0xf05368c0) value:

    length-prefixed sequence of signers
        length-prefixed signed data
            length-prefixed digests
            length-prefixed certificates    <- the first one is the signing certificate
"""

import hashlib
import struct

APK_SIG_BLOCK_MAGIC = b"APK Sig Block 42"
SCHEME_V2_ID = 0x7109871A
SCHEME_V3_ID = 0xF05368C0
EOCD_MAGIC = b"PK\x05\x06"


def _find_eocd(blob):
    """The end-of-central-directory record, searched from the back as the format intends."""
    # 22 bytes minimum, plus a comment of at most 65535.
    start = max(0, len(blob) - (22 + 65535))
    at = blob.rfind(EOCD_MAGIC, start)
    if at < 0:
        raise ValueError("not a zip: no end-of-central-directory record")
    return at


def _length_prefixed(value):
    """Walks a uint32-length-prefixed sequence, yielding each element's bytes."""
    at = 0
    while at + 4 <= len(value):
        (size,) = struct.unpack_from("<I", value, at)
        at += 4
        if at + size > len(value):
            raise ValueError("length-prefixed element runs past its container")
        yield value[at:at + size]
        at += size


def signing_certificate(path):
    """The DER bytes of the APK's first signing certificate."""
    blob = open(path, "rb").read()
    eocd_at = _find_eocd(blob)
    (central_directory_at,) = struct.unpack_from("<I", blob, eocd_at + 16)

    # The block's trailing size and magic sit immediately before the central directory.
    footer_at = central_directory_at - 24
    if footer_at < 0 or blob[footer_at + 8:footer_at + 24] != APK_SIG_BLOCK_MAGIC:
        raise ValueError("no APK Signing Block: this APK is unsigned, or v1 only")
    (block_size,) = struct.unpack_from("<Q", blob, footer_at)
    block_at = central_directory_at - block_size - 8
    # Between the leading size field and the trailing size + magic.
    pairs = blob[block_at + 8:central_directory_at - 24]

    values = {}
    at = 0
    while at + 12 <= len(pairs):
        (pair_size,) = struct.unpack_from("<Q", pairs, at)
        (pair_id,) = struct.unpack_from("<I", pairs, at + 8)
        values[pair_id] = pairs[at + 12:at + 8 + pair_size]
        at += 8 + pair_size

    # v3 first: where both are present they carry the same certificate, and v3 is the
    # one a modern Android reads.
    for scheme in (SCHEME_V3_ID, SCHEME_V2_ID):
        if scheme not in values:
            continue
        # The pair's value is a length-prefixed *sequence* of length-prefixed signers, so
        # the signers are one unwrap in. Missing this level parses the first signer's
        # length as a signer and walks straight off the end.
        signers = next(_length_prefixed(values[scheme]))
        for signer in _length_prefixed(signers):
            signed_data = next(_length_prefixed(signer))
            fields = _length_prefixed(signed_data)
            next(fields)                       # digests, not needed here
            certificates = next(fields)
            return next(_length_prefixed(certificates))
    raise ValueError("no APK Signature Scheme v2 or v3 block")


def certificate_sha256(path):
    """Hex SHA-256 of the signing certificate, the digest apksigner prints."""
    return hashlib.sha256(signing_certificate(path)).hexdigest()


if __name__ == "__main__":
    import sys
    for name in sys.argv[1:]:
        print(certificate_sha256(name), name)
