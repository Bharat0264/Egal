import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json'))
const{chromium}=require('playwright'),output=path.resolve('assets/scene-polish-checks')
await fs.mkdir(output,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']})
const page=await browser.newPage({viewport:{width:1440,height:900}}),messages=[],external=[]
page.on('console',m=>{if(['warning','error'].includes(m.type()))messages.push(m.text())});page.on('pageerror',e=>messages.push(e.message))
page.on('request',r=>{if(!/^(http:\/\/localhost:|blob:|data:)/.test(r.url()))external.push(r.url())})
await page.goto('http://localhost:4173/');await page.getByRole('button',{name:/^START/}).click({timeout:45000})
async function scroll(offset){await page.evaluate(offset=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*offset},offset);await page.waitForTimeout(2600)}
await scroll(.28)
for(let i=0;i<2;i++){await page.getByRole('button',{name:'Previous car',exact:true}).click();await page.waitForTimeout(150)}
for(const car of[1,3,5]){
 if(car>1)for(let i=0;i<2;i++){await page.getByRole('button',{name:'Next car',exact:true}).click();await page.waitForTimeout(150)}
 await page.waitForTimeout(2000);assert.equal(await page.locator('.fleet-price:visible').count(),4)
 await page.screenshot({path:path.join(output,`production-fleet-${car}.png`)})
}
await scroll(.5);assert.equal(await page.locator('.service-info').count(),0);await page.screenshot({path:path.join(output,'production-services-no-card.png')})
await page.getByRole('button',{name:'Outstation',exact:true}).click();await page.waitForTimeout(1200);assert.ok(await page.locator('.service-info.is-left').isVisible());await page.screenshot({path:path.join(output,'production-services-outstation.png')})
await page.mouse.click(20,720);await page.waitForTimeout(200);assert.equal(await page.locator('.service-info').count(),0)
for(const offset of[.75,1]){await scroll(offset);await page.screenshot({path:path.join(output,`production-scroll-${offset}.png`)})}
await page.setViewportSize({width:390,height:844});await scroll(.28);await page.screenshot({path:path.join(output,'production-mobile-fleet.png')})
await scroll(.5);assert.equal(await page.locator('.service-info').count(),0);await page.screenshot({path:path.join(output,'production-mobile-services.png')})
await page.getByRole('button',{name:'Outstation',exact:true}).click();await page.waitForTimeout(900);await page.screenshot({path:path.join(output,'production-mobile-services-outstation.png')})
assert.deepEqual(messages,[]);assert.deepEqual(external,[])
await browser.close();await fs.writeFile(path.join(output,'production-report.json'),JSON.stringify({messages,external,fleet:[1,3,5],services:['none','outstation'],outsideShowcase:[.75,1],mobileWidth:390},null,2))
console.log('PASS built fleet/services polish: all requested desktop/phone captures, selection, click-only cards and dismissal, zero warnings or external requests.')
