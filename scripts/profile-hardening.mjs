import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json')),{chromium}=require('playwright'),browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),reports=[]
for(const mobile of[false,true]){
 const page=await browser.newPage({viewport:{width:mobile?390:1440,height:844},deviceScaleFactor:mobile?2:1}),messages=[]
 page.on('pageerror',e=>messages.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))messages.push(m.text())})
 const cdp=await page.context().newCDPSession(page);if(mobile)await cdp.send('Emulation.setCPUThrottlingRate',{rate:4})
 await page.goto('http://localhost:5173/');await page.getByRole('button',{name:/^START/}).click();await page.locator('canvas[data-quality]').waitFor({timeout:60000});await page.waitForTimeout(5000)
 const device=await page.evaluate(async()=>{const entry=performance.getEntriesByType('resource').find(e=>/@react-three_fiber\.js/.test(e.name));const fiber=await import(entry.name);window.__store=fiber._roots.get(document.querySelector('canvas')).store;const gl=window.__store.getState().gl.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return{renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),cores:navigator.hardwareConcurrency,memory:navigator.deviceMemory}})
 async function scroll(offset){await page.evaluate(offset=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*offset},offset);await page.waitForTimeout(3500)}
 const scenes=[]
 for(const offset of[0,.28,.5,.7,.95,1]){
  await scroll(offset)
  if(offset===.28){const heading=page.locator('.fleet-spec h2'),old=await heading.innerText();await page.getByRole('button',{name:'Next car',exact:true}).click();assert.notEqual(await heading.innerText(),old);await page.getByRole('button',{name:'Car colour 5',exact:true}).click();const pad=page.getByRole('slider',{name:'Rotate selected car'});await pad.focus();const angle=await pad.getAttribute('aria-valuenow');await pad.press('ArrowRight');await page.waitForTimeout(200);assert.notEqual(await pad.getAttribute('aria-valuenow'),angle)}
  if(offset===.5){await page.getByRole('button',{name:'Outstation',exact:true}).click();assert.ok(await page.locator('.service-info').isVisible())}
  if(offset===.7)assert.equal(await page.locator('.service-info').count(),0)
  scenes.push(await page.evaluate(async offset=>{const times=[];let prev=performance.now();await new Promise(resolve=>{const tick=now=>{times.push(now-prev);prev=now;times.length<50?requestAnimationFrame(tick):resolve()};requestAnimationFrame(tick)});times.shift();times.sort((a,b)=>a-b);const s=window.__store.getState();return{offset,medianMs:times[Math.floor(times.length*.5)],p95Ms:times[Math.floor(times.length*.95)],drawCalls:s.gl.info.render.calls,triangles:s.gl.info.render.triangles,dpr:s.gl.getPixelRatio(),quality:s.gl.domElement.dataset.quality}},offset))
 }
 const memoryBefore=await page.evaluate(()=>({...window.__store.getState().gl.info.memory}))
 for(const offset of[.95,.7,.5,.28,0])await scroll(offset)
 const memoryAfter=await page.evaluate(()=>({...window.__store.getState().gl.info.memory}));assert.deepEqual(memoryAfter,memoryBefore)
 await page.locator('.book').click();await page.waitForTimeout(2500);assert.ok(await page.getByRole('form',{name:'Book Your Ride'}).isVisible());await scroll(1);await page.getByRole('button',{name:/Back to start/}).click();await page.waitForTimeout(3000);assert.ok(await page.locator('.section-copy[aria-label=hero]').isVisible())
 assert.deepEqual(messages,[]);reports.push({width:mobile?390:1440,cpuThrottle:mobile?4:1,device,scenes,memoryBefore,memoryAfter,messages});await page.close()
}
await browser.close();await fs.writeFile('assets/hardening-checks/runtime.json',JSON.stringify(reports,null,2));console.log('PASS measured scene pacing/draw calls, fleet keyboard controls/colour/selection, services open/close, reverse journey resource stability, Book Now and back-to-start at desktop and CPU-throttled phone sizes.')
