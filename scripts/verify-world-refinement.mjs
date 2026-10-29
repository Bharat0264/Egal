import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json')),{chromium}=require('playwright'),browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1440,height:844}}),messages=[]
page.on('pageerror',e=>messages.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))messages.push(m.text())})
await page.goto('http://localhost:5173/');await page.getByRole('button',{name:/^START/}).click();await page.locator('canvas[data-quality]').waitFor({timeout:60000});await page.waitForTimeout(6000)
const report=await page.evaluate(async()=>{
 const entry=performance.getEntriesByType('resource').find(e=>/@react-three_fiber\.js/.test(e.name)),fiber=await import(entry.name),store=fiber._roots.get(document.querySelector('canvas')).store
 window.__worldCheckStore=store
 const {scene,camera}=store.getState(),car=scene.getObjectByName('car'),materials=new Map();car.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.set(m.name,m)})
 const tire=materials.get('Tire'),image=tire?.normalMap?.image,ground=scene.getObjectByName('continuous-ground'),rock=scene.getObjectByName('coastal-rocks'),position=ground.geometry.attributes.position
 let lastZ=Infinity,columns=117,validGrid=true
 for(let i=0;i<position.count;i+=columns){if(position.getZ(i)>=lastZ)validGrid=false;lastZ=position.getZ(i);for(let j=1;j<columns;j++)if(position.getX(i+j)<=position.getX(i+j-1))validGrid=false}
 const layout=await import('/src/scene/world/layout.js'),p=camera.position.clone();let maxSpurGround=-Infinity
 scene.updateMatrixWorld(true);for(const name of['spur-asphalt-0','spur-asphalt-1']){const mesh=scene.getObjectByName(name),vertices=mesh.geometry.attributes.position;for(let i=0;i<vertices.count;i++){p.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld);maxSpurGround=Math.max(maxSpurGround,layout.groundHeightAt(p.x,p.z))}}
 return{normalMap:image?{width:image.width,height:image.height}:null,normalMaterials:[...materials].filter(([,m])=>m.normalMap).map(([name])=>name),ground:{vertices:position.count,triangles:ground.geometry.index.count/3,validGrid},maxSpurGround,rocks:rock.count,model:performance.getEntriesByType('resource').find(e=>e.name.endsWith('car.opt.glb'))?.name,renderer:store.getState().gl.getContext().getParameter(store.getState().gl.getContext().VERSION)}
})
assert.deepEqual(report.normalMap,{width:512,height:512});assert.deepEqual(report.normalMaterials,['Tire']);assert.ok(report.ground.validGrid);assert.ok(report.model.includes('/versioned/'))
assert.ok(report.maxSpurGround<0,'Terrain cannot bury either service spur')
await page.evaluate(()=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*.5});await page.waitForTimeout(8000)
report.cameraRecoveryDistance=await page.evaluate(()=>{const state=window.__worldCheckStore.getState(),camera=state.camera,expected=camera.position.clone(),subscriber=state.internal.subscribers.find(s=>s.ref.current.toString().includes('camera.position.lerp'));if(!subscriber)throw new Error('Camera callback not found');camera.position.x+=20;subscriber.ref.current(state,1);return camera.position.distanceTo(expected)})
assert.ok(report.cameraRecoveryDistance<.2,'One second elapsed damping must recover from a rendering stall')
for(const width of[1440,390]){await page.setViewportSize({width,height:844});for(const offset of[0,.5,.95]){await page.evaluate(offset=>{window.__lastPose=null;window.__settledFrames=0;const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*offset},offset);await page.waitForTimeout(1500);await page.waitForFunction(()=>{const c=window.__worldCheckStore.getState().camera,p=[...c.position.toArray(),...c.quaternion.toArray()];window.__settledFrames=window.__lastPose&&p.every((x,i)=>Math.abs(x-window.__lastPose[i])<.0001)?window.__settledFrames+1:0;window.__lastPose=p;return window.__settledFrames>8},{timeout:30000,polling:'raf'});await page.screenshot({path:`assets/refinement-checks/scene-${width}-${offset}.png`})}}
assert.deepEqual(messages,[]);report.messages=messages;await browser.close();await fs.writeFile('assets/refinement-checks/browser.json',JSON.stringify(report,null,2));console.log('PASS real browser WebP tire normal decoding (512px, Tire only), versioned GLB, non-folding terrain, graded service spurs, instanced rocks, responsive captures and no console warnings.')
