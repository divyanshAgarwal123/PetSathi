const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const root = process.env.PET_ROOT || '/tmp/nsoc-petsathi189';
const out = process.env.EVIDENCE_DIR || '/tmp/nsoc-pet189-evidence';
const url = process.env.PET_URL || 'http://127.0.0.1:5376/frontend/pages/walker/index.html';
const browser = await chromium.launch();
const report = { checks: [], errors: [], failedRequests: [], widths: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } });
  const before = await readFile(`${out}/before.html`, 'utf8');
  await page.route(url, (route) => route.fulfill({ contentType: 'text/html', body: before }));
  await page.goto(url); await page.locator('#header header').waitFor();
  const old = await page.evaluate(() => ({ header: document.querySelector('#header').innerHTML, footer: document.querySelector('#footer').innerHTML,
    bookings: document.querySelector('#bookings').innerHTML, links: [...document.querySelectorAll('main a')].map((a) => a.getAttribute('href')) }));
  await page.screenshot({ path: `${out}/before-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: `${out}/before-mobile.png`, fullPage: true });
  await page.unroute(url); await page.setViewportSize({ width: 1360, height: 1000 });
  page.on('pageerror', (e) => report.errors.push(e.message));
  page.on('requestfailed', (r) => report.failedRequests.push({ url: r.url(), failure: r.failure()?.errorText }));
  await page.goto(url); await page.locator('#header header').waitFor();
  const current = await page.evaluate(() => ({ header: document.querySelector('#header').innerHTML, footer: document.querySelector('#footer').innerHTML,
    bookings: document.querySelector('#bookings').innerHTML, links: [...document.querySelectorAll('main a')].map((a) => a.getAttribute('href')) }));
  assert.equal(current.header, old.header); assert.equal(current.footer, old.footer); assert.equal(current.bookings, old.bookings);
  for (const link of old.links) assert.ok(current.links.includes(link), `Preserved link ${link}`);
  assert.equal(await page.locator('.walker-card:visible').count(), 4);
  assert.equal(await page.locator('.walker-photo').evaluate((img) => img.complete && img.naturalWidth > 0), true);
  const icon = await page.locator('.walker-card i').first().evaluate((el) => ({ family: getComputedStyle(el, '::before').fontFamily, content: getComputedStyle(el, '::before').content }));
  assert.match(icon.family, /Font Awesome/); assert.ok(icon.content !== 'none');
  report.checks.push('Rendered header/footer and complete booking section exactly equal baseline; all original destinations retained; image and Font Awesome loaded');
  const search = page.getByLabel('Search categories', { exact: true }), pet = page.getByLabel('Pet type', { exact: true });
  await search.fill('  CAT  '); assert.equal(await page.locator('.walker-card:visible').count(), 1);
  assert.match(await page.locator('.walker-card:visible').textContent(), /Cat Caregivers/);
  await pet.selectOption('dogs'); assert.equal(await page.locator('.walker-card:visible').count(), 0);
  assert.equal(await page.locator('#walker-empty').isVisible(), true); assert.equal(await page.locator('.booking-card:visible').count(), 3);
  await page.getByRole('button', { name: 'Reset filters' }).click(); assert.equal(await page.locator('.walker-card:visible').count(), 4);
  await search.focus(); await page.keyboard.press('Tab');
  assert.equal(await pet.evaluate((el) => document.activeElement === el), true);
  await page.keyboard.press('d'); await page.keyboard.press('Enter');
  assert.equal(await page.locator('.walker-card:visible').count(), 1);
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); assert.equal(await page.locator('.walker-card:visible').count(), 4);
  await search.fill('bird'); await page.keyboard.press('Enter'); assert.equal(await search.inputValue(), 'bird');
  await page.getByRole('button', { name: 'Reset filters' }).click();
  report.checks.push('Search is trimmed/case-insensitive, combines with pet filter; empty results preserve bookings; native keyboard select/reset and Enter search do not reload');
  const links = await page.locator('main a').evaluateAll((items) => items.map((a) => a.href));
  for (const link of links) {
    const response = await page.request.get(link.split('#')[0]); assert.equal(response.status(), 200, link);
    if (link.includes('#')) assert.equal(await page.locator(`#${link.split('#')[1]}`).count(), 1);
  }
  await page.getByRole('link', { name: 'Explore dog walkers', exact: true }).click();
  assert.ok(page.url().endsWith('/walker/dogs.html')); await page.waitForLoadState('networkidle'); await page.goBack(); await page.waitForLoadState('networkidle');
  await page.locator('a[href="handover.html?booking=PS-1042"]').click();
  assert.ok(page.url().endsWith('handover.html?booking=PS-1042')); await page.waitForLoadState('networkidle'); await page.goBack(); await page.waitForLoadState('networkidle');
  report.checks.push('All main-page links return 200, hero anchor exists, caregiver and booking links navigate with correct query');
  for (const width of [320, 390, 768, 1024, 1360]) {
    await page.setViewportSize({ width, height: 1000 });
    const measurements = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth,
      cards: [...document.querySelectorAll('.walker-card')].map((el) => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      main: document.querySelector('main').getBoundingClientRect().width }));
    assert.ok(measurements.overflow <= 0, `overflow at ${width}`);
    assert.ok(measurements.main <= width);
    assert.ok(Math.max(...measurements.cards.map((c) => c.width)) - Math.min(...measurements.cards.map((c) => c.width)) < 1);
    assert.ok(Math.max(...measurements.cards.map((c) => c.height)) - Math.min(...measurements.cards.map((c) => c.height)) < 1);
    report.widths.push({ width, ...measurements });
    if (width === 390 || width === 768 || width === 1360) await page.screenshot({ path: `${out}/after-${width}.png`, fullPage: true });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.walker-card').first().evaluate((el) => getComputedStyle(el).transitionDuration), '0s');
  assert.equal(await (await page.request.get(url)).text(), await readFile(`${root}/frontend/pages/walker/index.html`, 'utf8'));
  assert.deepEqual(report.errors, []); assert.deepEqual(report.failedRequests, []);
  report.checks.push('320/390/768/1024/1360px without overflow, equal card widths, reduced motion, zero page/request failures, exact served HTML');
  report.passed = true;
} finally { await writeFile(`${out}/browser-report.json`, JSON.stringify(report, null, 2)); await browser.close(); }
console.log(JSON.stringify(report, null, 2));
