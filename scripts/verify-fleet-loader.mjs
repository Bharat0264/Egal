import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json')),{chromium}=require('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']})
const page=await browser.newPage({viewport:{width:1440,height:800}}),requests=[],messages=[],types=['hatchback','sedan','suv','premium-suv','luxury-suv']
const buffer=await fs.readFile('public/models/car.opt.glb')
// Browser-only test fixtures use the hero bytes. They are never saved as fleet models.
await page.addInitScript(types=>{
 const assets={model:'car.opt.glb',logo:false,fleet:Object.fromEntries(types.map(type=>[type,`car-${type}.glb`]))}
 Object.defineProperty(globalThis,'__EGAL_ASSETS__',{get:()=>assets,set:()=>{},configurable:true})
},types)
await page.route('**/models/fleet/*.glb',async route=>{
 const name=route.request().url().split('/').pop();requests.push(name)
 await route.fulfill({status:200,contentType:'model/gltf-binary',body:name==='car-suv.glb'?Buffer.from('invalid glb fixture'):buffer})
})
page.on('pageerror',e=>messages.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))messages.push(m.text())})
await page.goto('http://localhost:5173/');await page.getByRole('button',{name:/^START/}).waitFor({timeout:45000});await page.waitForTimeout(1200);assert.equal(requests.length,0)
await page.getByRole('button',{name:/^START/}).click()
async function scroll(offset){await page.evaluate(offset=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*offset},offset);await page.waitForTimeout(4500)}
await scroll(.08);assert.equal(requests.length,0)
await scroll(.12)
// A synchronous predicate polls after the dynamic import has populated a stable reference.
await page.evaluate(async()=>{window.__fleetModule=await import('/src/scene/showcase/fleetAssets.js')})
await page.waitForFunction(()=>Object.values(window.__fleetModule.fleetAssetStatus()).every(s=>['ready','failed'].includes(s)),null,{timeout:45000})
const status=await page.evaluate(()=>window.__fleetModule.fleetAssetStatus())
assert.equal(requests.length,5);for(const type of types)assert.equal(status[type],type==='suv'?'failed':'ready')
await scroll(.28)
async function inspect(){return page.evaluate(async()=>{
 const entry=performance.getEntriesByType('resource').find(e=>/@react-three_fiber\.js/.test(e.name)),fiber=await import(entry.name),{scene}=fiber._roots.get(document.querySelector('canvas')).store.getState()
 return ['hatchback','sedan','suv','premium-suv','luxury-suv'].map(type=>{
  const root=scene.getObjectByName(`fleet-car-${type}`),model=root.getObjectByName(`parked-model-${type}`)
  return{type,...model.userData,materials:model.children.map(mesh=>({name:mesh.material.name,color:mesh.material.color.getHexString(),uuid:mesh.material.uuid}))}
 })
})}
const before=await inspect();for(const model of before)assert.equal(model.modelStatus,model.type==='suv'?'hero-fallback':'fleet')
await page.getByRole('button',{name:'Next car',exact:true}).click();await page.getByRole('button',{name:'Car colour 5',exact:true}).click();await page.waitForTimeout(1800)
const after=await inspect()
for(let i=0;i<5;i++)for(let j=0;j<before[i].materials.length;j++)if(i!==3||before[i].materials[j].name!=='BodyPaint')assert.equal(after[i].materials[j].color,before[i].materials[j].color)
const paintIds=after.flatMap(m=>m.materials.filter(p=>p.name==='BodyPaint').map(p=>p.uuid));assert.equal(new Set(paintIds).size,5)
const slider=page.getByRole('slider',{name:'Rotate selected car'});await slider.focus();await slider.press('ArrowRight');await page.waitForTimeout(500);assert.notEqual(await slider.getAttribute('aria-valuenow'),'0')
assert.deepEqual(messages,[]);await browser.close()
await fs.mkdir('assets/fleet-integration-checks',{recursive:true});await fs.writeFile('assets/fleet-integration-checks/loader-fixture-report.json',JSON.stringify({fixture:'hero bytes routed in-browser only; SUV deliberately invalid',requests,status,before,after,messages},null,2))
console.log('PASS lazy threshold/idle loading, all 5 paths, invalid GLB hero fallback, independent paint materials, recolouring and rotation (browser-only fixtures).')
