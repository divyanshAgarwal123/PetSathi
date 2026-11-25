import { chromium } from '../../.qa-tools/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const out = new URL('./', import.meta.url).pathname;
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const report={cases:[],failures:[]};const captures={};
const grids=['.benefits-grid','#requirements-grid','.activities-grid','#accessories-grid','.safety-cards-grid','.warning-signs-grid'];
try {
for(const width of [1440,768,390]) for(const side of ['parent','head']) {
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>requests.push({url:r.url(),failure:r.failure()?.errorText}));
 await page.goto(`http://127.0.0.1:${side==='head'?5841:5842}/frontend/pages/pets/dogs/walking.html`,{waitUntil:'networkidle'});await page.locator('#header header').waitFor();await page.locator('#footer footer').waitFor();await page.evaluate(()=>document.fonts.ready);
 const baseline=await page.evaluate(()=>({header:document.querySelector('#header').innerHTML,footer:document.querySelector('#footer').innerHTML,links:[...document.querySelectorAll('main a')].map(a=>a.getAttribute('href')),ctaText:document.querySelector('.cta').innerText,ctaBackground:getComputedStyle(document.querySelector('.cta')).backgroundColor}));
 baseline.ctaResponses=[];for(const href of await page.locator('.cta a').evaluateAll(els=>els.map(a=>a.href))){const response=await page.request.get(href);baseline.ctaResponses.push({pathname:new URL(href).pathname,status:response.status()});}
 captures[`${width}-${side}`]=baseline;
 const geometry=[];for(const selector of grids){geometry.push({selector,cards:await page.locator(`${selector} > :visible`).evaluateAll(els=>els.filter(el=>!el.classList.contains('no-results-card')).map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}))});}
 for(const [name,selector]of Object.entries({navigation:'#search-filter',benefits:'#benefits',safety:'#safety-tips',warning:'#warning-signs',cta:'.cta'})){const loc=page.locator(selector);if(await loc.count())await loc.screenshot({path:out+`pet-${side}-${width}-${name}.png`});}
 const item={side,width,geometry,ctaResponses:baseline.ctaResponses,errors,failedRequests:requests,checks:[]};report.cases.push(item);
 if(side==='head') {
  assert.deepEqual(baseline,captures[`${width}-parent`],'Rendered nav/footer, destinations, CTA content/background preserved');item.checks.push('Rendered header/footer, all link destinations, CTA text/background equal exact parent');
  const columns=width>960?3:width>600?2:1;
  for(const group of geometry){assert.ok(group.cards.length>0);const c=group.cards;assert.equal(c.filter(x=>Math.abs(x.y-c[0].y)<2).length,Math.min(columns,c.length),group.selector+' columns');for(let i=columns;i<c.length;i+=columns)assert.ok(Math.abs(c[i].x-c[0].x)<2,group.selector+' last row left');assert.ok(Math.max(...c.map(x=>x.width))-Math.min(...c.map(x=>x.width))<2,group.selector+' equal widths');assert.ok(Math.max(...c.map(x=>x.height))-Math.min(...c.map(x=>x.height))<2,group.selector+' equal heights');}
  item.checks.push('All six card groups responsive equal-sized cells; incomplete rows start at left');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal page overflow');
  assert.equal(await page.locator('.cta h2').evaluate(el=>getComputedStyle(el).textAlign),'left');
  assert.equal(await page.locator('.dog-warning-heading').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(237, 247, 240)');
  const surfaces=await page.locator('.safety-tip-card').evaluateAll(els=>els.map(el=>getComputedStyle(el).backgroundColor));assert.equal(new Set(surfaces).size,1);
  const icons=await page.locator('.warning-sign-card i').evaluateAll(els=>els.map(el=>({color:getComputedStyle(el).color,family:getComputedStyle(el,'::before').fontFamily,content:getComputedStyle(el,'::before').content})));assert.ok(icons.every(x=>x.color==='rgb(40, 104, 73)'&&x.family.includes('Font Awesome')&&x.content!=='none'));item.checks.push('Uniform safety cards, green Break section/icons, left-aligned CTA');
  const search=page.locator('#walking-search-input');await search.focus();await page.keyboard.type('unmatchable-synthetic-fixture');await page.waitForFunction(()=>document.querySelector('#filter-status-text').textContent.includes('0 routines, 0 activities'));assert.equal(await page.locator('#requirements-grid .dog-card:visible').count(),0);await page.locator('#search-clear-btn').click();assert.equal(await search.inputValue(),'');
  await page.locator('button[data-size="small"]').click();assert.ok(await page.locator('#requirements-grid').evaluate(el=>el.classList.contains('single-horizontal-card')));assert.equal(await page.locator('#requirements-grid .dog-card:visible').count(),1);await page.locator('#filter-reset-btn').click();
  await page.locator('button[data-activity="low-intensity"]').click();assert.ok(await page.locator('#activities-grid > :visible').count()>0);await page.locator('#filter-reset-btn').click();
  const check=page.locator('.interactive-checklist-card input[type=checkbox]').first();await check.focus();await page.keyboard.press('Space');assert.ok(await check.isChecked());await page.keyboard.press('Space');assert.ok(!await check.isChecked());item.checks.push('Keyboard search, empty results, clear, single horizontal size filter, activity/reset and checklist preserved');
  await page.locator('#hero-cta-tips').focus();await page.keyboard.press('Enter');assert.equal(new URL(page.url()).hash,'#benefits');
  const internal=await page.locator('main a[href^="#"]').evaluateAll(els=>els.map(a=>({href:a.getAttribute('href'),exists:!!document.querySelector(a.getAttribute('href'))})));assert.ok(internal.every(x=>x.exists));item.checks.push('All fragment destinations exist; keyboard hero link navigates');
  assert.equal(errors.length,0,'No JavaScript exceptions');
 }
 await page.close();await writeFile(out+'pet-browser-report.json',JSON.stringify(report,null,2)+'\n');
}
} catch(e){report.failures.push(e.stack);throw e;} finally {await writeFile(out+'pet-browser-report.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
