import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json'))
const {chromium}=require('playwright'), output=path.resolve('assets/step6-checks')
await fs.mkdir(output,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']})
const messages=[],reports=[]
for(const width of [1440,390]) {
 const page=await browser.newPage({viewport:{width,height:width===1440?900:844}})
 page.on('console',m=>{if(['error','warning'].includes(m.type()))messages.push(m.text())});page.on('pageerror',e=>messages.push(e.message))
 await page.addInitScript(()=>{window.__opened=[];window.open=(url)=>{window.__opened.push(url);return {}}})
 await page.goto('http://localhost:4173/');await page.getByRole('button',{name:/^START/}).click({timeout:45000})
 async function scroll(offset){await page.evaluate(offset=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*offset},offset);await page.waitForTimeout(6500)}
 await scroll(.28)
 await page.getByRole('button',{name:'Next car',exact:true}).click();await page.waitForTimeout(300)
 await page.getByRole('button',{name:'Car colour 5',exact:true}).click()
 await page.getByRole('button',{name:/Book this car/}).click();await page.waitForTimeout(2000)
 await scroll(.7)
 assert.equal(await page.locator('#booking-carId').inputValue(),'premium-suv')
 await page.screenshot({path:path.join(output,`booking-${width}.png`)})
 await page.getByRole('button',{name:'Book now',exact:true}).click();await page.waitForTimeout(300)
 assert.equal(await page.locator('.booking-card [aria-invalid=true]').count(),4)
 assert.equal(await page.evaluate(()=>window.__opened.length),0)
 await page.locator('.booking-card').evaluate(el=>el.scrollTop=0)
 await page.screenshot({path:path.join(output,`booking-errors-${width}.png`)})
 const dates=await page.evaluate(()=>{const date=new Date();const format=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;date.setDate(date.getDate()+2);const pickup=format(date);date.setDate(date.getDate()+3);return{pickup,dropoff:format(date)}})
 await page.locator('#booking-pickup').fill(dates.pickup);await page.locator('#booking-dropoff').fill(dates.dropoff)
 await page.locator('#booking-location').fill('Visakhapatnam airport');await page.locator('#booking-phone').fill('9876543210')
 assert.match(await page.locator('.booking-estimate').innerText(),/3 days × ₹4,299 = ₹12,897/)
 await page.getByRole('button',{name:'Book now',exact:true}).click();await page.waitForTimeout(4800)
 assert.ok(await page.getByRole('status',{name:'Booking confirmation'}).isVisible())
 const opened=await page.evaluate(()=>window.__opened)
 assert.equal(opened.length,1);const wa=new URL(opened[0]);assert.equal(wa.hostname,'wa.me')
 const message=wa.searchParams.get('text');for(const detail of [dates.pickup,dates.dropoff,'Visakhapatnam airport','Premium SUV','#8a8d91','9876543210','12897'])assert.ok(message.includes(detail),`WhatsApp missing ${detail}`)
 await page.screenshot({path:path.join(output,`booking-success-${width}.png`)})
 // Scrolling back closes the gate and restores the editable form.
 await scroll(.65);assert.ok(await page.getByRole('form',{name:'Book Your Ride'}).isVisible())
 await scroll(.7)
 await page.getByRole('button',{name:'Book on WhatsApp',exact:true}).click();await page.waitForTimeout(1000)
 assert.equal(await page.evaluate(()=>window.__opened.length),2)
 for(const offset of [.95,1]) {await scroll(offset);await page.screenshot({path:path.join(output,`contact-${offset}-${width}.png`)})}
 // Visible UI cards never touch the persistent controls or the headline.
 const layout=await page.evaluate(()=>{
  const rect=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom}}
  return {card:rect(document.querySelector('.contact-card')),controls:[...document.querySelectorAll('.book,.sound-toggle,[aria-label="contact"] h1')].map(rect)}
 })
 const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top
 for(const other of layout.controls)assert.ok(!overlap(layout.card,other),'contact card overlaps UI')
 await page.getByRole('button',{name:/Back to start/}).click();await page.waitForTimeout(6500)
 assert.ok(await page.getByRole('heading',{name:'Drive your journey.'}).isVisible())
 reports.push({width,whatsapp:message,layout,reset:true});await page.close()
}
assert.deepEqual(messages,[])
await browser.close();await fs.writeFile(path.join(output,'report.json'),JSON.stringify({messages,reports},null,2))
console.log('PASS Step 6: desktop/phone form, required errors, estimate, selected colour, WhatsApp fallback/buttons, reset, contact and sunset captures; no console warnings/errors.')
