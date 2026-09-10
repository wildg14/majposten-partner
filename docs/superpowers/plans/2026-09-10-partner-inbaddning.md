# Partner-sidan: hosting och inbäddning, implementationsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hosta den färdiga `index.html` på GitHub Pages och leverera ett embed-block till Beehiiv-sidan majposten.se/partner, verifierat pixelvis mot designreferenserna.

**Architecture:** Statisk sida i publikt repo `wildg14/majposten-partner`, GitHub Pages från `main` utan byggsteg. Beehiiv-blocket är en iframe mot Pages-adressen plus en `postMessage`-lyssnare som sätter iframens höjd (metod A i specen). Två ändringar i `index.html` som inte påverkar utseendet: lokal logotyp och `target="_top"` på mejlknapparna.

**Tech Stack:** Ren HTML. Python 3 (stdlib) för textkontroller. Node + puppeteer-core mot installerad Chrome för skärmdumpar. Pillow för pixeljämförelse (finns i `/Users/daniel/code/Temp/.venv`). `gh` CLI för repo och Pages.

Spec: `docs/superpowers/specs/2026-09-10-partner-inbaddning-design.md`.

---

## Filstruktur

- `index.html` – sidan (levererad, ändras bara i två detaljer)
- `bilder/` – annonsbilder + `kvarteret-logo.png` (ny)
- `beehiiv-embed.html` – snippeten till Beehiiv, med riktig `src`
- `design/` – acceptansreferenser
- `tests/kontroll.py` – textnivåkontroller, stdlib, körs med `python3 tests/kontroll.py`
- `verktyg/skarmdump.js` – helsidesskärmdumpar vid 1100 och 390 px (puppeteer-core)
- `verktyg/jamfor.py` – pixeljämförelse mot `design/*.png`, skriver diffbild
- `verktyg/package.json` – `puppeteer-core`
- `.gitignore` – `.DS_Store`, `node_modules/`, `.venv/`, `ut/`
- `README.md` – handoff, uppdaterad med live-adresser och driftrutin

---

### Task 1: Repo och första commit

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Init och .gitignore**

```bash
cd /Users/daniel/code/Majposten-Partner
git init -b main
printf '.DS_Store\nnode_modules/\n.venv/\nut/\n' > .gitignore
```

- [ ] **Step 2: Commit levererade filer plus spec och plan**

```bash
git add .gitignore README.md beehiiv-egen-sida-kontext.md beehiiv-embed.html index.html bilder design docs
git commit -m "Partner-sidan som levererad från design, plus spec och plan"
```

Förväntat: `git status` ren, `.DS_Store` inte spårad.

---

### Task 2: Textkontroller (skrivs först, ska fela)

**Files:**
- Create: `tests/kontroll.py`

- [ ] **Step 1: Skriv kontrollskriptet**

```python
#!/usr/bin/env python3
"""Textnivåkontroller av Partner-sidan. Kör: python3 tests/kontroll.py. Exit 1 vid fel."""
import re
import sys
from pathlib import Path

ROT = Path(__file__).resolve().parents[1]
INDEX = (ROT / "index.html").read_text(encoding="utf-8")
EMBED = (ROT / "beehiiv-embed.html").read_text(encoding="utf-8")
MAILTO = "mailto:daniel@tvartom.win?subject=Partner%20i%20Majposten"


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
            fel.append(f"länk utan target=\"_top\": {a[:80]}")

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

    return fel


if __name__ == "__main__":
    fel = kontroller()
    for f in fel:
        print("FEL:", f)
    print("OK" if not fel else f"{len(fel)} fel")
    sys.exit(1 if fel else 0)
```

- [ ] **Step 2: Kör och verifiera att det felar på rätt saker**

Run: `python3 tests/kontroll.py`
Expected: exit 1 med fyra fel: `kvarteretmakleri.se`, två `extern bild`, två `länk utan target`, `ANVANDARE`.

- [ ] **Step 3: Commit**

```bash
git add tests/kontroll.py
git commit -m "Textkontroller: lokala bilder, target=_top, mailto, vh, höjdsynk"
```

---

### Task 3: Logotyp lokalt och target="_top"

**Files:**
- Create: `bilder/kvarteret-logo.png`
- Modify: `index.html` (två `<img src="https://www.kvarteretmakleri.se/logo-black.png"`, två `<a href="mailto:...`)
- Modify: `beehiiv-embed.html` (`ANVANDARE` → `wildg14`)

- [ ] **Step 1: Hämta logotypen och kontrollera filen**

```bash
curl -sSL -o bilder/kvarteret-logo.png https://www.kvarteretmakleri.se/logo-black.png
file bilder/kvarteret-logo.png
sips -g pixelWidth -g pixelHeight bilder/kvarteret-logo.png
```

Expected: `PNG image data`, rimliga mått (bred liggande logotyp).

- [ ] **Step 2: Byt referenserna och lägg target**

```bash
sed -i '' 's#https://www.kvarteretmakleri.se/logo-black.png#bilder/kvarteret-logo.png#g' index.html
sed -i '' 's#<a href="mailto:daniel@tvartom.win?subject=Partner%20i%20Majposten"#<a href="mailto:daniel@tvartom.win?subject=Partner%20i%20Majposten" target="_top"#g' index.html
sed -i '' 's#https://ANVANDARE.github.io/majposten-partner/#https://wildg14.github.io/majposten-partner/#' beehiiv-embed.html
grep -c 'bilder/kvarteret-logo.png' index.html   # 2
grep -c 'target="_top"' index.html                # 2
grep 'src=' beehiiv-embed.html
```

- [ ] **Step 3: Kör kontrollerna**

Run: `python3 tests/kontroll.py`
Expected: `OK`, exit 0.

- [ ] **Step 4: Commit**

```bash
git add bilder/kvarteret-logo.png index.html beehiiv-embed.html
git commit -m "Lokal logotyp, target=_top på mejlknapparna, riktig Pages-adress i snippeten"
```

---

### Task 4: Skärmdumpar och pixeljämförelse mot designen

**Files:**
- Create: `verktyg/package.json`, `verktyg/skarmdump.js`, `verktyg/jamfor.py`

- [ ] **Step 1: package.json och install**

```json
{
  "name": "verktyg",
  "private": true,
  "type": "commonjs",
  "description": "Skärmdumpar av Partner-sidan med den installerade Chrome. Kör: node skarmdump.js <url> <utmapp>",
  "dependencies": { "puppeteer-core": "^25.10.0" }
}
```

```bash
cd verktyg && npm install --no-audit --no-fund && cd ..
```

- [ ] **Step 2: Skärmdumpsskriptet**

```js
// Helsidesskärmdumpar vid 1100 px (desktop) och 390 px (mobil), DPR 1, samma mått som design/*.png.
// Kör: node verktyg/skarmdump.js http://127.0.0.1:8765/ ut
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const [url, ut] = process.argv.slice(2);
if (!url || !ut) { console.error('användning: node skarmdump.js <url> <utmapp>'); process.exit(2); }
fs.mkdirSync(ut, { recursive: true });
const vyer = [
  { namn: 'desktop', width: 1100, height: 900 },
  { namn: 'mobil', width: 390, height: 844 },
];
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true, args: ['--no-first-run', '--disable-gpu', '--hide-scrollbars'],
  });
  for (const v of vyer) {
    const page = await browser.newPage();
    await page.setViewport({ width: v.width, height: v.height, deviceScaleFactor: 1 });
    const fel = []; page.on('pageerror', e => fel.push(String(e))); page.on('console', m => { if (m.type() === 'error') fel.push(m.text()); });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 800));
    const m = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, sidled: document.documentElement.scrollWidth > innerWidth,
      knappar: [...document.querySelectorAll('a')].map(a => a.getAttribute('href') + ' ' + a.getAttribute('target')) }));
    await page.screenshot({ path: `${ut}/${v.namn}.png`, fullPage: true });
    console.log(v.namn, `${v.width}x${m.h}`, m.sidled ? 'SIDLEDSRULLNING' : 'ingen sidledsrullning', fel.length ? 'FEL: ' + fel.join(' | ') : 'inga konsolfel');
    console.log('  länkar:', m.knappar.join(' ; '));
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Jämförelseskriptet**

```python
#!/usr/bin/env python3
"""Pixeljämför en skärmdump mot designreferensen. Kör: python jamfor.py <skarmdump.png> <referens.png> <diff.png>
Kräver Pillow. Skriver andel avvikande pixlar och de radintervall där avvikelserna ligger."""
import sys
from PIL import Image, ImageChops

a = Image.open(sys.argv[1]).convert("RGB")
b = Image.open(sys.argv[2]).convert("RGB")
print(f"skärmdump {a.size}, referens {b.size}")
h = min(a.height, b.height)
w = min(a.width, b.width)
a2, b2 = a.crop((0, 0, w, h)), b.crop((0, 0, w, h))
diff = ImageChops.difference(a2, b2).convert("L").point(lambda p: 255 if p > 24 else 0)
avvik = sum(1 for p in diff.getdata() if p)
print(f"avvikande pixlar: {avvik} av {w*h} ({100*avvik/(w*h):.3f} %)")
rader = [y for y in range(h) if diff.crop((0, y, w, y + 1)).getbbox()]
band, start = [], None
for y in rader:
    if start is None: start = prev = y
    elif y == prev + 1: prev = y
    else: band.append((start, prev)); start = prev = y
if start is not None: band.append((start, prev))
for s, e in band[:40]:
    print(f"  rad {s}–{e}")
if len(band) > 40: print(f"  ... {len(band)-40} band till")
Image.merge("RGB", (diff, Image.new("L", diff.size, 0), Image.new("L", diff.size, 0))).save(sys.argv[3])
```

- [ ] **Step 4: Kör lokalt och jämför**

```bash
python3 -m http.server 8765 --bind 127.0.0.1 &   # i bakgrunden
node verktyg/skarmdump.js http://127.0.0.1:8765/ ut/lokalt
/Users/daniel/code/Temp/.venv/bin/python verktyg/jamfor.py ut/lokalt/desktop.png design/annonsera-desktop.png ut/lokalt/diff-desktop.png
/Users/daniel/code/Temp/.venv/bin/python verktyg/jamfor.py ut/lokalt/mobil.png design/annonsera-mobil.png ut/lokalt/diff-mobil.png
```

Expected: skärmdumparna är 1100×~8100 och 390×~9854, ingen sidledsrullning, inga konsolfel, avvikelserna ligger i logotypraderna (sektion 3, två ställen) och inget annat. Titta på diffbilderna med Read om det finns band utanför logotypen, och åtgärda innan vidare.

- [ ] **Step 5: Commit**

```bash
git add verktyg/package.json verktyg/skarmdump.js verktyg/jamfor.py
git commit -m "Verktyg: helsidesskärmdumpar och pixeljämförelse mot designen"
```

---

### Task 5: GitHub-repo och Pages

- [ ] **Step 1: Skapa repot och pusha**

```bash
gh repo create wildg14/majposten-partner --public --source . --remote origin --push \
  --description "Partnersidan för Majposten, hostad på GitHub Pages och inbäddad på majposten.se/partner"
```

- [ ] **Step 2: Slå på Pages från main, mappen /**

```bash
gh api -X POST repos/wildg14/majposten-partner/pages --input - <<'EOF'
{"build_type":"legacy","source":{"branch":"main","path":"/"}}
EOF
```

- [ ] **Step 3: Vänta på bygget och kontrollera**

```bash
for i in $(seq 1 30); do s=$(gh api repos/wildg14/majposten-partner/pages/builds/latest --jq .status); echo "$s"; [ "$s" = built ] && break; sleep 10; done
curl -sSI https://wildg14.github.io/majposten-partner/ | grep -iE 'HTTP|cache-control|content-type'
curl -sSI https://wildg14.github.io/majposten-partner/bilder/kvarteret-logo.png | head -1
```

Expected: `built`, `HTTP/2 200`, `cache-control: max-age=600`, logotypen 200.

- [ ] **Step 4: Skärmdumpar från Pages-adressen**

```bash
node verktyg/skarmdump.js https://wildg14.github.io/majposten-partner/ ut/pages
/Users/daniel/code/Temp/.venv/bin/python verktyg/jamfor.py ut/pages/desktop.png design/annonsera-desktop.png ut/pages/diff-desktop.png
/Users/daniel/code/Temp/.venv/bin/python verktyg/jamfor.py ut/pages/mobil.png design/annonsera-mobil.png ut/pages/diff-mobil.png
```

Expected: samma resultat som lokalt.

---

### Task 6: Beehiiv-sidans metadata

- [ ] **Step 1: Sätt titel och beskrivning via Beehiiv-kopplingen**

`edit_page` med `publication_id` `pub_ff2c721f-c214-4bd5-b1dd-faea67bc9edf`, `page_id` `e9bafa76-f34f-4503-b8fd-b63f5b7a8e33`, `metadata`:
`{"meta_title":"Annonsera i Majposten","meta_description":"Nå hushållen mellan älven och Slottsskogen. Varje torsdag. Fyra partnerplatser för verksamheter i Majorna."}`

`noindex_enabled` lämnas på tills sidan är verifierad live.

- [ ] **Step 2: Läs tillbaka med `get_page` och kontrollera fälten.**

---

### Task 7: README och överlämning

**Files:**
- Modify: `README.md` (lägg ett avsnitt "Läge" överst med adresser, driftrutin och Daniels manuella steg)

- [ ] **Step 1: Skriv avsnittet**

Överst i README, efter rubriken:

```markdown
## Läge 2026-09-10

- Hostad på `https://wildg14.github.io/majposten-partner/` (GitHub Pages från `main`, mappen `/`).
- Inbäddad på majposten.se/partner med `beehiiv-embed.html` (iframe plus höjdsynk, metod A i
  `docs/superpowers/specs/2026-09-10-partner-inbaddning-design.md`).
- Kontroller: `python3 tests/kontroll.py` (text) och `node verktyg/skarmdump.js <url> ut` plus
  `verktyg/jamfor.py` (pixeljämförelse mot `design/`). Se planen i `docs/superpowers/plans/`.
- Uppdatering: commit, push, vänta på Pages (status i `gh api repos/wildg14/majposten-partner/pages/builds/latest`),
  bumpa `?v=` i iframens `src` på Beehiiv om ändringen ska synas direkt (annars upp till tio minuters cache).
```

- [ ] **Step 2: Kör kontrollerna, commit, push**

```bash
python3 tests/kontroll.py
git add README.md
git commit -m "README: läge, adresser och driftrutin"
git push
```

- [ ] **Step 3: Överlämning till Daniel**

Ge snippeten ur `beehiiv-embed.html` i ett kodblock och stegen: HTML-block på sidan Partner, sektionens bakgrund `#FAF6EE`, padding 0 på desktop och mobil, kontrollera i Preview, publicera. Efter det: verifiera live vid 1100 och 390 px, att höjden följer med, att knapparna öppnar mejl, och stäng av `noindex`.
