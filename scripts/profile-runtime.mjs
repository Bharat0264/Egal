import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs/promises'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json'))
const {chromium}=require('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']})
const results=[]
for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:{width:mobile?390:1440,height:800},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile}),messages=[]
 page.on('pageerror',e=>messages.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))messages.push(m.text())})
 await page.addInitScript(()=>{window.metrics={longTasks:[],cls:0,lcp:0};for(const type of ['longtask','layout-shift','largest-contentful-paint'])new PerformanceObserver(list=>{for(const e of list.getEntries()){if(type==='longtask')window.metrics.longTasks.push(e.duration);if(type==='layout-shift'&&!e.hadRecentInput)window.metrics.cls+=e.value;if(type==='largest-contentful-paint')window.metrics.lcp=e.startTime}}).observe({type,buffered:true})})
 const cdp=await page.context().newCDPSession(page)
 if(mobile)await cdp.send('Emulation.setCPUThrottlingRate',{rate:4})
 await page.goto('http://localhost:5173/')
 await page.getByRole('button',{name:/^START/}).waitFor({timeout:120000})
 const ready=await page.evaluate(()=>performance.now());await page.getByRole('button',{name:/^START/}).click()
 await page.evaluate(async()=>{const entry=performance.getEntriesByType('resource').find(e=>/@react-three_fiber\.js/.test(e.name));const fiber=await import(entry.name);window.store=fiber._roots.get(document.querySelector('canvas')).store;window.scroller=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto')})
 const scenes=[]
 for(const offset of [0,.28,.5,.7,.95]){
  await page.evaluate(offset=>window.scroller.scrollTop=(window.scroller.scrollHeight-window.scroller.clientHeight)*offset,offset)
  await page.waitForTimeout(3500)
  scenes.push(await page.evaluate(async offset=>{const samples=[];let previous=performance.now();await new Promise(resolve=>{function frame(now){samples.push(now-previous);previous=now;if(samples.length<45)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)});samples.shift();samples.sort((a,b)=>a-b);const {gl,scene}=window.store.getState();let meshes=0;scene.traverse(o=>{if(o.isMesh)meshes++});return{offset,frameMedian:samples[Math.floor(samples.length*.5)],frameP95:samples[Math.floor(samples.length*.95)],calls:gl.info.render.calls,triangles:gl.info.render.triangles,geometries:gl.info.memory.geometries,textures:gl.info.memory.textures,programs:gl.info.programs.length,meshes,dpr:gl.getPixelRatio(),heap:performance.memory?.usedJSHeapSize}},offset))
 }
 results.push({profile:mobile?'390px, DPR2, CPU4x':'1440px, DPR1, CPU1x',renderer:await page.evaluate(()=>{const gl=document.querySelector('canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown'}),ready,scenes,metrics:await page.evaluate(()=>({...window.metrics,decodedBytes:performance.getEntriesByType('resource').reduce((n,r)=>n+r.decodedBodySize,0)})),messages})
 await page.close()
}
await browser.close()
const file=process.argv[2]||'assets/performance/baseline.json';await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2))
