# Partner-sidan: hosting och inbäddning (design)

Datum: 2026-09-10. Beslutat i samtal med Daniel.

## Mål

`index.html` (färdig, låst design) ska visas på majposten.se/partner inuti Beehiivs
sida, med Beehiivs meny och sidfot runt om, identisk med `design/annonsera-desktop.png`
(1100 px) och `design/annonsera-mobil.png` (390 px) så när som på Kvarteret Mäkleris logotyp.

## Metod: A, iframe mot GitHub Pages med höjdsynk

- Sidan hostas orörd på GitHub Pages: publikt repo `wildg14/majposten-partner`, Pages från
  `main`, mappen `/`, inget byggsteg. Adress `https://wildg14.github.io/majposten-partner/`.
- På Beehiiv-sidan "Partner" (id `e9bafa76-f34f-4503-b8fd-b63f5b7a8e33`, redan tom) läggs
  ett HTML-block med innehållet i `beehiiv-embed.html`: en `<iframe>` mot Pages-adressen
  plus en lyssnare som sätter iframens höjd från `postMessage`.
- Beehiiv lägger blocket i en `<iframe srcdoc>` utan sandbox (uppmätt på val2026). Vår
  iframe blir alltså nästlad; lyssnaren bor i srcdoc-fönstret, som är `parent` för vår
  iframe. Beehiivs srcdoc-iframe växer själv med innehållet.
- Fallback om Beehiiv skulle strippa nästlade iframes: val2026-metoden (div + script som
  injicerar markupen). Byggs bara om A faller i test.

Valet av A framför val2026-metoden: sidan är statisk, designen är låst, och en korsdomän-
iframe ger total CSS-isolering, så verifieringen mot PNG:erna kan göras direkt på
Pages-adressen. Script körs i Beehiivs sajtbyggare (verifierat på val2026).

## Ändringar i `index.html`

Bara sådant som inte påverkar utseendet:

1. Logotypen hämtas hem till `bilder/kvarteret-logo.png`; båda referenserna till
   `kvarteretmakleri.se` byts. Sidan ska inte bero på deras server.
2. `target="_top"` på de två `mailto:`-länkarna (kontextdokumentet §3.1). Utan det kan ett
   klick i en nästlad iframe se ut som att inget händer.

## Uppmätt på Beehiiv (majposten.se/val2026, 2026-09-10)

| Fönster | Blockets bredd | Sektionspadding |
|---|---|---|
| 1100 px | 1060 px | 40 px |
| 390 px | 358 px | 16 px (mobil, egen inställning) |

Med sektionens padding satt till 0 på både desktop och mobil blir blocket 390 px på mobil.
Sidans `vw`-mått i `clamp()` når sitt tak vid cirka 890 px, så 1060 px renderar som 1100.

## Höjdsynken, uppmätt och justerad 2026-09-10

Beehiivs srcdoc-dokument (uppmätt på majposten.se/val2026) laddar Tailwind-preflight (marginal och
padding 0 på allt, så vår iframe får blockets hela bredd) och skickar `body.scrollHeight` till
föräldern vid `DOMContentLoaded`, `resize`, `input`, `change` och childList-mutationer. Ingen
ResizeObserver, inga attributmutationer. Två följder som rättats:

1. `index.html` mäter `body.offsetHeight`. Det levererade `documentElement.scrollHeight` är aldrig
   mindre än iframens egen höjd, så iframen kunde växa men aldrig krympa (desktop hade fastnat på
   start-höjden 8200 med 8120 px innehåll).
2. Snippeten knuffar Beehiivs mätning efter varje höjdändring: en tom textnod läggs till och tas
   bort (childList-mutation) och ett `resize`-event skickas. Utan det hade blocket stannat på den
   höjd Beehiiv mätte vid `DOMContentLoaded` och klippt sidan på mobil.

`docs/beehiivtest.html` speglar mekanismen exakt och `verktyg/beehiiv-check.js` verifierar att
blocket följer sidan (8120 px vid 1100, 9901 px vid 390). `tests/kontroll.py` vaktar att
simuleringen kör samma snippet som `beehiiv-embed.html`.

## Manuella steg på Beehiiv (Daniel)

1. Öppna sidan Partner i sidbyggaren, lägg ett HTML-block, klistra in `beehiiv-embed.html`.
2. Sektionen som håller blocket: bakgrund `#FAF6EE`, padding 0 på desktop och mobil.
3. Kontrollera i Preview, publicera.

Titel och beskrivning sätts via Beehiiv-kopplingen (README:ns texter). `noindex` stängs av
när sidan är verifierad live.

## Verifiering

- Textnivå (`tests/`): inga referenser till `kvarteretmakleri.se`, alla `<a>` har
  `target="_top"`, inga `vh`-mått, ingen `position:fixed`, alla bildfiler finns, samma
  `source`-sträng i `index.html` och `beehiiv-embed.html`, båda knapparna har rätt `mailto:`.
- Webbläsarnivå: Chrome headless-skärmdumpar vid 1100 och 390 px av den lokala sidan och av
  Pages-adressen, jämförda pixelvis mot `design/*.png`.
- Live: efter Daniels inklistring, kontroll på majposten.se/partner vid 1100 och 390 px,
  att höjden följer med och att knapparna öppnar `mailto:daniel@tvartom.win?subject=Partner%20i%20Majposten`.

## Uppdateringar framöver

Commit, vänta på Pages-deploy (upp till tio minuters webbläsarcache), bumpa `?v=` i iframens
`src` på Beehiiv om ändringen ska slå igenom direkt.
