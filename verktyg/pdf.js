// Renderar sidan till en A4-PDF med rimliga sidbrytningar. Kör: node verktyg/pdf.js [utfil]
// Utskrifts-CSS:en ligger här, inte i index.html, så att sidan på webben lämnas orörd.
const puppeteer = require('puppeteer-core');
const path = require('path');
const ut = process.argv[2] || path.join(__dirname, '..', 'ut', 'Annonsera-i-Majposten.pdf');
const sida = 'file://' + path.join(__dirname, '..', 'index.html');

const PRINT_CSS = `
  @page { size: A4; margin: 15mm 14mm 17mm; }
  html, body { background: #FAF6EE !important; }
  /* Korta sektioner hålls ihop som helhet. */
  section[data-screen-label="Hero"], section[data-screen-label="Regler"], section[data-screen-label="Kontakt"] { break-inside: avoid; }
  /* Rubriker och sektionsetiketter (spärr 2 px, blocknivå) får inte hamna sist på en sida.
     Inte etiketterna inne i flex-rader (spärr 1,5 px): där kedjar break-after ihop hela rutan. */
  h1, h2, h3,
  div[style*="max-width:620px"] > div[style*="letter-spacing:2px"],
  div[style*="max-width:620px"] > * > div[style*="letter-spacing:2px"] { break-after: avoid; }
  /* Enheterna inuti varje sektion (kort, rader, listpunkter, bilder) bryts inte på mitten. */
  div[style*="max-width:620px"] > * > * { break-inside: avoid; }
  div[style*="max-width:420px"] { break-inside: avoid; }
  img { break-inside: avoid; }
  /* Småtexter (13 px, sten) hör till blocket före: ingen ensam fotnot överst på en sida. */
  div[style*="font-size:13px"][style*="margin-top:1"] { break-before: avoid; }
  /* Bildetiketterna ("WEBB · DATOR") hör ihop med bilden under. */
  div[style*="letter-spacing:1.5px"][style*="margin-bottom:8px"] { break-after: avoid; }
  /* "Så här ser ett nummer ut:" och mockupen ska stå på samma sida: sektionen börjar på ny sida. */
  section[data-screen-label="Var du syns"] { break-before: page; }
  /* Spelreglerna börjar på ny sida; exempelsektionens bottenpadding får inte spilla över som en remsa. */
  section[data-screen-label="Regler"] { break-before: page; }
  section[data-screen-label="Exempel"] { padding-bottom: 40px !important; }
`;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true, args: ['--no-first-run', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.goto(sida, { waitUntil: 'networkidle0' });
  await page.addStyleTag({ content: PRINT_CSS });
  // Mejladressen syns inte i en knapp på papper: skriv ut den under slutsektionens knapp.
  await page.evaluate(() => {
    const kontakt = document.querySelector('section[data-screen-label="Kontakt"] div[style*="max-width:620px"]');
    const rad = document.createElement('div');
    rad.setAttribute('style', 'font-size:15px;line-height:1.5;color:#FAF6EE;margin-top:16px;font-weight:700;');
    rad.textContent = 'daniel@tvartom.win';
    kontakt.appendChild(rad);
  });
  await page.emulateMediaType('print');
  await page.pdf({
    path: ut, format: 'A4', printBackground: true, preferCSSPageSize: true,
    scale: 0.9,   // 16 px brödtext blir 10,8 pt: mer papperslikt, och intro + mockup ryms på en sida
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="width:100%;padding:0 14mm;font-family:Arial,Helvetica,sans-serif;font-size:8px;color:#6E6152;display:flex;justify-content:space-between;">' +
      '<span>Annonsera i Majposten &middot; majposten.se/partner</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
  });
  await browser.close();
  console.log('skrev', ut);
})().catch(e => { console.error(e); process.exit(1); });
