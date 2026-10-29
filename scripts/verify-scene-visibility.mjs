import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json')),{chromium}=require('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']})
const page=await browser.newPage({viewport:{width:1440,height:800}}),messages=[],samples=[]
page.on('pageerror',e=>messages.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))messages.push(m.text())})
await page.goto('http://localhost:5173/');await page.getByRole('button',{name:/^START/}).click({timeout:45000})
async function scroll(offset){await page.evaluate(offset=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*offset},offset);await page.waitForTimeout(4500)}
async function inspect(){return page.evaluate(async()=>{
 const entry=performance.getEntriesByType('resource').find(e=>/@react-three_fiber\.js/.test(e.name)),fiber=await import(entry.name),{scene,camera}=fiber._roots.get(document.querySelector('canvas')).store.getState()
 const layout=await import('/src/scene/showcase/layout.js'),journey=await import('/src/scene/showcase/journeyLayout.js'),{roadCurve,getJourneyProgress}=await import('/src/scene/Road.jsx'),{Box3,Vector3}=await import('/node_modules/.vite/deps/three.js')
 const names=['fleet-bay','services-fork','toll-gate','egal-destination']
 const props=Object.fromEntries(names.map(name=>{const o=scene.getObjectByName(name);return[name,{visible:o.visible,opacity:o.userData.sceneOpacity}]}))
 let nearestEnd=0
 for(const name of['service-sign-self-drive','service-sign-chauffeur','service-sign-outstation','service-city-towers','hotel-entrance','service-mountains']){
  const object=scene.getObjectByName(name);object.updateWorldMatrix(true,true);const box=new Box3().setFromObject(object)
  for(const x of[box.min.x,box.max.x])for(const z of[box.min.z,box.max.z]){
   const point=new Vector3(x,0,z);let nearest=0,distance=Infinity
   for(let i=0;i<=2400;i++){const candidate=roadCurve.getPointAt(i/2400),d=point.distanceToSquared(candidate);if(d<distance){distance=d;nearest=i/2400}}
   nearestEnd=Math.max(nearestEnd,nearest*roadCurve.getLength())
  }
 }
 const expected=layout.worldPoint(journey.destinationFrame,[-4,8,-23])
 return {props,serviceClearance:getJourneyProgress(.7)*roadCurve.getLength()-nearestEnd,lamps:scene.getObjectByName('contact-streetlamp-heads').count,camera:camera.position.toArray(),expectedCamera:expected.toArray(),cameraError:camera.position.distanceTo(expected),progress:document.querySelector('.journey-progress').style.transform}
})}
const expected={.28:[true,false,false,false],.55:[false,true,false,false],.58:[false,false,false,false],.60:[false,false,false,false],.62:[false,false,true,false],.70:[false,false,true,false],.79:[false,false,false,false],.80:[false,false,false,false],.95:[false,false,false,true],1:[false,false,false,true]}
for(const [at,visibility]of Object.entries(expected)){
 const offset=+at;console.log('Inspecting',offset);await scroll(offset)
 if(offset>=.95){
  await page.evaluate(async()=>{
   const entry=performance.getEntriesByType('resource').find(e=>/@react-three_fiber\.js/.test(e.name)),fiber=await import(entry.name)
   const{worldPoint}=await import('/src/scene/showcase/layout.js'),{destinationFrame}=await import('/src/scene/showcase/journeyLayout.js')
   window.__transitionStore=fiber._roots.get(document.querySelector('canvas')).store
   window.__contactCamera=worldPoint(destinationFrame,[-4,8,-23])
  })
  await page.waitForFunction(()=>window.__transitionStore.getState().camera.position.distanceTo(window.__contactCamera)<.04,null,{timeout:60000,polling:1000})
 }
 const sample=await inspect()
 assert.deepEqual(Object.values(sample.props).map(p=>p.visible),visibility)
 assert.ok(sample.serviceClearance>=60,`service landmarks only ${sample.serviceClearance}m before toll`)
 assert.equal(sample.lamps,3)
 if(offset===.62)assert.ok(Math.abs(sample.props['toll-gate'].opacity-.5)<.04)
 if(offset>=.95)console.log(JSON.stringify({offset,...sample}))
 if(offset>=.95)assert.ok(sample.cameraError<.05,`camera error ${sample.cameraError}`)
 samples.push({offset,...sample})
}
assert.deepEqual(messages,[]);await browser.close();await fs.writeFile('assets/transition-checks/visibility-report.json',JSON.stringify({messages,samples},null,2))
console.log('PASS actual Three visibility flags, .02 fades, 60m service clearance, 3 lamps and unchanged contact camera.')
