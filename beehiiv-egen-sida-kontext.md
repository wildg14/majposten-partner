# Egen sida hostad utanför Beehiiv, inbäddad i Beehiiv

Kontext för en ny session. Skriven 2026-09-10 av den session som byggde en interaktiv grafik åt
nyhetsbrevet Majposten på det här sättet, och som fick lära sig det mesta av det nedanstående genom att
mäta i stället för att läsa dokumentation.

**Det här dokumentet handlar inte om den grafiken.** Det handlar om plattformen: vad Beehiiv går med på,
vad GitHub Pages gör, och vilken form en sådan lösning behöver ha. Allt valspecifikt är borttaget.

Två saker att veta om tillförlitligheten:

- **Tal och beteenden märkta "uppmätt" är mätta av oss**, på en riktig publicerad Beehiiv-sida, med datum.
  De är inte hämtade ur Beehiivs dokumentation, som på flera punkter är tystare än verkligheten.
- **Beehiiv ändrar sin produkt.** Kontrollera det som är avgörande för just ditt bygge innan du litar på
  det. Sista avsnittet säger vad som är värt att mäta om.

---

## 1. Den korta versionen

Det fungerar, och så här ser lösningen ut:

1. Sidan är **statiska filer** - en JS-fil, en CSS-fil och en datamapp - på valfri statisk HTTPS-host.
2. På Beehiiv lägger du **ett HTML-block** i sajtbyggaren som består av en container-div plus en `<link>`
   och en `<script src>` som pekar på hosten.
3. Beehiiv kör skriptet, men **inuti en `<iframe srcdoc>`**. Det är den enskilt viktigaste tekniska
   omständigheten och orsaken till nästan allt som är udda nedan.
4. Uppdateringar är `git push`. Beehiiv-sidan behöver aldrig röras igen.

Läsaren ser Beehiivs meny, sidfot, prenumerationsblock och statistik runt omkring. Hostens adress syns
aldrig.

---

## 2. Var Beehiiv kör script, och var det inte gör det

| Var | Script | Vad du kan göra |
|---|---|---|
| **Sajtbyggaren, custom page** | Ja, i Preview och Live | Full interaktiv sida |
| **Sajtbyggaren, i redigeringsvyn** | Nej | Blocket ser tomt ut medan du bygger. Det är väntat |
| **Inlägg (posts)** | Nej | HTML-snippeten sparar varken `<script>` eller `<style>` |
| **Mejl** | Nej | Mejlklienter döljer iframe, video och script på alla planer |

**Konsekvens för mejlet:** allt interaktivt måste ha en stillbildsversion. Mönstret som fungerade var ett
Image-block med riktig alt-text, länkat till sidan, och en Button-block under. Ge bild och knapp olika
`utm_content` så går det att se vilken som drev trafiken.

Gmail klipper mejl som är över 102 kB HTML. Det gäller mejlet, inte den hostade sidan. (Det talet och byggränsen i avsnitt 6 är allmänt kända, men till skillnad från de mätta talen i det här dokumentet har vi inte verifierat dem själva.)

Källor för tabellen: Beehiivs supportartiklar "Using HTML in the Website Builder", "Using HTML in beehiiv
posts", "Adding thumbnails, images, and GIFs to your posts" och "Using UTM parameter tracking with
beehiiv", lästa sommaren 2026, plus egen verifiering i Preview och Live.

Planen spelar roll för vad som finns i sajtbyggaren. Vår verifiering gjordes på **Scale-planen**. Har du
en lägre plan: kontrollera att Advanced blocks och custom pages finns innan du bygger något.

---

## 3. Iframen: det du måste designa runt

**Uppmätt på en publicerad sida 2026-09-05.** Beehiiv lägger HTML-blocket i en `<iframe srcdoc>` med
**samma ursprung** som sidan, bredd 100 procent, och höjd som följer innehållet - blocket växer och
krymper fritt när innehållet ändras. Iframen har **ingen `sandbox`**.

Fem följder, i fallande ordning av hur mycket de kostar att upptäcka själv:

### 3.1 Länkar behöver `target="_top"`

Utan det byter en länk ut din sida mot målsidan **inuti iframen**. I praktiken ser det ut som att
ingenting händer vid klick. Eftersom iframen saknar `sandbox` fungerar `_top` och tar hela fönstret till
målet. Utanför en iframe beter sig `_top` som ett vanligt klick, så det kostar ingenting att alltid ha
det.

Lägg målet i **en konstant** och bygg alla länkar genom en hjälpfunktion, så att ett test kan vakta att
ingen länk byggs utan det. Vi missade en enda länk och det tog en stund att förstå varför den var död.

### 3.2 Adressen i webbläsaren är inte din

Iframens egen adress är `about:srcdoc` och har ingen query. `location.search` är alltså **tom**, oavsett
vad som står i adressfältet. Djuplänkar som `dinsida.se/nagot?id=123` når aldrig ditt skript direkt.

Lösningen, som fungerar eftersom ursprunget är detsamma: läs och skriv mot `window.parent.location`,
med fallback till `location` när föräldern inte går att nå.

```js
function sidLocation() {
  // Läs .href inuti try: det är åtkomsten som kastar vid korsdomän, inte att hämta location.
  try { if (window.parent !== window && window.parent.location.href !== undefined) return window.parent.location; }
  catch (e) { /* korsdomän: egen adress gäller */ }
  return location;
}
// Härled history ur sidLocation, annars kan de två peka på olika fönster.
function sidHistory() { return sidLocation() === location ? history : window.parent.history; }
```

Den här formen är i drift. Två detaljer som är lätta att tappa: `window.parent !== window` gör att koden
inte sträcker sig efter en förälder som inte finns, och `.href !== undefined` är det som faktiskt utlöser
korsdomänfelet - att bara hämta `window.parent.location` kastar inte.

`parent.history.replaceState` fungerar, så du kan skriva tillbaka tillstånd i adressen och få delbara
länkar. Kontrollera att du inte skriver sönder värdsidans egna parametrar - behåll dem du inte äger,
till exempel `utm_*`.

### 3.3 `position: sticky` är verkningslöst

Inget rullar inuti iframen - den är exakt så hög som innehållet. Ett klibbigt element följer alltså inte
med när läsaren rullar sidan. Det finns ingen lösning inifrån: `position: fixed` är förbjudet av Beehiiv
och skulle ändå bara vara fixed relativt iframen.

Vi accepterade det för ett element och löste ett annat fall genom att **upprepa** kontrollen (en
årväljare) i varje sektion som behövde den, alla synkade. Om din design bygger på något klibbigt: räkna
med att designa om det.

### 3.4 Värdens meny ligger över din sida vid rullning

Beehiivs sidmeny är klibbig och **89 px hög** (uppmätt 2026-09-05, kontrollera din egen mall). Rullar du
till ett element inuti iframen hamnar dess överkant under menyn.

Lägg menyhöjden plus marginal i en konfignyckel och använd den som `scroll-margin-top`. Vi använder 105.

### 3.5 Höjden sköter Beehiiv, men mät att den följer med

Iframen växer med innehållet. Det fungerade i alla lägen vi provade, även när ett stort block fälldes ut.
Men det är värt en kontroll i din egen uppsättning: om höjden fastnar syns bara toppen av din sida.

---

## 4. Reglerna för själva HTML-blocket

Blocket ser ut så här. En container, en stilmall, ett skript:

```html
<div class="min-app" id="app" data-bas="https://<host>/<projekt>/">
  <link rel="stylesheet" href="https://<host>/<projekt>/app.css">
  <script src="https://<host>/<projekt>/app.js"></script>
</div>
```

`data-bas` säger var datafilerna ligger. Skriptet läser **i första hand `data-bas`** på containern och
faller tillbaka på sin egen adress (`document.currentScript.src`) när attributet saknas - i den
ordningen, så att du kan peka om datamappen från blocket utan att röra koden. Containern hittas på samma
sätt: `document.currentScript.closest(".min-app")`, med en sökning på klassnamnet som reserv.

**Regler som bygget måste följa**, och som är värda att lägga i ett test från dag ett:

- **All CSS scopad till containerklassen.** Varje selektor börjar med `.min-app`. Ingen selektor på
  `html`, `body`, `:root` eller `*`.
- **Inga `vh`-mått.** Höjden inuti iframen betyder inte vad du tror.
- **Ingen `position: fixed`.**
- **Rör inte `document`** annat än för att bygga noder. Vi håller en uttrycklig tillåtlista och lät
  testet falla på allt utanför den. Vår lista blev: `currentScript`, `createElement`, `createElementNS`,
  `createTextNode`, `head`, `getElementsByClassName`. Att inte kunna läsa `document.activeElement`
  påverkade en fokuslösning - då byggde vi om lösningen i stället för att utöka listan. Utöka den
  medvetet och skriv i testet varför.
- **Regler inne i `@container` kan aldrig träffa containern själv**, bara dess barn.

Ett litet lint-test som läser CSS:en som text och parsar ut selektorerna räckte för att fånga allt det
här. Det var en av de mest lönsamma hundra raderna i projektet.

---

## 5. Layout: container queries, inte media queries

**Du vet inte hur bred Beehiivs sektion är.** Den beror på mallen, på om sidan har sidokolumn, och på
läsarens fönster. Media queries mäter fönstret och ger fel svar.

Använd `@container` och sätt `container-type: inline-size` på containern. Då mäter brytpunkterna det
utrymme din sida faktiskt har.

Samma sak gäller inuti sidan: har du en ruta som ligger i en högerspalt på desktop är rutans egen bredd
en helt annan än sidans. Vi hade en text som skulle döljas när den inte fick plats och satte först
brytpunkten mot sidans bredd - fel. Rutan är 288 px på en telefon men 376 px i högerspalten på en bred
sida. Rätt svar var `container-type: inline-size` på rutan och en fråga mot dess innehållsbredd.

**Mät brytpunkterna, välj dem inte.** Varje brytpunkt vi gissade blev fel och fick mätas om. Skriv det
uppmätta talet i en kommentar bredvid, annars "förenklar" någon det senare.

---

## 6. Hosting

GitHub Pages fungerade utan invändningar: gratis, HTTPS, statiskt, ingen byggkedja, deploy är `git push`.
Cloudflare Pages, Netlify och Vercel duger lika bra. Kravet är **HTTPS** - Beehiiv-sidan är https, så en
http-host blir blockerad av webbläsaren.

Adressen syns aldrig för läsaren, så en standardadress som `<konto>.github.io/<repo>/` duger.

### Uppmätta headers (GitHub Pages, 2026-09-10)

```
cache-control: max-age=600
access-control-allow-origin: *
etag: "..."
age: 0
```

Tre följder:

1. **`max-age=600` gäller din kod.** Efter en push håller läsarens webbläsare kvar den gamla JS- och
   CSS-filen i upp till tio minuter. En vanlig omladdning räcker inte när du kontrollerar en ändring -
   använd hård omladdning eller ett privat fönster. Och räkna med att läsare kör gammal kod en stund
   efter varje deploy. Har du ett tidskritiskt läge: gör kodpushar i förväg, inte under tiden.
2. **`access-control-allow-origin: *`** betyder att sidan får hämta om sina datafiler från Beehiiv-sidan.
   Det gör pollning och uppdatering utan omladdning möjlig.
3. **`age: 0` efter varje bygge** betyder att Pages tömmer sin egen kantcache vid deploy. Det är
   läsarens webbläsarcache som är kvar att hantera, och en fråga i adressen (`?v=<tid>`) räcker mot den.

**GitHub Pages har en mjuk gräns på cirka tio bygg i timmen** (GitHubs egen dokumenterade gräns, inte något vi mätt). Pushar du tätare landar allt i git, men
sidan uppdateras inte förrän nästa bygge går igenom. Det märks inte i vanlig drift men blir viktigt om du
någon gång vill uppdatera ofta.

**Riktig push (WebSocket, server-sent events) går inte** på statisk hosting. Behöver du liveuppdatering
är pollning vägen, och headerna ovan säger att den är framkomlig.

---

## 7. Byggmönster som var värda besväret

### 7.1 Data som `.js` bredvid `.json`

Skriv varje datafil i två former: `data.json` och en identisk `data.js` som bara är
`window.DATA = {...}`. Sidan laddar `.js` med en `<script>`-tagg.

Vinsten: **ingen fetch, ingen CORS, och sidan fungerar via `file://`** - alltså lokalt, i skärmdumpsläge
och i vilken värd som helst. Risken är att de två filerna glider isär, så låt **samma funktion** skriva
båda och ha ett kontrollskript som jämför dem.

### 7.2 Konfig i en datafil, inte i koden

Allt redaktionellt - rubriker, adresser, vilka block som visas, brytpunktsvärden som värden kan behöva
ändra - i en `konfig.json` som laddas som data. Då kräver en textändring ingen kodändring, och den slår
igenom utan att träffa kodens tio minuters cache.

### 7.3 Ett tunt skal för lokalt arbete

`index.html` innehåller **inte** sidan. Den är ett tomt skal med containern, `<link>` och `<script>` -
alltså exakt samma sak som Beehiiv-blocket. Sidans markup ligger i JS-filen som en sträng.

Det gör att du utvecklar mot samma uppsättning som produktionen, och att skalet kan användas för
skärmdumpar och stillbilder.

### 7.4 Defensiv grundstil

Värdsidan har egna globala regler som kommer att träffa din sida. Sätt uttryckligen färg, typsnitt,
radhöjd, `box-sizing`, `transform` och länkstil på din container och dess barn, i stället för att anta
att du ärver något vettigt.

### 7.5 Två simuleringssidor, lokalt

De här två gav mest utdelning av allt i projektet:

- **En fientlig värdsida.** En HTML-fil med avsiktligt aggressiv CSS - andra typsnitt, en Tailwind-liknande
  reset, egna knappstilar - som laddar ditt block. Verifierar att ingenting läcker in eller ut.
- **En Beehiiv-simulering.** En HTML-fil med en klibbig meny i rätt höjd och ditt block i en
  `<iframe srcdoc>` vars höjd sätts av en `ResizeObserver`. Där testar du djuplänkar, rullning under
  menyn, `target="_top"` och att höjden följer med - allt det som annars bara går att upptäcka i skarpt
  läge.

Skriv dem tidigt. Vi byggde Beehiiv-simuleringen sent och fick då rätta flera saker på en gång.

### 7.6 Stillbilder renderade ur sidan

Eftersom mejlet inte kan visa något interaktivt behövs bilder. Rendera dem **ur samma sida** med Chrome
headless mot ett bildläge (`index.html?bild=<typ>`), i de format du behöver, med 2x upplösning. Skriv
alt-texten ur samma data som bilden ritas ur.

En fälla vi gick i: låt sidan **kvittera vad den faktiskt renderade** (till exempel ett `data-`attribut på
bildramen) och läs det innan du sparar bilden. Annars kan filnamn och alt-text beskriva en sak medan
bilden visar en annan, och exporten avslutar med OK.

### 7.7 Ladda lat

Hämta bara det förstaintrycket behöver. Allt annat - nästa vy, nästa dataset, tunga lager - laddas när
läsaren efterfrågar det, och varje sådan hämtning cachas så den inte görs om. Hos oss var skillnaden
488 kB mot 576 kB vid start, och mönstret är detsamma oavsett vad sidan innehåller.

En fallgrop som kostade oss: det som laddas lat finns **inte** i minnet när annan kod förväntar sig det.
Vi hade en rad som slog upp data i ett dataset som ännu inte var hämtat, och den blev tyst tom i just det
läge där den behövdes mest. Tänk igenom vad som gäller vid *första* renderingen, inte bara efter att
läsaren klickat runt.

### 7.8 Tillgänglighet, det vi lärde oss på det hårda sättet

Fem saker som är allmängiltiga och som alla kostade oss en rättning:

- **Bygger du om en del av DOM:en** - sortering, filtrering, val - försvinner elementet som hade fokus,
  och fokus faller till sidans början. Kom ihåg vilken kontroll läsaren använde och sätt tillbaka fokus
  på motsvarande nod efter omritningen, med `preventScroll` så sidan inte hoppar.
- **Egna knapp- och flikgrupper** behöver piltangentnavigering och roving tabindex.
- **Statusrader och felmeddelanden** ska ligga i markupen från början som en tom `role="status"`. En
  levande region som skapas först när felet inträffar hinner inte bli levande och läses aldrig upp.
- **Föredra native formulärelement.** Vi bytte en egen knapprad mot en `<select>` just för att den är
  tillgänglig utan att vi bygger något.
- **Respektera `prefers-reduced-motion`** innan något animerar av sig självt.

### 7.9 Delning: og-taggarna i ditt skal är inte de som gäller

Ditt `index.html` på hosten kan ha aldrig så fina og-taggar - de syns bara om någon delar **den**
adressen. I normalfallet delar läsaren Beehiiv-sidan, och då är det **Beehiivs egna SEO-fält i
sajtbyggaren** som avgör länkkortet. Sätt dem där. Facebook och liknande cachar dessutom kortet, så en
ändring kan dröja eller behöva rensas hos dem.

### 7.10 Testa sidan som text, och i en riktig webbläsare

Två sorters kontroller, båda behövdes:

- **Textnivå** (snabbt, körs alltid): lint mot värdens regler, att namn som ska vara borta är borta, att
  konstanter finns där de ska.
- **Webbläsarnivå** (långsamt, körs före publicering): att sidan renderar, att klick fungerar, att inget
  hamnar utanför i smala bredder, och att inga konsolfel finns.

Det finns en klass av fel som **bara** webbläsarkontrollen hittar. Vår dyraste bugg var att en rad blev
tom i ett visst laddningsläge; textsökningar i källkoden kunde omöjligt se det. Mät sidledsrullning genom
att jämföra `document.documentElement.scrollWidth` mot `window.innerWidth` - och gör det **utan**
mobilemulering, för med emulering blir de två lika och rullningen syns inte alls.

---

## 8. Fällor, i den ordning de kostade tid

1. **Länk utan `target="_top"`.** Ser ut som att klicket inte registreras.
2. **Query-parametrar som aldrig kommer fram.** `location.search` är tom i iframen.
3. **Klibbiga element som inte klibbar.** Designa om, det finns ingen väg runt.
4. **Element som hamnar under värdens meny** vid rullning till ankare.
5. **Brytpunkter satta mot fönstret** i stället för mot containern.
6. **En brytpunkt satt mot sidans bredd** när det som skulle mätas var ett innerelements bredd.
7. **Gammal kod i läsarens webbläsare** i tio minuter efter deploy, vilket får en rättning att se ut som
   att den inte fungerade.
8. **Kopior av källfilerna** i testuppsättningar som inte byggdes om, så att kontrollerna granskade gammal
   kod och blev gröna på fel grund.
9. **Nollor och tomma värden som fylls i automatiskt.** Om din data saknar ett värde: visa ingenting, inte
   noll. Ett `|| 0` på fel ställe skapar ett tal som ser äkta ut. Det här drabbade oss två gånger.
10. **Absoluta sökvägar i tester och skript.** Vi har ett fyrtiotal rader som pekar på projektmappen med
    full sökväg. Döper du om mappen slutar de fungera - och det värsta är att tester som hoppar över sig
    själva när en fil saknas då blir **gröna på fel grund** i stället för att fela. Använd sökvägar
    relativa till filen (`Path(__file__).resolve().parents[1]`) och låt ett överhoppat test skriva ut
    varför.

---

## 9. Vad du bör mäta själv innan du bygger

Beehiiv ändrar sin produkt, och din publikation kan ha en annan mall och plan. En halvtimme här sparar
dagar senare. Gör det med ett minimalt block - en div, en `<script>` som skriver ut lite diagnostik - och
publicera det på en opublicerad testsida:

```js
// Klistra in i ditt testblock och läs utskriften i konsolen.
const iIframe = window.parent !== window;
let vardAdress = "(nås inte)";
try { vardAdress = window.parent.location.href; } catch (e) {}
console.log({
  iIframe,
  egenAdress: location.href,          // väntat: about:srcdoc
  vardAdress,                         // väntat: din riktiga sidadress
  sammaUrsprung: vardAdress !== "(nås inte)",
  sandbox: (() => { try { return frameElement && frameElement.getAttribute("sandbox"); }
                    catch (e) { return "(nås inte - annat ursprung)"; } })(),
  containerBredd: document.currentScript.parentElement.clientWidth,
});
```

Kontrollera sedan, i tur och ordning:

1. **Kör script alls** i Preview och Live på din plan.
2. **Ligger blocket i en iframe**, och är det i så fall samma ursprung.
3. **Finns `sandbox`?** Om Beehiiv har lagt till en sandbox sedan vår mätning ändras förutsättningarna
   för `target="_top"` och för `window.parent` - då måste du testa om båda.
4. **Hur hög är din mall-meny**, och är den klibbig.
5. **Växer iframen** när blockets innehåll blir högre.
6. **Vilken bredd har blocket** i mobilt och brett läge.
7. **Vad din host skickar för headers**: `curl -sSI <url>`.

---

## 9b. Lokalt arbete och felsökning i skarp miljö

**Lokalt:** kör en enkel statisk server i projektroten och öppna den, till exempel
`python3 -m http.server 8765 --bind 127.0.0.1` och `http://localhost:8765/`. Datamönstret i 7.1 gör att
sidan också fungerar via `file://`, vilket är praktiskt för skärmdumpar - men jobba mot servern, den
liknar produktionen mer.

**I skarp drift:** felsök mot den publicerade Beehiiv-sidan, inte bara lokalt. Öppna konsolen och
nätverksfliken **där**, och gör en hård omladdning eller använd ett privat fönster - annars är risken
stor att du tittar på tio minuter gammal kod och drar fel slutsats om din rättning.

---

## 10. Startchecklista för det nya bygget

1. Repo med statiska filer. `index.html` som tunt skal, `app.js`, `app.css`, `data/`.
2. Statisk HTTPS-host kopplad till repot. Anteckna adressen; den ska in i `data-bas`.
3. Lint-test för värdens regler **innan** du skriver mycket CSS: scopning, inga `vh`, ingen
   `position: fixed`, tillåtlista för `document`.
4. De två simuleringssidorna: fientlig värd och Beehiiv-iframe med klibbig meny.
5. `target="_top"` via en konstant och en hjälpfunktion, plus ett test som vaktar det.
6. `sidLocation()`/`sidHistory()` från början om du vill ha djuplänkar.
7. Container queries, med uppmätta brytpunkter.
8. Data som `.json` plus `.js`, skrivna av samma funktion, med ett kontrollskript som jämför.
9. Konfigfil för allt redaktionellt.
10. Publicera testblocket tidigt på en opublicerad Beehiiv-sida och mät enligt avsnitt 9. Vänta inte till
    slutet.

---

## Bilaga: referensimplementation

Det här mönstret är byggt och kört i skarp drift i `/Users/daniel/code/Temp` (publikt repo
`github.com/wildg14/val2026`). Innehållet där är en valgrafik och har ingenting med ditt nya projekt att
göra, men **formen** går att läsa av:

| Vad | Var |
|---|---|
| Lint mot värdens regler, tillåtlista för `document` | `tests/test_inbaddning.py` |
| Fientlig värdsida | `docs/inbaddningstest.html` |
| Beehiiv-simulering med klibbig meny och `iframe srcdoc` | `docs/beehiivtest.html` |
| `sidLocation()`, `sidHistory()`, `LANK_MAL`, `lankad()` | `valgrafik.js` |
| Data som `.json` plus identisk `.js`, skrivet atomiskt | `scripts/schema.py` |
| Webbläsarkontroller, inklusive sidledsrullning utan emulering | `verktyg/` |
| Stillbilder ur sidan med Chrome headless | `scripts/skapa_bilder.py` |
| Beehiiv- och publiceringsavsnitten i prosa | `README.md` |

Kopiera mönstren, inte innehållet. Och läs inte `docs/HANDOVER.md` - den är helt och hållet
valspecifik.
