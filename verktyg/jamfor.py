#!/usr/bin/env python3
"""Jämför en skärmdump mot designreferensen, tolerant mot små vertikala förskjutningar.

Kör: python jamfor.py <skarmdump.png> <referens.png> <diff.png>
Kräver Pillow.

Olika Chrome-versioner snappar delpixel-radhöjder (16 px × 1,6 = 25,6 px) olika, så en sida
kan glida några pixlar vertikalt utan att något i designen skiljer sig. Därför delas referensen
i band om BAND rader; för varje band söks den vertikala förskjutning inom ±MAXSKIFT som ger minst
avvikelse mot skärmdumpen. Kvarstående avvikelse per band är det som faktiskt skiljer sig
(till exempel logotypen). Skriver också en rå diffbild utan förskjutning (röda pixlar).
"""
import sys
from PIL import Image, ImageChops

BAND = 48
MAXSKIFT = 64
TROSKEL = 24          # 0–255, skillnad per kanal som räknas som avvikelse
RAPPORTGRANS = 3.0    # procent avvikande pixlar i ett band som är värt att rapportera (1–3 % är delpixel-drift i text)


def avvikelse(a, b):
    d = ImageChops.difference(a, b).convert("L").point(lambda p: 255 if p > TROSKEL else 0)
    return d.histogram()[255], d


def main(skarm, ref, diffut):
    a = Image.open(skarm).convert("RGB")
    b = Image.open(ref).convert("RGB")
    print(f"skärmdump {a.size}, referens {b.size}, höjdskillnad {a.height - b.height:+d} px")
    w = min(a.width, b.width)
    h = min(a.height, b.height)

    ra, rawdiff = avvikelse(a.crop((0, 0, w, h)), b.crop((0, 0, w, h)))
    print(f"rå avvikelse utan förskjutning: {100 * ra / (w * h):.2f} %")
    Image.merge("RGB", (rawdiff, Image.new("L", rawdiff.size, 0), Image.new("L", rawdiff.size, 0))).save(diffut)

    print(f"bandvis jämförelse (band {BAND} rader, förskjutning ±{MAXSKIFT} px):")
    kvar_tot = 0
    rapporter = []
    for y0 in range(0, b.height, BAND):
        y1 = min(y0 + BAND, b.height)
        refband = b.crop((0, y0, w, y1))
        bast = None
        for d in range(-MAXSKIFT, MAXSKIFT + 1):
            s0, s1 = y0 + d, y1 + d
            if s0 < 0 or s1 > a.height:
                continue
            n, _ = avvikelse(a.crop((0, s0, w, s1)), refband)
            if bast is None or n < bast[0]:
                bast = (n, d)
        if bast is None:
            rapporter.append((y0, y1, None, 100.0))
            continue
        n, d = bast
        pct = 100 * n / (w * (y1 - y0))
        kvar_tot += n
        if pct > RAPPORTGRANS:
            rapporter.append((y0, y1, d, pct))
    for y0, y1, d, pct in rapporter:
        print(f"  ref rad {y0}–{y1}: {pct:.1f} % kvar" + (f" (bästa förskjutning {d:+d} px)" if d is not None else " (utanför skärmdumpen)"))
    print(f"kvarstående avvikelse efter förskjutning: {100 * kvar_tot / (w * b.height):.3f} %")
    print("OK: inga band över gränsen" if not rapporter else f"{len(rapporter)} band att titta på")
    return 0 if not rapporter else 1


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:4]))
