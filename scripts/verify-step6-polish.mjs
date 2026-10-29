import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json'))
const {chromium}=require('playwright'), output=path.resolve('assets/step6-polish-checks')
await fs.mkdir(output,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']})
const messages=[],reports=[]
for(const width of [1440,390]) {
 const page=await browser.newPage({viewport:{width,height:width===1440?800:844}})
 page.on('console',m=>{if(['error','warning'].includes(m.type()))messages.push(m.text())});page.on('pageerror',e=>messages.push(e.message))
 await page.addInitScript(()=>{window.__opened=[];window.open=(url)=>{window.__opened.push(url);return {}}})
 await page.goto('http://localhost:4173/');await page.getByRole('button',{name:/^START/}).click({timeout:45000})
 async function scroll(offset){await page.evaluate(offset=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*offset},offset);await page.waitForTimeout(6500)}
 await scroll(.7)
 assert.equal(await page.locator('#booking-carId').inputValue(),'')
 const initial=await page.locator('.booking-body').evaluate(el=>({height:el.clientHeight,content:el.scrollHeight}))
 if(width===1440)assert.ok(initial.content<=initial.height+1,'800px form must fit without scrolling')
 const checkLayout=async(selector)=>{
  const boxes=await page.evaluate(selector=>{
   const rect=e=>{const b=e.getBoundingClientRect();return{left:b.left,right:b.right,top:b.top,bottom:b.bottom}}
   const card=document.querySelector(selector),section=card.closest('section')
   return{card:rect(card),controls:[...document.querySelectorAll('.book,.sound-toggle'),section.querySelector('h1')].map(rect)}
  },selector)
  for(const b of boxes.controls)assert.ok(!(boxes.card.left<b.right&&boxes.card.right>b.left&&boxes.card.top<b.bottom&&boxes.card.bottom>b.top),'card overlaps persistent control/title')
 }
 await checkLayout('.booking-card')
 await page.screenshot({path:path.join(output,`booking-${width}.png`)})
 await page.getByRole('button',{name:'Book now',exact:true}).click();await page.waitForTimeout(300)
 assert.equal(await page.locator('.booking-card [aria-invalid=true]').count(),5)
 assert.equal(await page.evaluate(()=>window.__opened.length),0)
 await page.locator('.booking-body').evaluate(el=>el.scrollTop=0)
 await page.screenshot({path:path.join(output,`booking-errors-${width}.png`)})
 const dates=await page.evaluate(()=>{const date=new Date();const format=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;date.setDate(date.getDate()+2);const pickup=format(date);date.setDate(date.getDate()+3);return{pickup,dropoff:format(date)}})
 await page.locator('#booking-pickup').fill(dates.pickup);await page.locator('#booking-dropoff').fill(dates.dropoff)
 await page.locator('#booking-carId').selectOption('premium-suv')
 await page.locator('#booking-location').fill('Visakhapatnam airport');await page.locator('#booking-phone').fill('9876543210')
 assert.match(await page.locator('.booking-estimate').innerText(),/3 days × ₹4,299 = ₹12,897/)
 await page.getByRole('button',{name:'Book now',exact:true}).click();await page.waitForTimeout(4800)
 assert.ok(await page.getByRole('status',{name:'Booking confirmation'}).isVisible())
 const opened=await page.evaluate(()=>window.__opened)
 assert.equal(opened.length,1);const wa=new URL(opened[0]);assert.equal(wa.hostname,'wa.me')
 const message=wa.searchParams.get('text');for(const detail of [dates.pickup,dates.dropoff,'Visakhapatnam airport','Premium SUV','#c0161b','9876543210','12897'])assert.ok(message.includes(detail),`WhatsApp missing ${detail}`)
 await checkLayout('.booking-card')
 await page.screenshot({path:path.join(output,`booking-success-${width}.png`)})
 if(width===1440){
  await scroll(.65);await scroll(.7);await page.setViewportSize({width:1440,height:600});await scroll(.7)
  const short=await page.locator('.booking-body').evaluate(el=>({height:el.clientHeight,content:el.scrollHeight}))
  assert.ok(short.content>short.height,'short viewport should scroll the body')
  for(const name of ['Book now','Book on WhatsApp']){const b=await page.getByRole('button',{name,exact:true}).boundingBox();assert.ok(b.y>=0&&b.y+b.height<600)}
  await page.screenshot({path:path.join(output,'booking-short-desktop.png')});await page.setViewportSize({width:1440,height:800});await scroll(.7)
 }
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
 await checkLayout('.contact-card')
 await page.getByRole('button',{name:/Back to start/}).click();await page.waitForTimeout(6500)
 assert.ok(await page.getByRole('heading',{name:'Drive your journey.'}).isVisible())
 reports.push({width,whatsapp:message,layout,reset:true});await page.close()
}
const protectedFiles={
 'src/data/booking.js':'EDCA174DC0BA2DC0D00F52B4A8880F37E2276BF462EC101A651C3CA1DCCC7A4D',
 'src/data/brand.js':'3EF3BA431FF6126B39D9203EC1FAED77B867AD400161872D138D8D7E51DAAEA4',
 'src/data/cars.js':'AC7FBD64AA4051D6B1E7EEC9399E43A6B366465EC59F1348874398CE170D4FA2',
 'src/data/landmarks.js':'66DE592143A520AA9317CD831E1A500B834220307B146F5DC8EA46C9E3FFEB0E',
 'src/data/sections.js':'9D4FF539281BB83276C5FD846AFF49329D02050980FB95F0BDDBC35813F590D4',
 'src/data/services.js':'EA59DDAF0B68AD43C49F4547D2762AD44289339AD48D3EA9E6F1069FF73CE4F9',
 'src/lib/booking.js':'6552B3AFD5E060B6B8FF3B74BE8A6810E04104F6320714FFF76862A414529D09',
}
for(const [file,hash] of Object.entries(protectedFiles))assert.equal(createHash('sha256').update(await fs.readFile(file)).digest('hex').toUpperCase(),hash,`${file} changed`)
assert.deepEqual(messages,[])
await browser.close();await fs.writeFile(path.join(output,'report.json'),JSON.stringify({messages,reports,protectedFilesUnchanged:true},null,2))
console.log('PASS Step 6 polish: desktop/phone form, required errors, estimate, selected colour, WhatsApp fallback/buttons, reset, contact and sunset captures; no console warnings/errors.')
