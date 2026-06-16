import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:5173/';
const OUT = 'C:/Users/hoang/.gemini/antigravity/brain/29abaacb-410f-440d-9be6-0d1aea804e3e';

(async () => {
  const browser = await chromium.launch();

  // iPhone 14 Pro viewport
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
  });

  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Screenshot sections by scrolling
  const sections = [
    { name: 'fix-hero-top', scroll: 0 },
    { name: 'fix-hero-image', scroll: 600 },
    { name: 'fix-concerns', scroll: 1600 },
    { name: 'fix-products', scroll: 2800 },
    { name: 'fix-before-after', scroll: 4000 },
    { name: 'fix-ingredients', scroll: 5200 },
    { name: 'fix-customer-trust', scroll: 6400 },
    { name: 'fix-receiving', scroll: 7600 },
    { name: 'fix-commitments', scroll: 8800 },
    { name: 'fix-footer', scroll: 10000 },
  ];

  for (const sec of sections) {
    await page.evaluate(y => window.scrollTo(0, y), sec.scroll);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/${sec.name}.png` });
    console.log(`✅ ${sec.name} captured`);
  }

  // Galaxy S21 (smallest)
  const ctx2 = await browser.newContext({
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 3,
    isMobile: true,
  });
  const page2 = await ctx2.newPage();
  await page2.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page2.waitForTimeout(2000);
  
  // Galaxy hero area
  await page2.screenshot({ path: `${OUT}/fix-galaxy-hero.png` });
  console.log('✅ Galaxy hero captured');
  
  await page2.evaluate(() => window.scrollTo(0, 600));
  await page2.waitForTimeout(800);
  await page2.screenshot({ path: `${OUT}/fix-galaxy-image.png` });
  console.log('✅ Galaxy hero image captured');

  await browser.close();
  console.log('\n🎉 All fix screenshots done!');
})();
