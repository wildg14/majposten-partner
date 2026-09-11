// Renderar pitch.html (13 bilder, 1280×720) till PDF. Kör: node verktyg/pitch-pdf.js [utfil]
const puppeteer = require('puppeteer-core');
const path = require('path');
const ut = process.argv[2] || path.join(__dirname, '..', 'ut', 'Majposten-Partner.pdf');
const sida = 'file://' + path.join(__dirname, '..', 'pitch.html');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true, args: ['--no-first-run', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.goto(sida, { waitUntil: 'networkidle0' });
  const antal = await page.evaluate(() => document.querySelectorAll('.bild').length);
  await page.emulateMediaType('print');
  await page.pdf({ path: ut, width: '1280px', height: '720px', printBackground: true, preferCSSPageSize: true,
                   margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await browser.close();
  console.log('skrev', ut, '(' + antal + ' bilder)');
})().catch(e => { console.error(e); process.exit(1); });
