const { chromium } = require('@playwright/test');
const dir = 'C:/Users/narag/AppData/Local/Temp/farmalert-shots';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto('http://localhost:5175', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Full page
  await page.screenshot({ path: `${dir}/full.png`, fullPage: true });

  // How It Works — scroll to the section
  await page.evaluate(() => {
    const el = document.getElementById('how-it-works');
    if (el) el.scrollIntoView({ behavior: 'instant' });
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${dir}/how-it-works.png` });

  // Mobile full
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('http://localhost:5175', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const el = document.getElementById('how-it-works');
    if (el) el.scrollIntoView({ behavior: 'instant' });
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${dir}/how-it-works-mobile.png` });

  console.log('ERRORS:', JSON.stringify(errors));
  await browser.close();
})();
