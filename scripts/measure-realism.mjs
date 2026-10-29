import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json')),{chromium}=require('playwright'),browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),results=[]
const label=process.argv[2]||'before';const quick=process.argv.includes('--quick')
const base=process.env.EGAL_PERF_URL||'http://localhost:4173'
await fs.mkdir('assets/realism-pass',{recursive:true})
for(const mobile of[false,true]){
 const page=await browser.newPage({viewport:{width:mobile?390:1440,height:844},deviceScaleFactor:mobile?2:1.5}),errors=[]
 page.on('console',m=>{if(['warning','error'].includes(m.type()))errors.push(m.text())});page.on('pageerror',e=>errors.push(e.message))
 const cdp=await page.context().newCDPSession(page);if(mobile)await cdp.send('Emulation.setCPUThrottlingRate',{rate:4})
 const environmentFps=await page.evaluate(async()=>{const times=[];let previous=performance.now();await new Promise(resolve=>{const tick=now=>{times.push(now-previous);previous=now;if(times.length<45)requestAnimationFrame(tick);else resolve()};requestAnimationFrame(tick)});times.sort((a,b)=>a-b);return 1000/times[22]})
 await page.goto(base+'/?debug=perf');await page.getByRole('button',{name:/^START/}).click({timeout:120000});await page.waitForFunction(()=>window.__EGAL_PERF__?.get,{timeout:120000});await page.waitForTimeout(quick?2000:6000)
 const device=await page.evaluate(()=>{const s=window.__EGAL_PERF__.get(),gl=s.gl.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return{renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),cores:navigator.hardwareConcurrency,memory:navigator.deviceMemory}})
 const scenes=[]
 for(const offset of[0,.25,.5,.75,1]){
  await page.evaluate(offset=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*offset;window.__perfTransitions={before:window.__EGAL_PERF__.get().gl.info.programs.length,tasks:[],start:performance.now()};window.__perfObserver?.disconnect();window.__perfObserver=new PerformanceObserver(list=>window.__perfTransitions.tasks.push(...list.getEntries().map(e=>e.duration)));window.__perfObserver.observe({type:'longtask'})},offset)
  await page.waitForTimeout(quick?1800:3500)
  const row=await page.evaluate(async ({offset,quick})=>{
   const store=window.__EGAL_PERF__,s=store.get(),times=[],counts=[],previous={now:performance.now()},renderTimes=[];let renders=0,lastRender=performance.now();const original=s.gl.render;s.gl.render=function(...args){const now=performance.now();renderTimes.push(now-lastRender);lastRender=now;renders++;return original.apply(this,args)}
   const active=setInterval(()=>document.dispatchEvent(new Event('pointermove')),100)
   await new Promise(resolve=>{const tick=now=>{times.push(now-previous.now);previous.now=now;counts.push({...store.stats});if(times.length<(quick?40:100))requestAnimationFrame(tick);else resolve()};requestAnimationFrame(tick)})
   clearInterval(active);s.gl.render=original;times.shift();renderTimes.shift();renderTimes.sort((a,b)=>a-b);times.sort((a,b)=>a-b);counts.sort((a,b)=>b.drawCalls-a.drawCalls)
   const p=s.gl.info.programs||[],meshes=[];s.scene.traverseVisible(o=>{if(o.isMesh)meshes.push({name:o.name||o.parent?.name||o.type,triangles:Math.round((o.geometry.index?.count||o.geometry.attributes.position?.count||0)/3)*(o.isInstancedMesh?o.count:1),material:Array.isArray(o.material)?o.material.map(m=>m.name||m.type).join(','):o.material.name||o.material.type})});meshes.sort((a,b)=>b.triangles-a.triangles)
   const median=renderTimes[Math.floor(renderTimes.length*.5)],p95=renderTimes[Math.floor(renderTimes.length*.95)]
   return{offset,medianMs:median,p95Ms:p95,fps:1000/median,browserRafMedian:times[Math.floor(times.length/2)],drawCalls:counts[0]?.drawCalls,triangles:counts[0]?.triangles,textures:s.gl.info.memory.textures,geometries:s.gl.info.memory.geometries,programs:p.length,newPrograms:p.length-window.__perfTransitions.before,longTasks:window.__perfTransitions.tasks,topGeometry:meshes.slice(0,5),dpr:s.gl.getPixelRatio(),renders}
  },{offset,quick})
  scenes.push(row);const clean=label==='after'?await page.addStyleTag({content:'.performance-debug{visibility:hidden!important}'}):null;await page.screenshot({path:`assets/realism-pass/${label}-${mobile?390:1440}-${offset}.png`});await clean?.evaluate(el=>el.remove())
 }
 const payload=await page.evaluate(()=>{const entries=performance.getEntriesByType('resource');return{decodedBytes:entries.reduce((sum,e)=>sum+e.decodedBodySize,0),transferredBytes:entries.reduce((sum,e)=>sum+e.transferSize,0)}});results.push({label,width:mobile?390:1440,cpuThrottle:mobile?4:1,environmentFps,payload,device,scenes,errors});await page.close()
}
await browser.close();await fs.writeFile(`assets/realism-pass/${label}.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(r=>({width:r.width,errors:r.errors,scenes:r.scenes.map(s=>({offset:s.offset,fps:s.fps,frame:s.medianMs,draws:s.drawCalls,triangles:s.triangles,newPrograms:s.newPrograms}))})),null,2))
