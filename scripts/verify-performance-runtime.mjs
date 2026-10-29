import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs/promises'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json')),{chromium}=require('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1440,height:800}}),messages=[]
page.on('pageerror',e=>messages.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))messages.push(m.text())})
await page.goto('http://localhost:5173/');await page.getByRole('button',{name:/^START/}).click({timeout:60000})
await page.evaluate(async()=>{const e=performance.getEntriesByType('resource').find(e=>/@react-three_fiber\.js/.test(e.name)),fiber=await import(e.name);window.store=fiber._roots.get(document.querySelector('canvas')).store;window.scroller=[...document.querySelectorAll('div')].find(e=>e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto')})
async function scroll(offset){await page.evaluate(offset=>window.scroller.scrollTop=(window.scroller.scrollHeight-window.scroller.clientHeight)*offset,offset);await page.waitForTimeout(4500)}
const memory=[]
for(let cycle=0;cycle<2;cycle++){
 for(const offset of[0,.28,.5,.7,.95,1])await scroll(offset)
 memory.push(await page.evaluate(()=>({...window.store.getState().gl.info.memory,programs:window.store.getState().gl.info.programs.length})))
}
assert.equal(memory[0].geometries,memory[1].geometries);assert.equal(memory[0].textures,memory[1].textures)
await scroll(0);await page.waitForTimeout(1800)
const mutations=await page.evaluate(async()=>{let count=0;const observer=new MutationObserver(records=>count+=records.length);for(const el of document.querySelectorAll('.section-copy,.journey-progress,.overlay footer'))observer.observe(el,{attributes:true});await new Promise(r=>setTimeout(r,500));observer.disconnect();return count})
assert.equal(mutations,0,'stationary overlay must stop rewriting DOM attributes')
const before=await page.evaluate(()=>window.store.getState().clock.elapsedTime)
await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))})
await page.waitForTimeout(300)
assert.equal(await page.evaluate(()=>window.store.getState().frameloop),'never')
await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))})
await page.waitForTimeout(300)
assert.equal(await page.evaluate(()=>window.store.getState().frameloop),'always')
const after=await page.evaluate(()=>window.store.getState().clock.elapsedTime);assert.ok(after>=before&&after-before<1.5)
assert.deepEqual(messages,[]);await page.close()
const fallback=await browser.newPage()
await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args)}})
await fallback.goto('http://localhost:4173/');await fallback.getByRole('button',{name:/^START/}).click({timeout:60000})
assert.equal(await fallback.locator('.world-fallback').count(),1)
await fallback.getByRole('button',{name:/Book Now/}).click();await fallback.waitForTimeout(1500)
assert.ok(await fallback.getByRole('form',{name:'Book Your Ride'}).isVisible())
await browser.close();await fs.writeFile('assets/performance/runtime-checks.json',JSON.stringify({memory,mutations,hiddenTabPause:true,clockPreserved:true,webglFallbackBooking:true,messages},null,2))
console.log('PASS stable GPU resources over repeated journeys, idle overlay has zero mutations, hidden-tab pause/resume preserves animation time, and WebGL-disabled booking fallback.')
