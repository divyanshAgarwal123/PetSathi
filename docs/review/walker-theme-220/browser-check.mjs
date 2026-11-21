const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const root = process.env.PET_ROOT || '/tmp/nsoc-petsathi220';
const out = process.env.EVIDENCE_DIR || '/tmp/nsoc-pet220-theme-evidence';
const url = process.env.PET_URL || 'http://127.0.0.1:5411/frontend/pages/walker/index.html';
const beforeUrl = process.env.BEFORE_URL || 'http://127.0.0.1:5410/frontend/pages/walker/index.html';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const report = { checks: [], errors: [], failedRequests: [], widths: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } });
  await page.goto(beforeUrl); await page.locator('#header header').waitFor(); await page.locator('#footer .footer').waitFor(); await page.evaluate(() => document.fonts.ready);
  const old = await page.evaluate(() => ({ header: document.querySelector('#header').innerHTML, footer: document.querySelector('#footer').innerHTML,
    bookings: document.querySelector('#bookings').innerHTML.replace('section-heading walker-section-heading', 'section-heading'), links: [...document.querySelectorAll('main a')].map((a) => a.getAttribute('href')) }));
  await page.screenshot({ path: `${out}/before-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: `${out}/before-mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 1360, height: 1000 });
  page.on('pageerror', (e) => report.errors.push(e.message));
  page.on('requestfailed', (r) => report.failedRequests.push({ url: r.url(), failure: r.failure()?.errorText }));
  await page.goto(url); await page.locator('#header header').waitFor(); await page.locator('#footer .footer').waitFor(); await page.evaluate(() => document.fonts.ready);
  const current = await page.evaluate(() => ({ header: document.querySelector('#header').innerHTML, footer: document.querySelector('#footer').innerHTML,
    bookings: document.querySelector('#bookings').innerHTML.replace('section-heading walker-section-heading', 'section-heading'), links: [...document.querySelectorAll('main a')].map((a) => a.getAttribute('href')) }));
  assert.equal(current.header, old.header); assert.equal(current.footer, old.footer); assert.equal(current.bookings, old.bookings);
  for (const link of old.links) assert.ok(current.links.includes(link), `Preserved link ${link}`);
  assert.equal(await page.locator('.walker-card:visible').count(), 4);
  assert.equal(await page.locator('.walker-photo').evaluate((img) => img.complete && img.naturalWidth > 0), true);
  const icon = await page.locator('.walker-card i').first().evaluate((el) => ({ family: getComputedStyle(el, '::before').fontFamily, content: getComputedStyle(el, '::before').content }));
  assert.match(icon.family, /Font Awesome/); assert.ok(icon.content !== 'none');
  report.checks.push('Rendered header/footer and complete booking content equal baseline; booking heading class intentionally themed; original links preserved; real image and Font Awesome loaded');
  const theme = await page.evaluate(() => ({ headings: [...document.querySelectorAll('.walker-section-heading')].map(el => ({background:getComputedStyle(el).backgroundColor,font:getComputedStyle(el.querySelector('h2')).fontFamily})), cta:getComputedStyle(document.querySelector('.inner-cta')).backgroundColor, badges:[...document.querySelectorAll('.booking-badge')].map(el=>getComputedStyle(el).backgroundColor) }));
  assert.equal(theme.headings.length, 2);
  for(const heading of theme.headings) { assert.equal(heading.background, 'rgb(250, 252, 247)'); assert.match(heading.font,/Georgia/); }
  assert.equal(theme.cta, 'rgb(241, 244, 237)');
  for(const badge of theme.badges) assert.equal(badge,'rgb(234, 242, 233)');
  report.theme=theme;report.checks.push('Both heading backgrounds survive the shared important white rule; Cat Index heading typography/palette; green closing CTA and booking statuses without pink/yellow');
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
  const baseline = await browser.newPage({viewport:{width:1360,height:1000}});
  await baseline.goto(beforeUrl);await baseline.locator('#footer .footer').waitFor();await baseline.evaluate(()=>document.fonts.ready);
  await page.setViewportSize({width:1360,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});
  await baseline.mouse.move(0,0);await page.mouse.move(0,0);
  const styles = el => [el,...el.querySelectorAll('*')].map(node => {
    const c=getComputedStyle(node);return ['fontFamily','fontSize','fontWeight','lineHeight','color','backgroundColor','backgroundImage','borderColor','borderRadius','padding','margin','display','width','height','gap','boxShadow'].map(k=>c[k]);
  });
  report.shellOrigins=[];
  for(const selector of ['#header','#footer']) {
    assert.deepEqual(await page.locator(selector).evaluate(styles),await baseline.locator(selector).evaluate(styles),'unchanged shell computed styles '+selector);
    report.shellOrigins.push({selector,before:await baseline.locator(selector).boundingBox(),after:await page.locator(selector).boundingBox()});
    // Compare the same component at a common pixel origin; page content changes its vertical subpixel position.
    if(selector==='#footer')for(const tab of [baseline,page])await tab.locator(selector).evaluate(el=>Object.assign(el.style,{position:'fixed',top:'0',left:'0',width:'100%',zIndex:'10000'}));
    const a=await baseline.locator(selector).screenshot({animations:'disabled'}),b=await page.locator(selector).screenshot({animations:'disabled'});
    await writeFile(`${out}/shell-${selector.slice(1)}-before.png`,a);await writeFile(`${out}/shell-${selector.slice(1)}-after.png`,b);
    assert.ok(b.equals(a),'unchanged shell pixels at common origin '+selector);
  }
  await baseline.close();report.checks.push('Header/footer DOM and all descendant computed theme/layout styles unchanged; screenshot pixels identical at a common component origin');
  report.passed = true;
} finally { await writeFile(`${out}/browser-report.json`, JSON.stringify(report, null, 2)); await browser.close(); }
console.log(JSON.stringify(report, null, 2));
