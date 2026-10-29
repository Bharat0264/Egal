import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json'))
const{chromium}=require('playwright'),output=path.resolve('assets/small-polish-checks')
await fs.mkdir(output,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']})
const page=await browser.newPage({viewport:{width:1440,height:900}}),messages=[],external=[]
page.on('console',m=>{if(['warning','error'].includes(m.type()))messages.push(m.text())});page.on('pageerror',e=>messages.push(e.message))
page.on('request',r=>{if(!/^(http:\/\/localhost:|blob:|data:)/.test(r.url()))external.push(r.url())})
await page.goto('http://localhost:4173/');await page.getByRole('button',{name:/^START/}).click({timeout:45000})
async function scroll(offset){await page.evaluate(offset=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*offset},offset);await page.waitForTimeout(6500)}
const checks=[]
for(const width of [1440,390]) {
 await page.setViewportSize({width,height:width===1440?900:844});await scroll(.28)
 // Let the damped scroll settle before exercising real pointer clicks.
 while(!(await page.locator('.spec-count').innerText()).startsWith('01')){await page.getByRole('button',{name:'Previous car',exact:true}).click();await page.waitForTimeout(350)}
 for(const car of [1,3,5]) {
  if(car>1)for(let i=0;i<2;i++){await page.getByRole('button',{name:'Next car',exact:true}).click();await page.waitForTimeout(350)}
  await page.waitForTimeout(2400)
  assert.ok((await page.locator('.spec-count').innerText()).startsWith(`0${car}`))
  assert.equal(await page.locator('.fleet-price:visible').count(),4)
  assert.deepEqual(await page.locator('.car-specs dt').allTextContents(),['Seats','Fuel','Price'])
  const boxes=await page.evaluate(()=>{
   const rect=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,text:e.innerText}}
   return {tags:[...document.querySelectorAll('.fleet-price')].filter(e=>getComputedStyle(e).display!=='none').map(rect),ui:[...document.querySelectorAll('.fleet-spec,.book,[aria-label="fleet"] h1,.fleet-navigation')].map(rect)}
  })
  await page.screenshot({path:path.join(output,`fleet-${width}-${car}.png`)})
  const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top
  for(let i=0;i<boxes.tags.length;i++){
   for(const b of boxes.tags.slice(i+1))assert.ok(!overlap(boxes.tags[i],b),'overlapping tags')
   assert.ok(boxes.tags[i].left>=0&&boxes.tags[i].right<=width,'tag off screen')
   for(const b of boxes.ui)assert.ok(!overlap(boxes.tags[i],b),`tag overlaps ${b.text}`)
  }
  checks.push({width,car,boxes});await page.screenshot({path:path.join(output,`fleet-${width}-${car}.png`)})
 }
 await scroll(.5);assert.equal(await page.locator('.service-info').count(),0)
 await page.screenshot({path:path.join(output,`services-${width}.png`)})
}
assert.deepEqual(messages,[]);assert.deepEqual(external,[])
await browser.close();await fs.writeFile(path.join(output,'production-report.json'),JSON.stringify({messages,external,checks},null,2))
console.log('PASS fleet selections 1/3/5 and services at 1440/390px; tags clear of UI, price caption once, zero warnings or external requests.')
