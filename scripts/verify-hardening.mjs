import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json')),{chromium}=require('playwright'),base='http://127.0.0.1:4180'
await fs.mkdir('assets/hardening-checks',{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),reports=[]
for(const width of[390,768,1440]){
 const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1}),page=await context.newPage(),messages=[],requests=[]
 page.on('console',m=>{if(['warning','error'].includes(m.type()))messages.push(m.text())});page.on('pageerror',e=>messages.push(e.message));page.on('request',r=>requests.push(r.url()))
 await page.addInitScript(()=>{window.__opened=[];window.open=url=>{window.__opened.push(url);return{}}})
 await page.goto(base);await page.getByRole('button',{name:/^START/}).waitFor();await page.waitForTimeout(1500)
 assert.equal(await page.locator('canvas').count(),0);assert.ok(!requests.some(u=>/World-|webgl-|three-|\.glb/.test(u)),'No 3D before intent')
 assert.equal(await page.locator('h1').count(),1);assert.ok(await page.getByRole('link',{name:'Simple view — no 3D'}).isVisible())
 await page.screenshot({path:`assets/hardening-checks/opening-${width}.png`})
 await page.getByRole('button',{name:/^START/}).click();await page.locator('canvas').waitFor({timeout:60000});await page.waitForTimeout(6500)
 for(const offset of[0,.28,.5,.7,.95,1]){
  await page.evaluate(offset=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*offset},offset);await page.waitForTimeout(4500)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  const visible=await page.locator('.section-copy').evaluateAll(elements=>elements.filter(e=>getComputedStyle(e).visibility==='visible'&&+getComputedStyle(e).opacity>.001).length);assert.ok(visible<=1)
  const overlaps=await page.evaluate(()=>{const selectors=['.booking-card','.contact-card','.fleet-spec','.fleet-navigation','.service-choices','.site-footer-links','.sound-toggle','.book-now'];const items=selectors.flatMap(selector=>[...document.querySelectorAll(selector)].filter(e=>e.getBoundingClientRect().width&&e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})).map(e=>({selector,rect:e.getBoundingClientRect()})));return items.flatMap((a,i)=>items.slice(i+1).filter(b=>Math.min(a.rect.right,b.rect.right)-Math.max(a.rect.left,b.rect.left)>2&&Math.min(a.rect.bottom,b.rect.bottom)-Math.max(a.rect.top,b.rect.top)>2).map(b=>[a.selector,b.selector]))});assert.deepEqual(overlaps,[],`Overlaps at ${width}/${offset}`)
  await page.screenshot({path:`assets/hardening-checks/scene-${width}-${offset}.png`})
 }
 assert.ok(requests.some(u=>/models\/versioned\/[a-f0-9]{16}\/car.opt.glb/.test(u)))
 await page.goto(base+'/simple');await page.getByRole('heading',{name:'Drive your journey.',exact:true}).waitFor()
 assert.equal(await page.locator('canvas').count(),0);assert.equal(await page.locator('h1').count(),1)
 assert.equal(await page.locator('#fleet article').count(),5);assert.equal(await page.locator('#services article').count(),3);assert.equal(await page.locator('#faq details').count(),5)
 await page.screenshot({path:`assets/hardening-checks/simple-${width}.png`,fullPage:true})
 await page.locator('#fleet button').first().click();await page.waitForTimeout(100);assert.equal(await page.locator('#booking-carId').inputValue(),'hatchback')
 await page.getByRole('button',{name:'Book now',exact:true}).last().click();assert.equal(await page.locator('[aria-invalid=true]').count(),4)
 const dates=await page.evaluate(()=>{const day=new Date();day.setDate(day.getDate()+2);const pickup=day.toLocaleDateString('en-CA');day.setDate(day.getDate()+3);return{pickup,dropoff:day.toLocaleDateString('en-CA')}})
 await page.locator('#booking-pickup').fill(dates.pickup);await page.locator('#booking-dropoff').fill(dates.dropoff);await page.locator('#booking-location').fill('Test airport');await page.locator('#booking-phone').fill('9876543210');await page.locator('#booking-email').fill('invalid');await page.getByRole('button',{name:'Book now',exact:true}).last().click();assert.equal(await page.locator('#booking-email').getAttribute('aria-invalid'),'true')
 await page.locator('#booking-email').fill('customer@example.invalid');await page.getByRole('button',{name:'Book now',exact:true}).last().click();await page.getByRole('status',{name:'Booking confirmation'}).waitFor();assert.equal(await page.evaluate(()=>window.__opened.length),0)
 await page.screenshot({path:`assets/hardening-checks/simple-success-${width}.png`})
 for(const route of['privacy','terms','cancellation']){await page.goto(`${base}/${route}`);assert.equal(await page.locator('h1').count(),1);assert.ok((await page.title()).includes('Egal'));assert.ok(await page.getByText('PLACEHOLDER — must be reviewed before launch.',{exact:true}).isVisible())}
 assert.deepEqual(messages,[]);reports.push({width,messages,scenes:true,simple:true,emailMocked:true});await context.close()
}
// Actual endpoint failure is intercepted, never a false success or a real message.
const page=await browser.newPage();await page.addInitScript(()=>{window.__opened=[];window.open=url=>{window.__opened.push(url);return{}}});await page.route('**/api/booking',r=>r.fulfill({status:503,contentType:'application/json',body:'{"ok":false}'}));await page.goto(base+'/simple')
for(const[id,value]of Object.entries({pickup:'2099-06-01',dropoff:'2099-06-04',location:'Test airport',phone:'9876543210'}))await page.locator(`#booking-${id}`).fill(value)
await page.locator('#booking-carId').selectOption('suv');await page.getByRole('button',{name:'Book now',exact:true}).last().click();await page.getByText(/Email booking is unavailable/).waitFor();assert.equal(await page.evaluate(()=>window.__opened.length),1)
const nojs=await browser.newContext({javaScriptEnabled:false}),staticPage=await nojs.newPage()
for(const route of['/','/simple','/privacy','/terms','/cancellation']){await staticPage.goto(base+route);assert.ok(await staticPage.locator('h1:visible').count()===1);assert.ok((await staticPage.locator('main:visible').innerText()).length>100)}
await nojs.close()
const lost=await browser.newPage();await lost.goto(base);await lost.getByRole('button',{name:/^START/}).click();await lost.locator('canvas').waitFor();await lost.locator('canvas').evaluate(canvas=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await lost.waitForURL(/\/simple\?reason=webgl/);assert.ok(await lost.getByText(/3D experience is unavailable on this device/).isVisible())
await browser.close();await fs.writeFile('assets/hardening-checks/browser.json',JSON.stringify({reports,serverFailureFallback:true,noJavaScriptPages:true,contextLostFallback:true},null,2));console.log('PASS prerender hydration, lazy initial UI, all scenes at 390/768/1440, Simple view booking, legal pages, no-JS content, backend failure WhatsApp and context-lost fallback.')
