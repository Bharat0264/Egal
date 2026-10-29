import assert from 'node:assert/strict'
import path from 'node:path'
import {createRequire} from 'node:module'
import {fleetModels} from '../src/data/fleetModels.js'
const types=['hatchback','sedan','suv','premium-suv','luxury-suv'],scales=[.9,1,1.05,1.1,1.15]
for(let i=0;i<5;i++){assert.equal(fleetModels[types[i]].file,`car-${types[i]}.glb`);assert.equal(fleetModels[types[i]].fallbackScale,scales[i])}
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json')),{chromium}=require('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']})
const page=await browser.newPage(),requests=[],messages=[]
page.on('request',r=>{if(r.url().includes('/models/fleet/'))requests.push(r.url())});page.on('pageerror',e=>messages.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))messages.push(m.text())})
await page.goto('http://localhost:5173/');await page.getByRole('button',{name:/^START/}).waitFor({timeout:45000});assert.equal(requests.length,0)
await page.getByRole('button',{name:/^START/}).click()
async function scroll(offset){await page.evaluate(offset=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*offset},offset);await page.waitForTimeout(4500)}
await scroll(.08)
const before=await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/src/scene/showcase/fleetAssets.js')).name;const{fleetAssetStatus}=await import(url);return fleetAssetStatus()});assert.ok(Object.values(before).every(s=>s==='idle'))
await scroll(.28)
await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/src/scene/showcase/fleetAssets.js')).name;window.__liveFleet=await import(url)})
await page.waitForFunction(()=>Object.values(window.__liveFleet.fleetAssetStatus()).every(s=>s==='missing'),null,{timeout:25000})
await page.evaluate(async()=>{const entry=performance.getEntriesByType('resource').find(e=>/@react-three_fiber\.js/.test(e.name)),fiber=await import(entry.name);window.__fleetStore=fiber._roots.get(document.querySelector('canvas')).store})
await page.waitForFunction(()=>['hatchback','sedan','suv','premium-suv','luxury-suv'].every((type,i)=>Math.abs(window.__fleetStore.getState().scene.getObjectByName(`fleet-car-${type}`).scale.x-[.9,1,1.05*1.18,1.1,1.15][i])<.005),null,{timeout:25000,polling:1000})
const result=await page.evaluate(async()=>{
 const{fleetAssetStatus}=window.__liveFleet,entry=performance.getEntriesByType('resource').find(e=>/@react-three_fiber\.js/.test(e.name)),fiber=await import(entry.name),{scene}=fiber._roots.get(document.querySelector('canvas')).store.getState(),{getCarModel}=await import('/src/data/cars.js')
 return {status:fleetAssetStatus(),models:['hatchback','sedan','suv','premium-suv','luxury-suv'].map(type=>{const root=scene.getObjectByName(`fleet-car-${type}`),model=root.getObjectByName(`parked-model-${type}`);return{type,url:getCarModel(type),scale:root.scale.x,...model.userData}})}
})
assert.ok(Object.values(result.status).every(s=>s==='missing'))
for(let i=0;i<5;i++){assert.equal(result.models[i].url,`/models/fleet/car-${types[i]}.glb`);assert.equal(result.models[i].modelStatus,'hero-fallback');assert.ok(Math.abs(result.models[i].scale-scales[i]*(i===2?1.18:1))<.01)}
assert.deepEqual(requests,[]);assert.deepEqual(messages,[])
await browser.close();console.log('PASS manifest paths, requested fallback scales, deferred threshold and silent missing-file fallback; no model-size or screenshot checks.')
