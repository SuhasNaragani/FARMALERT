const { chromium } = require('@playwright/test');
const dir = 'C:/Users/narag/AppData/Local/Temp/farmalert-shots';
const fs = require('fs');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('http://localhost:5174', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${dir}/01-hero.png` });

  await page.evaluate(() => window.scrollTo(0, window.innerHeight));
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${dir}/02-problem.png` });

  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2.2));
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${dir}/03-how-it-works.png` });

  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 3.8));
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${dir}/04-risk-grid.png` });

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${dir}/05-footer.png` });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${dir}/06-mobile-hero.png` });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${dir}/00-fullpage.png`, fullPage: true });

  console.log('ERRORS:', JSON.stringify(errors));
  console.log('DONE');
  await browser.close();
})();
