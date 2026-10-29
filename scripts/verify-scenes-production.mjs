import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json'))
const {chromium}=require('playwright'),output=path.resolve('assets/scene-checks')
await fs.mkdir(output,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']})
const page=await browser.newPage({viewport:{width:1440,height:900}}),messages=[],external=[]
page.on('console',m=>{if(['warning','error'].includes(m.type()))messages.push(m.text())})
page.on('pageerror',e=>messages.push(e.message))
page.on('request',r=>{if(!/^(http:\/\/localhost:|blob:|data:)/.test(r.url()))external.push(r.url())})
await page.goto('http://localhost:4173/')
await page.getByRole('button',{name:/^START/}).click({timeout:45000})
async function scroll(value){await page.evaluate(value=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*value},value);await page.waitForTimeout(2600)}
for(const[label,offset]of[['hero',0],['fleet',.25],['fleet-anchor',.28],['services',.5],['city',.75],['sunset',1]]){
 await scroll(offset);await page.screenshot({path:path.join(output,`production-${label}.png`)})
}
await scroll(.28)
const before=await page.locator('.fleet-spec h2').innerText();await page.getByRole('button',{name:'Next car',exact:true}).click();await page.waitForTimeout(800);assert.notEqual(await page.locator('.fleet-spec h2').innerText(),before)
await page.getByRole('button',{name:'Car colour 3',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Car colour 3',exact:true}).getAttribute('aria-pressed'),'true')
await page.getByRole('button',{name:'Book this car'}).click();await page.waitForTimeout(2700);assert.match(await page.locator('.booking-selection').innerText(),/Your selected ride/)
await scroll(.5);await page.getByRole('button',{name:'Outstation',exact:true}).click();await page.waitForTimeout(900);await page.getByRole('complementary',{name:'Outstation details'}).waitFor();await page.screenshot({path:path.join(output,'production-service-info.png')})
await page.getByRole('button',{name:/^Book now/}).click();await page.waitForTimeout(2200)
for(const width of[390,375]){
 await page.setViewportSize({width,height:844})
 for(const[label,offset]of[['fleet',.28],['services',.5]]){
   await scroll(offset)
   if(label==='services'){await page.getByRole('button',{name:'Chauffeur',exact:true}).click();await page.waitForTimeout(750)}
   await page.screenshot({path:path.join(output,`production-mobile-${width}-${label}.png`)})
 }
}
const load=await page.evaluate(()=>[...performance.getEntriesByType('navigation'),...performance.getEntriesByType('resource')].reduce((s,e)=>({encoded:s.encoded+e.encodedBodySize,decoded:s.decoded+e.decodedBodySize}),{encoded:0,decoded:0}))
assert.deepEqual(messages,[]);assert.deepEqual(external,[])
await browser.close()
await fs.writeFile(path.join(output,'production-report.json'),JSON.stringify({messages,external,load,loadMeasurement:'Main-document performance entries. The local 757076-byte TTF fetched by the text worker is additional and may not appear in these entries.',desktopOffsets:[0,.25,.28,.5,.75,1],mobileWidths:[390,375],interactions:true},null,2))
console.log('PASS production scenes, local font, cards, selection and booking; desktop/mobile; zero warnings.',JSON.stringify(load))
