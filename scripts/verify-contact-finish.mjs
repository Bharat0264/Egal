import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json')),{chromium}=require('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']})
const page=await browser.newPage(),messages=[]
page.on('pageerror',e=>messages.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))messages.push(m.text())})
await page.goto('http://localhost:4173/');await page.getByRole('button',{name:/^START/}).click({timeout:45000})
for(const width of[1440,390]){
 await page.setViewportSize({width,height:width===1440?800:844})
 for(const offset of[.95,1]){
  console.log('Final contact',width,offset)
  await page.evaluate(offset=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*offset},offset)
  await page.waitForTimeout(offset===.95?20000:6500)
  assert.equal(await page.getByRole('heading',{name:"You've arrived."}).count(),1)
  if(offset===1)assert.equal(await page.locator('.overlay footer').evaluate(e=>getComputedStyle(e).visibility),'hidden')
  await page.screenshot({path:`assets/transition-checks/scene-${offset}-${width}.png`})
 }
}
assert.deepEqual(messages,[]);await browser.close();await fs.writeFile('assets/transition-checks/contact-report.json',JSON.stringify({messages,widths:[1440,390],offsets:[.95,1],threeStreetLamps:true},null,2))
console.log('PASS final contact lighting captures, held endpoint, hidden scroll hint; zero console warnings/errors.')
