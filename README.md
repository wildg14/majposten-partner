# Handoff: Partner-sidan (majposten.se/partner)

## Läge 2026-09-10

- **Hostad på** `https://wildg14.github.io/majposten-partner/` (publikt repo `wildg14/majposten-partner`,
  GitHub Pages från `main`, mappen `/`, inget byggsteg).
- **Inbäddad på** majposten.se/partner med `beehiiv-embed.html`: en iframe mot Pages-adressen plus en
  lyssnare som sätter iframens höjd. Beslut och mätningar i
  `docs/superpowers/specs/2026-09-10-partner-inbaddning-design.md`.
- **Ändrat mot leveransen**, inget som påverkar utseendet: logotypen ligger lokalt i `bilder/kvarteret-logo.png`,
  de två mejlknapparna har `target="_top"`, höjdskriptet mäter `body.offsetHeight` (se nedan) och snippeten
  knuffar Beehiivs egen höjdmätning efter varje ändring.
- **Verifierat**: sidan på Pages-adressen renderar identiskt med `design/annonsera-desktop.png` och
  `design/annonsera-mobil.png` så när som på delpixel-drift i textrader, ett fåtal radbrytningar som
  referensrenderaren gjorde annorlunda (den bröt bland annat rubriker så att de överlappade texten under,
  vilket ingen webbläsare gör med den här HTML:en) och omskalade jpg-bilder. Höjdsynken verifierad i en
  simulering av Beehiivs srcdoc-block vid 1100 och 390 px.
- **Kontroller**: `python3 tests/kontroll.py` (textnivå, stdlib). `node verktyg/skarmdump.js <url> ut` tar
  helsidesskärmdumpar och `verktyg/jamfor.py` jämför dem mot `design/` (kräver Pillow).
  `node verktyg/beehiiv-check.js http://127.0.0.1:8766/docs/beehiivtest.html` kontrollerar höjdsynken i
  simuleringen. Lokal server: `python3 -m http.server 8766 --bind 127.0.0.1`. `npm install` i `verktyg/` först.
- **Uppdatering**: commit, push, vänta tills `gh api repos/wildg14/majposten-partner/pages/builds/latest`
  säger `built`. Webbläsare kan hålla kvar gammal version i upp till tio minuter (`cache-control: max-age=600`);
  bumpa `?v=` i iframens `src` på Beehiiv om ändringen ska synas direkt.

## Vad det här är

En **färdig statisk sida**, inte en prototyp. `index.html` är produktionsfilen: ren HTML med inline-CSS, systemtypsnitt (Georgia, Arial), inga skript utöver höjdsynken, inga externa resurser utöver en logotyp som ska hämtas hem (se uppgift 2). Den ska hostas som den är på GitHub Pages och bäddas in på Beehiiv-sidan "Partner", samma grepp som redan används för majposten.se/val2026.

**Fidelity: hifi, slutgiltig.** Copy, färger, mått och ordning är beslutade och ska inte ändras. Uppgiften är hosting och inbäddning, inte design.

## Uppgifter

1. **Skapa ett publikt repo**, förslag `majposten-partner`. Lägg in `index.html` och `bilder/` i roten. Aktivera GitHub Pages från `main`, mappen `/`. Inget byggsteg, inget ramverk.
2. **Hämta hem Kvarteret Mäkleris logotyp.** `index.html` laddar den två gånger från `https://www.kvarteretmakleri.se/logo-black.png`. Ladda ner filen till `bilder/kvarteret-logo.png` och byt båda referenserna (sök på `kvarteretmakleri.se`). Sidan ska inte bero på deras server.
3. **Verifiera på Pages-adressen** vid 1100 px och 390 px mot `design/annonsera-desktop.png` och `design/annonsera-mobil.png`. Sidorna ska vara identiska så när som på logotypen. Kontrollera att båda knapparna öppnar `mailto:daniel@majposten.se?subject=Partner%20i%20Majposten`.
4. **Bädda in på Beehiiv.** Öppna sidan "Partner" i Beehiivs sidbyggare, ta bort allt som ligger där (byggt av deras AI, ska inte behållas), lägg ett HTML-/embed-block och klistra in `beehiiv-embed.html` med rätt `src`. Om val2026-blocket använder en annan metod än iframe + script, följ den metoden i stället.
5. **Sätt Beehiiv-sidans bakgrund** (sektionen som håller blocket) till `#FAF6EE` och ta bort sektionens egen padding, så att skarven mot iframen inte syns. Beehiivs navigation och sidfot ska ligga kvar runt sidan; `index.html` har ingen egen header eller footer.
6. **Vid framtida uppdateringar:** commit, vänta på Pages-deploy, bumpa `?v=` i iframens `src` så att cachen släpper.

## Filer

- `index.html` — sidan. Inline-styling rakt igenom, ett litet skript sist i `<body>` som rapporterar dokumenthöjden till föräldrasidan.
- `bilder/kvarteret-mobil-med-bilder.jpg` (878×1260), `kvarteret-mobil-utan-bilder.jpg` (878×1260), `kvarteret-webb-dator.jpg` (1600×1302) — exempelannonserna i sektion 5.
- `beehiiv-embed.html` — iframen och lyssnaren som klistras in på Beehiiv.
- `design/annonsera-desktop.png` (1100 px), `design/annonsera-mobil.png` (390 px) — acceptansreferens, det här ska den deployade sidan se ut som.

## Så funkar höjdsynken

Sidan i iframen kan inte påverka iframens höjd själv. Skriptet i `index.html` skickar därför `{ source: 'majposten-partner', height }` med `postMessage` till föräldrasidan vid load, resize och varje gång `body` ändrar höjd (ResizeObserver). Höjden är `body.offsetHeight`, inte `documentElement.scrollHeight`: den senare är aldrig mindre än iframens egen höjd, så iframen hade kunnat växa men aldrig krympa. Lyssnaren i `beehiiv-embed.html` sätter iframens höjd till det värdet och knuffar sedan Beehiivs egen mätning (Beehiiv mäter sitt srcdoc-block vid DOMContentLoaded, resize och childList-mutationer, inte vid attributändringar) genom att lägga till och ta bort en tom textnod och skicka ett resize-event. När sidan ligger i en iframe stänger den av sin egen scroll, så att det aldrig blir dubbla rullister. Öppnas `index.html` direkt (inte inbäddad) beter den sig som en vanlig sida.

Origin är `'*'` eftersom meddelandet bara innehåller ett heltal. Lyssnaren filtrerar på `source`.

## Om Beehiiv tar bort `<script>` i blocket

Kontrollera först hur val2026 gör, den lösningen gäller. Går inte script att köra alls finns två vägar:

- **Fast höjd.** Behåll iframen med `height` satt till mobilhöjden (cirka 9 900 px) så att inget klipps på mobil. På desktop blir det då tomrum under sidan. Fungerar, men är fult.
- **Egen adress i stället för inbäddning.** Peka `partner.majposten.se` (CNAME) på GitHub Pages och lägg en redirect i Beehiiv från `/partner` dit. Då behöver `index.html` en enkel header (Majposten-wordmark i Georgia 22 px, länk till majposten.se) och en sidfot, eftersom Beehiivs ram försvinner. Säg till designsidan innan detta byggs, så levereras header och sidfot i samma formspråk.

## Designtokens (för framtida ändringar, inte för den här uppgiften)

- Papper `#FAF6EE` (sidbakgrund) · Papper mörk `#F3EDE0` (sektion 3 och 5) · Sand `#EBE4D6` (faktarutor, annonsblock i miniatyren)
- Bläck `#2A241E` · Brödtext `#4A4038` · Sten `#6E6152`
- Grön `#3F5A3A` (etiketter, linjer, länkar) · Mörk grön `#2E4A2C` (fyllda ytor, knappar, stora tal) · Ljusgrön `#DCE4D3` med text `#33502F`
- Linje `#E6DECF` · Ram `#DCD3C0` · Platshållare `#A89F91`
- Typografi: etikett Arial 11 px fet, spärr 2 px, versaler · H1 Georgia fet 42/32 px · H2 Georgia fet 30/26 px · ingress Georgia kursiv 18 px · brödtext Arial 16 px, radavstånd 1.6 · liten text Arial 13 px · stora tal Georgia 28 px
- Kolumn max 620 px, 20 px sidopadding. Inga radier, inga skuggor, inga gradienter, inga ikoner.

## Beehiiv-sidans metadata

Sidan i iframen ger ingen SEO av sig själv. Sätt på Beehiiv-sidan "Partner":
- Titel: `Annonsera i Majposten`
- Beskrivning: `Nå hushållen mellan älven och Slottsskogen. Varje torsdag. Fyra partnerplatser för verksamheter i Majorna.`

Detta kan designsidan sätta direkt via Beehiiv-kopplingen när publikations-id:t finns.
