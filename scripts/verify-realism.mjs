import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json')),{chromium}=require('playwright'),browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1440,height:844},deviceScaleFactor:1.5}),messages=[],report={}
page.on('pageerror',e=>messages.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))messages.push(m.text())})
await page.addInitScript(()=>{window.__shaderEvents=[];for(const type of['WebGLRenderingContext','WebGL2RenderingContext']){const proto=window[type]?.prototype;if(proto){const compile=proto.compileShader;proto.compileShader=function(...args){window.__shaderEvents.push(performance.now());return compile.apply(this,args)}}}window.open=()=>({})})
await page.goto('http://localhost:4173/?debug=perf');await page.locator('.start').waitFor();report.startDisabledDuringWarmup=await page.locator('.start').isDisabled();assert.ok(report.startDisabledDuringWarmup)
await page.waitForFunction(()=>!document.querySelector('.start')?.disabled,null,{timeout:120000});report.warmupMs=await page.evaluate(()=>performance.now());report.initialDpr=await page.evaluate(()=>window.__EGAL_PERF__.get().gl.getPixelRatio());assert.ok(Math.abs(report.initialDpr-1.25)<.02)
report.shadersAtStart=await page.evaluate(()=>window.__shaderEvents.length);await page.getByRole('button',{name:/^START/}).click();await page.waitForTimeout(2000)
async function scroll(offset){await page.evaluate(offset=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*offset},offset);await page.waitForTimeout(2000)}
report.scenes=[]
for(const offset of[0,.07,.12,.25,.4,.5,.6,.7,.8,.95,1]){
 await scroll(offset)
 const row=await page.evaluate(offset=>{const s=window.__EGAL_PERF__.get(),names=['fleet-bay','services-fork','toll-gate','egal-destination'],mounted=names.filter(n=>s.scene.getObjectByName(n)),titles=[...document.querySelectorAll('.section-copy')].filter(el=>getComputedStyle(el).visibility==='visible'&&+getComputedStyle(el).opacity>.1).map(el=>el.getAttribute('aria-label'));let transmission=0;s.scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.transmission>0)transmission++});return{offset,mounted,titles,transmission,shaders:window.__shaderEvents.length,...window.__EGAL_PERF__.stats}},offset)
 assert.equal(row.titles.length,1,`Visible title at ${offset}: ${JSON.stringify(row)}`);assert.equal(row.transmission,0);assert.ok(row.mounted.length<=3);assert.ok(row.drawCalls<150);assert.ok(row.triangles<400000);report.scenes.push(row)
 if(offset===0){await page.locator('.site-more summary').click();assert.ok(await page.getByRole('link',{name:'Simple view',exact:true}).isVisible());await page.locator('.site-more summary').click()}
 if(offset===.5)assert.ok(!(await page.locator('.site-more summary').isVisible()))
}
await scroll(.25);assert.equal(await page.locator('.fleet-price').count(),0);const original=await page.locator('.fleet-spec h2').innerText();await page.getByRole('button',{name:'Next car',exact:true}).click();assert.notEqual(await page.locator('.fleet-spec h2').innerText(),original);await page.getByRole('button',{name:'Car colour 5'}).click();assert.equal(await page.getByRole('button',{name:'Car colour 5'}).getAttribute('aria-pressed'),'true')
await page.waitForTimeout(600)
const drag=await page.evaluate(()=>{const s=window.__EGAL_PERF__.get(),r=s.scene.getObjectByName('fleet-car-premium-suv'),p=r.position.clone().set(0,.65,0);r.localToWorld(p);p.project(s.camera);return{x:(p.x+1)*s.size.width/2,y:(1-p.y)*s.size.height/2,before:r.children[0].rotation.y}})
await page.mouse.move(drag.x,drag.y);await page.mouse.down();await page.mouse.move(drag.x+90,drag.y,{steps:12});await page.mouse.up();await page.waitForTimeout(200)
report.dragRadians=await page.evaluate(()=>window.__EGAL_PERF__.get().scene.getObjectByName('fleet-car-premium-suv').children[0].rotation.y)-drag.before;assert.ok(Math.abs(report.dragRadians)>.35,'Pointer drag rotates the selected 3D car')
const slider=page.getByRole('slider',{name:'Rotate selected car'});await slider.focus();await slider.press('ArrowRight');assert.ok(+(await slider.getAttribute('aria-valuenow'))>0)
await page.getByRole('button',{name:'Book this car'}).click();await page.waitForTimeout(2200);assert.equal(await page.locator('#booking-carId').inputValue(),'premium-suv')
await page.getByRole('button',{name:'Book now',exact:true}).click();assert.equal(await page.locator('[aria-invalid=true]').count(),4)
await page.route('**/api/booking',route=>route.fulfill({contentType:'application/json',body:'{"ok":true}'}))
for(const[key,value]of Object.entries({pickup:'2099-06-01',dropoff:'2099-06-04',location:'Test airport',phone:'9876543210'}))await page.locator('#booking-'+key).fill(value)
await page.getByRole('button',{name:'Book now',exact:true}).click();await page.getByRole('status',{name:'Booking confirmation'}).waitFor()
await scroll(.5);await page.getByRole('button',{name:'Outstation',exact:true}).click();assert.ok(await page.locator('.service-info').isVisible());await scroll(.7);assert.equal(await page.locator('.service-info').count(),0)
report.world=await page.evaluate(()=>{
 const s=window.__EGAL_PERF__.get(),terrain=s.scene.getObjectByName('continuous-ground'),water=s.scene.getObjectByName('sea-and-shore').children[0].material,traffic=s.scene.getObjectByName('oncoming-traffic'),sizes=[]
 const texture=t=>{if(t?.isTexture){const images=Array.isArray(t.image)?t.image:[t.image];for(const image of images)if(image?.width)sizes.push([image.width,image.height])}}
 s.scene.traverse(o=>{if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const value of Object.values(m))texture(value);for(const u of Object.values(m.uniforms||{}))texture(u.value)}})
 let maxWeightError=0;const weights=terrain.geometry.attributes.biome;for(let i=0;i<weights.count;i++)maxWeightError=Math.max(maxWeightError,Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1))
 return{expFog:s.scene.fog.isFogExp2,density:s.scene.fog.density,terrainVertices:terrain.geometry.attributes.position.count,maxWeightError,textureMax:Math.max(...sizes.flat()),normalMapsDistinct:water.uniforms.normalA.value!==water.uniforms.normalB.value,palmVariants:[0,1,2].every(i=>s.scene.getObjectByName('palm-fronds-'+i)),impostors:!!s.scene.getObjectByName('distant-palm-impostors'),trafficCount:traffic.count,trafficBefore:[...traffic.instanceMatrix.array],noShadowMaps:!s.gl.shadowMap.enabled}
})
assert.ok(report.world.expFog);assert.ok(report.world.density<.005);assert.ok(report.world.maxWeightError<.00001);assert.ok(report.world.textureMax<=1024);assert.ok(report.world.normalMapsDistinct);assert.ok(report.world.palmVariants&&report.world.impostors&&report.world.noShadowMaps)
await page.waitForTimeout(250);const trafficAfter=await page.evaluate(()=>[...window.__EGAL_PERF__.get().scene.getObjectByName('oncoming-traffic').instanceMatrix.array]);assert.notDeepEqual(trafficAfter,report.world.trafficBefore);delete report.world.trafficBefore
report.cycles=[]
for(let i=0;i<2;i++){for(const offset of[1,.7,.5,.25,0])await scroll(offset);report.cycles.push(await page.evaluate(()=>({...window.__EGAL_PERF__.get().gl.info.memory,programs:window.__EGAL_PERF__.get().gl.info.programs.length})))}
console.log(JSON.stringify({cycles:report.cycles}));await fs.writeFile('assets/realism-pass/verification-progress.json',JSON.stringify(report,null,2));
assert.ok(report.cycles[1].geometries<=report.cycles[0].geometries+1);assert.ok(report.cycles[1].textures<=report.cycles[0].textures+1)
report.lateShaderCompiles=await page.evaluate(()=>window.__shaderEvents.length)-report.shadersAtStart
await page.waitForTimeout(3000)
report.idleFps=await page.evaluate(async()=>{const s=window.__EGAL_PERF__.get(),render=s.gl.render;let count=0;s.gl.render=function(...args){count++;return render.apply(this,args)};const start=performance.now();await new Promise(r=>setTimeout(r,1500));const fps=count*1000/(performance.now()-start);s.gl.render=render;return fps})
assert.ok(report.idleFps>27&&report.idleFps<33)
await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});assert.equal(await page.evaluate(()=>window.__EGAL_PERF__.get().frameloop),'never');await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))})
assert.equal(await page.evaluate(()=>window.__EGAL_PERF__.get().frameloop),'always')
report.messages=messages;assert.deepEqual(messages,[]);await page.close()
const normal=await browser.newPage(),requests=[];normal.on('request',r=>requests.push(r.url()));await normal.goto('http://localhost:4173/');await normal.waitForFunction(()=>!document.querySelector('.start')?.disabled,null,{timeout:120000});assert.ok(!requests.some(u=>u.includes('PerfDebug')));await normal.getByRole('button',{name:/^START/}).click();await normal.waitForTimeout(1000);assert.equal(await normal.locator('.performance-debug').count(),0)
await browser.close();await fs.writeFile('assets/realism-pass/verification.json',JSON.stringify(report,null,2));assert.equal(report.lateShaderCompiles,0,'No WebGL shader compilation after START');console.log('PASS realism world/texture/traffic checks, loader warmup, scene neighbours/unmount/disposal, budgets, atlas, fleet controls, booking/service flow, no late shaders, 30fps idle, hidden pause and query-only debug. Email delivery was mocked.')
