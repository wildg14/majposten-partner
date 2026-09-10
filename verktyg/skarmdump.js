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
    const fel = [];
    page.on('pageerror', e => fel.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') fel.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) fel.push(r.status() + ' ' + r.url()); });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 800));
    const m = await page.evaluate(() => ({
      h: document.documentElement.scrollHeight,
      sidled: document.documentElement.scrollWidth > innerWidth,
      lankar: [...document.querySelectorAll('a')].map(a => a.getAttribute('href') + ' ' + a.getAttribute('target')),
    }));
    await page.screenshot({ path: `${ut}/${v.namn}.png`, fullPage: true });
    console.log(v.namn, `${v.width}x${m.h}`, m.sidled ? 'SIDLEDSRULLNING' : 'ingen sidledsrullning', fel.length ? 'FEL: ' + fel.join(' | ') : 'inga konsolfel');
    console.log('  länkar:', m.lankar.join(' ; '));
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
