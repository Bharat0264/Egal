import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json')),{chromium}=require('playwright')
const output=path.resolve('assets/fleet-integration-checks');await fs.mkdir(output,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']})
const page=await browser.newPage({viewport:{width:1440,height:800}}),messages=[],requests=[],checks=[]
page.on('pageerror',e=>messages.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))messages.push(m.text())});page.on('request',r=>requests.push(r.url()))
await page.goto('http://localhost:4173/');await page.getByRole('button',{name:/^START/}).waitFor({timeout:45000});await page.waitForTimeout(1200)
assert.ok(!requests.some(url=>url.includes('/models/fleet/')))
const initial=await page.evaluate(()=>{
 const resources=performance.getEntriesByType('resource').filter(e=>/^http/.test(e.name)),navigation=performance.getEntriesByType('navigation')[0]
 return {bytes:resources.reduce((sum,e)=>sum+e.decodedBodySize,0)+navigation.decodedBodySize,transfer:resources.reduce((sum,e)=>sum+e.transferSize,0)+navigation.transferSize,resources:resources.map(e=>({url:e.name,bytes:e.decodedBodySize,transfer:e.transferSize}))}
})
assert.ok(initial.bytes<8000000,`initial payload ${initial.bytes} exceeds 8 MB`)
await page.getByRole('button',{name:/^START/}).click()
async function scroll(offset){await page.evaluate(offset=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*offset},offset);await page.waitForTimeout(6500)}
for(const width of[1440,390]){
 await page.setViewportSize({width,height:width===1440?800:844});await scroll(.28)
 while(!(await page.locator('.spec-count').innerText()).startsWith('01')){await page.getByRole('button',{name:'Previous car',exact:true}).click();await page.waitForTimeout(350)}
 for(let selected=1;selected<=5;selected++){
  console.log('Capture fallback',width,selected)
  if(selected>1){await page.getByRole('button',{name:'Next car',exact:true}).click();await page.waitForTimeout(350)}
  await page.waitForTimeout(2400)
  assert.ok((await page.locator('.spec-count').innerText()).startsWith(`0${selected}`));assert.equal(await page.locator('.fleet-price:visible').count(),4)
  const boxes=await page.evaluate(()=>{
   const rect=e=>{const b=e.getBoundingClientRect();return{left:b.left,right:b.right,top:b.top,bottom:b.bottom}}
   return{tags:[...document.querySelectorAll('.fleet-price')].filter(e=>getComputedStyle(e).display!=='none').map(rect),ui:[...document.querySelectorAll('.fleet-spec,.book,[aria-label="fleet"] h1,.fleet-navigation')].map(rect)}
  })
  const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top
  for(let i=0;i<boxes.tags.length;i++){
   assert.ok(boxes.tags[i].left>=0&&boxes.tags[i].right<=width,'tag off screen')
   for(const other of boxes.tags.slice(i+1))assert.ok(!overlaps(boxes.tags[i],other),'tags overlap')
   for(const other of boxes.ui)assert.ok(!overlaps(boxes.tags[i],other),'tag overlaps UI')
  }
  await page.screenshot({path:path.join(output,`fallback-${width}-${selected}.png`)});checks.push({width,selected,boxes})
 }
}
assert.ok(!requests.some(url=>url.includes('/models/fleet/')),'missing files should not issue 404 requests')
assert.deepEqual(messages,[])
await browser.close()
const types=['hatchback','sedan','suv','premium-suv','luxury-suv'],models=[]
for(const type of types){
 let found=null
 for(const name of[`car-${type}.opt.glb`,`car-${type}-opt.glb`,`car-${type}.glb`]){try{const stat=await fs.stat(`public/models/fleet/${name}`);found={file:name,bytes:stat.size};break}catch{}}
 models.push({type,...(found||{file:`car-${type}.glb`,bytes:null,status:'missing'})})
}
const heroHashes={'src/scene/Car.jsx':'0388734F505E1C5C0A2B68279986074B647893AF5529C52A35746504BDFA2CD5','public/models/car.glb':'300636EA03E4E8688CDD73830E8DD2B347D5CB857075D3566DC1549A262A5148','public/models/car.opt.glb':'3FB5F3D2C15C00A8BBDE43A0867BB34EA5F3A47FEE59E23FA93CBD2E43C5136D'}
for(const[file,hash]of Object.entries(heroHashes))assert.equal(createHash('sha256').update(await fs.readFile(file)).digest('hex').toUpperCase(),hash)
await fs.writeFile(path.join(output,'report.json'),JSON.stringify({models,totalFleetPayload:models.some(m=>m.bytes===null)?null:models.reduce((sum,m)=>sum+m.bytes,0),initial,checks,messages,heroUnchanged:true,screenshotsUseHeroFallback:true},null,2))
console.log('PASS all 5 selections on desktop/phone, no overlaps, initial bytes',initial.bytes,'hero unchanged. Actual fleet files remain missing.')
