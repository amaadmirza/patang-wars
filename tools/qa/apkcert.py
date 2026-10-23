"""Print the SHA-256 of the signing certificate(s) in an APK's v2/v3 signing block."""
import struct, hashlib, sys
def certs(path):
    d = open(path, 'rb').read()
    eocd = d.rfind(b'PK\x05\x06'); cd_off = struct.unpack('<I', d[eocd + 16:eocd + 20])[0]
    assert d[cd_off - 16:cd_off] == b'APK Sig Block 42', 'no v2+ signing block'
    size = struct.unpack('<Q', d[cd_off - 24:cd_off - 16])[0]; start = cd_off - size - 8
    p, end, out = start + 8, cd_off - 24, []
    while p < end:
        ln, bid = struct.unpack('<QI', d[p:p + 12]); val = d[p + 12:p + 8 + ln]; p += 8 + ln
        if bid in (0x7109871a, 0xf05368c0):   # v2, v3
            # signers -> signer -> signed data -> digests, certificates
            def lp(b, o): n = struct.unpack('<I', b[o:o + 4])[0]; return b[o + 4:o + 4 + n], o + 4 + n
            signers, _ = lp(val, 0); signer, _ = lp(signers, 0); sd, _ = lp(signer, 0)
            _, o = lp(sd, 0); cs, _ = lp(sd, o); c, _ = lp(cs, 0)
            out.append(('v2' if bid == 0x7109871a else 'v3', hashlib.sha256(c).hexdigest()))
    return out
for f in sys.argv[1:]: print(f, certs(f))
