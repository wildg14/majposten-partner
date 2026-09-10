// Kontrollerar höjdsynken i Beehiiv-simuleringen (docs/beehiivtest.html) vid 1100 och 390 px.
// Kör: node verktyg/beehiiv-check.js http://127.0.0.1:8766/docs/beehiivtest.html[?src=...]
const puppeteer = require('puppeteer-core');
const url = process.argv[2];
if (!url) { console.error('användning: node beehiiv-check.js <adress till beehiivtest.html>'); process.exit(2); }
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-first-run', '--disable-gpu'] });
  let fel = 0;
  for (const w of [1100, 390]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: 900, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2500));
    const inre = page.frames().find(f => f !== page.mainFrame() && f.url() !== 'about:srcdoc' && f.url() !== 'about:blank');  // sidans egen frame, oavsett adress
    const inreH = inre ? await inre.evaluate(() => document.body.offsetHeight) : null;  // sidans egen höjd, oberoende av iframens
    const m = await page.evaluate(() => {
      const block = document.getElementById('block');
      const d = block.contentDocument;
      const f = d && d.getElementById('majposten-partner');
      if (!f) return { fel: 'ingen #majposten-partner i srcdoc-dokumentet', srcdocStart: (block.srcdoc || '').slice(0, 120) };
      const r = f.getBoundingClientRect();
      return { blockH: block.getBoundingClientRect().height, iframeStyleH: f.style.height, iframeH: r.height, iframeBredd: r.width,
               blockBredd: block.getBoundingClientRect().width, logg: window.beehiivLogg, sidaH: document.documentElement.scrollHeight, navH: document.querySelector('nav').getBoundingClientRect().height };
    });
    const ok = !m.fel && inreH && Math.abs(m.iframeH - inreH) <= 1 && Math.abs(m.blockH - inreH) <= 1 && m.blockBredd === w && m.iframeBredd === w;
    if (!ok) fel++;
    console.log(`${w}px:`, ok ? 'OK' : 'FEL', JSON.stringify({ innehallH: inreH, ...m }));
    await page.close();
  }
  await browser.close();
  process.exit(fel ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
