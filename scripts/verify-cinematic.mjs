import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs/promises'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json')),{chromium}=require('playwright')
await fs.mkdir('assets/cinematic-checks',{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),reports=[]
for(const mode of ['desktop','mobile','reduced','low-power']){
 const width=mode==='mobile'?390:1440,page=await browser.newPage({viewport:{width,height:800},deviceScaleFactor:1,isMobile:mode==='mobile',hasTouch:mode==='mobile',reducedMotion:mode==='reduced'?'reduce':'no-preference'}),messages=[],requests=[]
 page.on('pageerror',e=>messages.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))messages.push(m.text())});page.on('request',r=>requests.push(r.url()))
 await page.addInitScript(()=>{window.open=()=>({})})
 if(mode==='low-power')await page.addInitScript(()=>Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>4}))
 await page.goto('http://localhost:4173/');await page.getByRole('button',{name:/^START/}).waitFor({timeout:60000});await page.waitForTimeout(3500)
 assert.ok(await page.locator('.opening-logo img').evaluate(e=>e.complete&&e.naturalWidth===2172))
 if(mode!=='desktop')assert.equal(await page.locator('.loader').getAttribute('data-static'),'true')
 assert.equal(await page.getByRole('button',{name:'Unmute sound'}).getAttribute('aria-pressed'),'false')
 await page.screenshot({path:`assets/cinematic-checks/${mode}-opening.png`})
 await page.getByRole('button',{name:'Unmute sound'}).click();assert.ok(await page.getByRole('status').filter({hasText:'No ambient audio'}).isVisible());await page.getByRole('button',{name:'Mute sound'}).click()
 if(mode==='reduced')await page.getByRole('button',{name:/Skip introduction/}).click()
 else await page.getByRole('button',{name:/^START/}).evaluate(button=>{button.click();button.click()})
 await page.waitForTimeout(2400);assert.equal(await page.locator('.loader').count(),0)
 async function scroll(offset){await page.evaluate(offset=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*offset},offset);await page.waitForTimeout(4500)}
 for(const offset of mode==='low-power'?[0,.7]:mode==='reduced'?[0,.28,.5,.7,.95,0]:[0,.11,.28,.5,.7,.95,1,0]){
  await scroll(offset)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  const visible=await page.locator('.section-copy').evaluateAll(elements=>elements.filter(e=>getComputedStyle(e).visibility==='visible'&&+getComputedStyle(e).opacity>.001).map(e=>e.getAttribute('aria-label')));assert.ok(visible.length<=1)
  await page.screenshot({path:`assets/cinematic-checks/${mode}-${offset}.png`})
  if(offset===.28){const old=await page.locator('.spec-count').innerText();await page.getByRole('button',{name:'Next car',exact:true}).click();assert.notEqual(await page.locator('.spec-count').innerText(),old);await page.getByRole('button',{name:'Car colour 5'}).click()}
  if(offset===.5){await page.getByRole('button',{name:'Outstation',exact:true}).click();assert.ok(await page.locator('.service-info').isVisible())}
  if(offset===.7){assert.equal(await page.locator('.service-info').count(),0);await page.getByRole('button',{name:'Book now',exact:true}).click();assert.ok(await page.locator('[aria-invalid=true]').count()>0)}
 }
 await page.getByRole('button',{name:/Book Now/}).click();await page.waitForTimeout(5000);assert.ok(await page.getByRole('form',{name:'Book Your Ride'}).isVisible())
 if(mode==='mobile'){await page.setViewportSize({width:844,height:390});await page.reload();await page.getByRole('button',{name:/^START/}).waitFor({timeout:60000});await page.screenshot({path:'assets/cinematic-checks/mobile-landscape-opening.png'});const box=await page.getByRole('button',{name:/^START/}).boundingBox();assert.ok(box.y+box.height<=390)}
 assert.equal(requests.filter(u=>/\/models\/car.opt.glb/.test(u)).length,mode==='mobile'?2:1);assert.ok(!requests.some(u=>/\/audio\//.test(u)))
 assert.deepEqual(messages,[]);reports.push({mode,width,messages,start:true,booking:true,soundPreference:true,scrollBothDirections:true});await page.close()
}
await browser.close();await fs.writeFile('assets/cinematic-checks/report.json',JSON.stringify(reports,null,2));console.log('PASS cinematic desktop/mobile/reduced motion, logo, duplicate START, skip, sound preference/no missing requests, scenes, controls, booking errors and landscape.')
