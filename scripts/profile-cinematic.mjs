import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json')),{chromium}=require('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),reports=[]
for(const mobile of [false,true]){
 const width=mobile?390:1440,page=await browser.newPage({viewport:{width,height:800},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile}),requests=[],messages=[]
 page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>messages.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))messages.push(m.text())})
 await page.addInitScript(()=>{window.metrics={lcp:0,cls:0};for(const type of ['largest-contentful-paint','layout-shift'])new PerformanceObserver(list=>{for(const e of list.getEntries()){if(type==='largest-contentful-paint')window.metrics.lcp=e.startTime;else if(!e.hadRecentInput)window.metrics.cls+=e.value}}).observe({type,buffered:true})})
 const cdp=await page.context().newCDPSession(page);if(mobile)await cdp.send('Emulation.setCPUThrottlingRate',{rate:4})
 await page.goto('http://localhost:4173/');await page.getByRole('button',{name:/^START/}).waitFor({timeout:60000})
 const initial=await page.evaluate(()=>({ready:performance.now(),...window.metrics,resources:performance.getEntriesByType('resource').map(e=>({url:e.name,bytes:e.decodedBodySize})),bytes:performance.getEntriesByType('resource').reduce((s,e)=>s+e.decodedBodySize,0)}))
 assert.equal(requests.filter(url=>/\/fonts\//.test(url)).length,0,'3D sign font must not load initially')
 assert.equal(requests.filter(url=>/\/models\/fleet\//.test(url)).length,0)
 await page.getByRole('button',{name:/^START/}).click()
 const scenes=[]
 for(const offset of[0,.28,.5,.7,.95,1]){
  await page.evaluate(offset=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*offset},offset)
  await page.waitForTimeout(4500)
  const sample=await page.evaluate(async()=>{
   const times=[];let previous=performance.now();await new Promise(resolve=>{function tick(now){times.push(now-previous);previous=now;if(times.length<45)requestAnimationFrame(tick);else resolve()}requestAnimationFrame(tick)})
   times.shift();times.sort((a,b)=>a-b)
   return{median:times[Math.floor(times.length*.5)],p95:times[Math.floor(times.length*.95)],visible:[...document.querySelectorAll('.section-copy')].filter(e=>getComputedStyle(e).visibility==='visible'&&+getComputedStyle(e).opacity>.001).map(e=>e.getAttribute('aria-label')),overflow:document.documentElement.scrollWidth>innerWidth}
  })
  assert.ok(sample.visible.length<=1);assert.equal(sample.overflow,false)
  await page.screenshot({path:`assets/cinematic-checks/production-${width}-${offset}.png`});scenes.push({offset,...sample})
  if(offset===.28){
   const heading=page.locator('.fleet-spec h2'),before=await heading.innerText()
   await page.getByRole('button',{name:'Next car',exact:true}).click();assert.notEqual(await heading.innerText(),before)
   await page.getByRole('button',{name:'Car colour 5',exact:true}).click()
   const pad=page.getByRole('slider',{name:'Rotate selected car'});await pad.focus();const angle=+(await pad.getAttribute('aria-valuenow'));await pad.press('ArrowRight');await page.waitForTimeout(100);assert.notEqual(+(await pad.getAttribute('aria-valuenow')),angle)
  }
  if(offset===.5){await page.getByRole('button',{name:'Outstation',exact:true}).click();assert.ok(await page.locator('.service-info').isVisible())}
  if(offset===.7)assert.equal(await page.locator('.service-info').count(),0)
 }
 assert.equal(requests.filter(url=>url.includes('/models/car.opt.glb')).length,1)
 assert.deepEqual(messages,[])
 await page.evaluate(()=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=0});await page.waitForTimeout(2000)
 const activeScroll=await page.evaluate(async()=>{
  const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto'),samples=[],start=performance.now();let previous=start
  await new Promise(resolve=>{function frame(now){const t=Math.min(1,(now-start)/8000);samples.push(now-previous);previous=now;el.scrollTop=(el.scrollHeight-el.clientHeight)*(1-Math.cos(t*Math.PI))/2;if(t<1)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)})
  samples.shift();samples.sort((a,b)=>a-b);return{frames:samples.length,median:samples[Math.floor(samples.length*.5)],p95:samples[Math.floor(samples.length*.95)]}
 })
 reports.push({width,cpuThrottle:mobile?4:1,initial,scenes,activeScroll,messages})
 await page.close()
}
await browser.close();await fs.writeFile('assets/cinematic-checks/production.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports.map(({width,cpuThrottle,initial,scenes,activeScroll,messages})=>({width,cpuThrottle,initialBytes:initial.bytes,ready:initial.ready,lcp:initial.lcp,cls:initial.cls,scenes,activeScroll,messages})),null,2))
