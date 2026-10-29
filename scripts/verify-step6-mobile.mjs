import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json')),{chromium}=require('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']})
const page=await browser.newPage({viewport:{width:390,height:844}}),messages=[]
page.on('pageerror',e=>messages.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))messages.push(m.text())})
await page.goto('http://localhost:4173/');await page.getByRole('button',{name:/^START/}).click({timeout:45000})
for(const offset of [.95,1]) {
 await page.evaluate(offset=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*offset},offset);await page.waitForTimeout(6500)
 await page.screenshot({path:`assets/step6-checks/contact-${offset}-390.png`})
 const top=await page.locator('.contact-card').evaluate(e=>e.getBoundingClientRect().top);assert.ok(top>340)
}
assert.deepEqual(messages,[]);await browser.close();await fs.writeFile('assets/step6-checks/mobile-framing-report.json',JSON.stringify({messages,width:390,contact:[.95,1]},null,2))
console.log('PASS final phone destination framing; no console warnings/errors.')
