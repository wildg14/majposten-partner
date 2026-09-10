#!/usr/bin/env python3
"""Textnivåkontroller av Partner-sidan. Kör: python3 tests/kontroll.py. Exit 1 vid fel."""
import re
import sys
from pathlib import Path

ROT = Path(__file__).resolve().parents[1]
INDEX = (ROT / "index.html").read_text(encoding="utf-8")
EMBED = (ROT / "beehiiv-embed.html").read_text(encoding="utf-8")
TESTSIDA = (ROT / "docs" / "beehiivtest.html").read_text(encoding="utf-8")
MAILTO = "mailto:daniel@majposten.se?subject=Partner%20i%20Majposten"


def kontroller():
    fel = []

    # 1. Inga externa bildkällor: sidan ska inte bero på någon annans server.
    if "kvarteretmakleri.se" in INDEX:
        fel.append("index.html refererar fortfarande kvarteretmakleri.se")
    for src in re.findall(r'<img[^>]+src="([^"]+)"', INDEX):
        if src.startswith(("http://", "https://", "//")):
            fel.append(f"extern bild: {src}")
        elif not (ROT / src).is_file():
            fel.append(f"bildfil saknas: {src}")

    # 2. Alla länkar har target="_top" (sidan ligger i en nästlad iframe hos Beehiiv).
    for a in re.findall(r"<a\b[^>]*>", INDEX):
        if 'target="_top"' not in a:
            fel.append(f'länk utan target="_top": {a[:80]}')

    # 3. Båda knapparna pekar på rätt mailto.
    antal = INDEX.count(f'href="{MAILTO}"')
    if antal != 2:
        fel.append(f"väntade 2 mailto-länkar med rätt ämne, hittade {antal}")

    # 4. Inga vh-mått, ingen position:fixed (kontextdokumentet §4).
    if re.search(r"\d(vh|dvh|svh|lvh)\b", INDEX):
        fel.append("vh-mått i index.html")
    if re.search(r"position\s*:\s*fixed", INDEX):
        fel.append("position:fixed i index.html")

    # 5. Höjdsynken: samma source-sträng i sidan och lyssnaren, och ingen platshållare kvar.
    if "source: 'majposten-partner'" not in INDEX or "'majposten-partner'" not in EMBED:
        fel.append("source-strängen skiljer sig mellan index.html och beehiiv-embed.html")
    if "ANVANDARE" in EMBED:
        fel.append("beehiiv-embed.html har platshållaren ANVANDARE kvar")

    # 6. Beehiiv-simuleringen testar exakt den snippet som klistras in (med </script> skrivet som <\/script>).
    if EMBED.strip().replace("</script>", "<\\/script>") not in TESTSIDA:
        fel.append("docs/beehiivtest.html har inte samma embed-snippet som beehiiv-embed.html")

    return fel


if __name__ == "__main__":
    fel = kontroller()
    for f in fel:
        print("FEL:", f)
    print("OK" if not fel else f"{len(fel)} fel")
    sys.exit(1 if fel else 0)
