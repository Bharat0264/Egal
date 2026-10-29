import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json')),{chromium}=require('playwright')
const output=path.resolve('assets/transition-checks');await fs.mkdir(output,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']})
const page=await browser.newPage({viewport:{width:1440,height:800}}),messages=[],samples=[]
page.on('pageerror',e=>messages.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))messages.push(m.text())})
console.log('Loading production scene');await page.goto('http://localhost:4173/');await page.getByRole('button',{name:/^START/}).click({timeout:45000})
async function scroll(offset){await page.evaluate(offset=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*offset},offset);await page.waitForTimeout(6500)}
for(const width of[1440,390]){
 await page.setViewportSize({width,height:width===1440?800:844})
 for(const offset of[.55,.58,.60,.62,.65,.70,.95,1]){
  console.log(`Checking ${width}px at ${offset}`);await scroll(offset)
  const visible=await page.evaluate(()=>[...document.querySelectorAll('.section-copy')].filter(e=>getComputedStyle(e).visibility==='visible'&&+getComputedStyle(e).opacity>.001).map(e=>e.getAttribute('aria-label')))
  assert.ok(visible.length<=1,`overlapping text at ${offset}`)
  if([.58,.6].includes(offset))assert.equal(visible.length,0)
  if(offset===.55)assert.deepEqual(visible,['services'])
  if(offset>=.62&&offset<=.70)assert.deepEqual(visible,['booking'])
  if(offset>=.95)assert.deepEqual(visible,['contact'])
  if(offset>.97)assert.equal(await page.locator('.overlay footer').evaluate(e=>getComputedStyle(e).visibility),'hidden')
  assert.deepEqual(messages,[])
  await page.screenshot({path:path.join(output,`scene-${offset}-${width}.png`)})
  samples.push({width,offset,visible})
 }
}
// Open a service card and leave its scene: it must close, not linger invisibly.
await scroll(.5);await page.getByRole('button',{name:'Outstation',exact:true}).click();assert.equal(await page.locator('.service-info').count(),1)
await scroll(.62);assert.equal(await page.locator('.service-info').count(),0)
await page.getByRole('button',{name:/Book Now/}).click();await page.waitForTimeout(6500)
assert.ok(await page.getByRole('form',{name:'Book Your Ride'}).isVisible())
await browser.close();await fs.writeFile(path.join(output,'report.json'),JSON.stringify({messages,samples,serviceCardCleared:true,bookingJumpVisible:true},null,2))
console.log('PASS desktop/phone transitions, exclusive UI, empty handoffs, contact endpoint, scroll-hint hiding and card dismissal; no console warnings/errors.')
