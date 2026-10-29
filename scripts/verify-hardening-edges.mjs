import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json')),{chromium}=require('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),base='http://127.0.0.1:4180',report={}
// Keep the GLB pending: START must already work and dismiss the opening.
const held=await browser.newPage(),warnings=[];held.on('pageerror',e=>warnings.push(e.message))
let release;const gate=new Promise(resolve=>release=resolve)
await held.route('**/*.glb',async route=>{await gate;await route.continue().catch(()=>{})})
await held.goto(base);await held.waitForTimeout(1000)
report.initialResources=await held.evaluate(()=>performance.getEntriesByType('resource').map(e=>({url:new URL(e.name).pathname,decoded:e.decodedBodySize,encoded:e.encodedBodySize})))
assert.ok(!report.initialResources.some(e=>/World-|three-|webgl-|\.glb/.test(e.url)))
await held.getByRole('button',{name:/^START/}).click();await held.waitForTimeout(2000);assert.equal(await held.getByRole('button',{name:/^START/}).count(),0)
assert.ok(await held.getByRole('button',{name:/Book Now/}).isVisible());release();await held.locator('canvas').waitFor();await held.waitForTimeout(5500)
report.startedResources=await held.evaluate(()=>performance.getEntriesByType('resource').map(e=>({url:new URL(e.name).pathname,decoded:e.decodedBodySize,encoded:e.encodedBodySize})))
assert.deepEqual(warnings,[]);await held.close();report.startBeforeModelReady=true
// Prerendered HTML can be served on a later date without a hydration mismatch.
const date=await browser.newPage(),dateErrors=[];date.on('console',m=>{if(['error','warning'].includes(m.type()))dateErrors.push(m.text())})
await date.addInitScript(()=>{const Original=Date;window.Date=class extends Original{constructor(...args){super(...(args.length?args:['2030-05-10T06:00:00Z']))}static now(){return +new Original('2030-05-10T06:00:00Z')}}})
await date.goto(base+'/simple');await date.waitForTimeout(500);assert.equal(await date.locator('#booking-pickup').getAttribute('min'),'2030-05-10');assert.deepEqual(dateErrors,[]);await date.close();report.laterDateHydration=true
// Emulate the VisualViewport shrinking for a phone keyboard; a physical phone remains a manual check.
const phone=await browser.newPage({viewport:{width:390,height:844}})
await phone.addInitScript(()=>{window.__vvHeight=844;Object.defineProperty(visualViewport,'height',{configurable:true,get:()=>window.__vvHeight})})
await phone.goto(base+'/simple');await phone.locator('#booking-email').focus();await phone.evaluate(()=>{window.__vvHeight=460;visualViewport.dispatchEvent(new Event('resize'))});await phone.waitForTimeout(400)
assert.equal(await phone.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--usable-height').trim()),'460px')
await phone.screenshot({path:'assets/hardening-checks/keyboard-emulated-390.png'});await phone.close();report.keyboardViewportEmulated=true
// Expected renderer failures should land on the real no-3D page.
const noWebgl=await browser.newPage();await noWebgl.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args)}})
await noWebgl.goto(base);await noWebgl.getByRole('button',{name:/^START/}).click();await noWebgl.waitForURL(/\/simple\?reason=/,{timeout:30000});await noWebgl.getByRole('heading',{name:'Drive your journey.',exact:true}).waitFor();await noWebgl.close();report.unsupportedWebGLFallback=true
const chunk=await browser.newPage();await chunk.route('**/assets/World-*.js',r=>r.abort());await chunk.goto(base);await chunk.getByRole('button',{name:/^START/}).click();await chunk.waitForURL(/\/simple\?reason=scene/);await chunk.close();report.failedSceneChunkFallback=true
// Inspect the live Fiber store on the dev server without adding production debug globals.
const runtime=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'}),runtimeWarnings=[]
runtime.on('console',m=>{if(['warning','error'].includes(m.type()))runtimeWarnings.push(m.text())});runtime.on('pageerror',e=>runtimeWarnings.push(e.message))
await runtime.addInitScript(()=>{Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>4});Object.defineProperty(navigator,'deviceMemory',{get:()=>4});window.__io=[];const Original=IntersectionObserver;window.IntersectionObserver=class extends Original{constructor(cb,options){super(cb,options);this.cb=cb}observe(target){window.__io.push({target,cb:this.cb});super.observe(target)}}})
await runtime.goto('http://localhost:5173/');await runtime.getByRole('button',{name:/^START/}).click();await runtime.locator('canvas[data-quality=performance]').waitFor({timeout:60000});await runtime.waitForTimeout(5500)
await runtime.evaluate(async()=>{const entry=performance.getEntriesByType('resource').find(e=>/@react-three_fiber\.js/.test(e.name));const fiber=await import(entry.name);window.__store=fiber._roots.get(document.querySelector('canvas')).store})
const quality=await runtime.evaluate(()=>{const s=window.__store.getState();return{dpr:s.gl.getPixelRatio(),quality:s.gl.domElement.dataset.quality}});assert.equal(quality.dpr,1);report.lowPower=quality
await runtime.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});await runtime.waitForTimeout(300);assert.equal(await runtime.evaluate(()=>window.__store.getState().frameloop),'never')
const paused=await runtime.evaluate(()=>window.__store.getState().clock.elapsedTime);await runtime.waitForTimeout(300);assert.equal(await runtime.evaluate(()=>window.__store.getState().clock.elapsedTime),paused)
await runtime.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))});await runtime.waitForTimeout(300);assert.equal(await runtime.evaluate(()=>window.__store.getState().frameloop),'always')
await runtime.evaluate(()=>window.__io.filter(o=>o.target.tagName==='CANVAS').forEach(o=>o.cb([{isIntersecting:false}])));await runtime.waitForTimeout(200);assert.equal(await runtime.evaluate(()=>window.__store.getState().frameloop),'never')
await runtime.evaluate(()=>window.__io.filter(o=>o.target.tagName==='CANVAS').forEach(o=>o.cb([{isIntersecting:true}])));await runtime.waitForTimeout(200);assert.equal(await runtime.evaluate(()=>window.__store.getState().frameloop),'always')
assert.deepEqual(runtimeWarnings,[]);report.hiddenAndOffscreenPause=true;report.runtimeWarnings=runtimeWarnings;await runtime.close()
const staticFiles=['dist/index.html','dist/simple/index.html','dist/privacy/index.html','dist/terms/index.html','dist/cancellation/index.html'];const titles=new Set()
for(const file of staticFiles){const html=await fs.readFile(file,'utf8');titles.add(html.match(/<title>(.*?)<\/title>/)[1]);assert.ok(html.includes('rel="canonical"'));assert.ok(html.includes('og:image'));assert.ok(html.includes('twitter:card'));assert.ok(html.includes('AutoRental'))}assert.equal(titles.size,5)
for(const file of await fs.readdir('dist/assets'))if(file.endsWith('.js'))assert.ok(!/RESEND_API_KEY|BOOKING_TO_EMAIL|BOOKING_FROM_EMAIL/.test(await fs.readFile('dist/assets/'+file,'utf8')))
report.uniquePrerenderedMetadata=true;report.noServerSecretsInBrowser=true
await browser.close();await fs.writeFile('assets/hardening-checks/edges.json',JSON.stringify(report,null,2));console.log('PASS immediate START, payload capture, later-day hydration, emulated keyboard viewport, WebGL/chunk fallbacks, DPR 1 on low hardware, hidden/offscreen pause, metadata and secret isolation.')
