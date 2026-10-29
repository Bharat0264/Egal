import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json'))
const {chromium}=require('playwright')
const output=path.resolve('assets/scene-checks');await fs.mkdir(output,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']})
const page=await browser.newPage({viewport:{width:1440,height:900}}), messages=[], external=[]
page.on('console',m=>{if(['warning','error'].includes(m.type()))messages.push(`${m.type()}: ${m.text()}`)})
page.on('pageerror',e=>messages.push(e.stack??e.message))
page.on('request',r=>{if(!r.url().startsWith('http://localhost:')&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))external.push(r.url())})
await page.goto('http://localhost:5173/')
await page.getByRole('button',{name:/^START/}).click({timeout:45000})
async function scroll(offset){await page.evaluate(value=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*value},offset);await page.waitForTimeout(2800)}
async function inspect(){return page.evaluate(async()=>{
 const entry=performance.getEntriesByType('resource').find(e=>/@react-three_fiber\.js/.test(e.name)),fiber=await import(entry.name)
 const {scene,camera,gl}=fiber._roots.get(document.querySelector('canvas')).store.getState(), car=scene.getObjectByName('car')
 const parked=[];scene.traverse(o=>{if(o.name.startsWith('fleet-car-')){const paint=o.getObjectByProperty('name',o.name.replace('fleet-car-','')+'-BodyPaint'),materials={};o.traverse(p=>{if(p.material?.name)materials[p.material.name]=p.material.color.getHexString()});parked.push({name:o.name,position:o.position.toArray(),scale:o.scale.x,rotation:o.children[0].rotation.y,paint:paint?.material.color.getHexString(),materials})}})
 const scroller=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto')
 const boxes=[...document.querySelectorAll('.scene-card,.book,.section-copy h1')].filter(e=>{const s=getComputedStyle(e);return s.visibility!=='hidden'&&s.display!=='none'&&e.getBoundingClientRect().width>0}).map(e=>({name:e.className||e.tagName,box:e.getBoundingClientRect().toJSON()}))
 return{offset:scroller.scrollTop/(scroller.scrollHeight-scroller.clientHeight),camera:camera.position.toArray(),chaseDistance:Math.hypot(camera.position.x-car.position.x,camera.position.z-car.position.z),fov:camera.fov,parked,calls:gl.info.render.calls,boxes,sky:scene.fog.color.getHexString(),city:scene.getObjectByName('distant-city').visible,servicesVisible:scene.getObjectByName('services-fork').visible}
})}
const report={samples:[],messages,external}
for(const [label,offset] of [['hero',0],['fleet',.25],['fleet-anchor',.28],['services',.5],['city',.75],['sunset',1]]){
 await scroll(offset);report.samples.push({label,...await inspect()});await page.screenshot({path:path.join(output,`desktop-${label}.png`)})
}
for(const sample of report.samples.filter(s=>['hero','city','sunset'].includes(s.label))){assert.ok(Math.abs(sample.chaseDistance-7.5)<.001);assert.equal(sample.fov,45)}
for(const sample of report.samples.filter(s=>['city','sunset'].includes(s.label)))assert.equal(sample.servicesVisible,false)
assert.ok(report.samples.find(s=>s.label==='city').city);assert.ok(report.samples.find(s=>s.label==='sunset').city)
assert.notEqual(report.samples.find(s=>s.label==='city').sky,report.samples.find(s=>s.label==='sunset').sky)
console.log('captures',JSON.stringify({messages,external,parked:report.samples[1].parked}))
await scroll(.28)
const title=()=>page.locator('.fleet-spec h2').innerText()
const initial=await title();await page.getByRole('button',{name:'Next car',exact:true}).click();await page.waitForTimeout(800);assert.notEqual(await title(),initial)
await page.getByRole('button',{name:'Previous car',exact:true}).click();await page.waitForTimeout(800);assert.equal(await title(),initial)
// Click the actual parked mesh, then restore using its floating Html price tag.
const carPoint=await page.evaluate(async()=>{
  const e=performance.getEntriesByType('resource').find(e=>/@react-three_fiber\.js/.test(e.name)),fiber=await import(e.name),{scene,camera}=fiber._roots.get(document.querySelector('canvas')).store.getState(),car=scene.getObjectByName('fleet-car-premium-suv'),V=car.position.constructor,p=car.localToWorld(new V(0,.8,0)).project(camera)
  return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2}
})
await page.mouse.click(carPoint.x,carPoint.y);await page.waitForTimeout(700);assert.equal(await title(),'Premium SUV')
await page.getByRole('button',{name:/^SUV\s*₹/}).click();await page.waitForTimeout(800);assert.equal(await title(),'SUV')
const unpainted=await inspect()
await page.getByRole('button',{name:'Car colour 4',exact:true}).click();await page.waitForTimeout(1300)
const painted=await inspect();assert.equal(painted.parked.find(c=>c.name==='fleet-car-suv').paint,'c0161b')
for(let i=0;i<painted.parked.length;i++)for(const [name,color]of Object.entries(unpainted.parked[i].materials))if(name!=='BodyPaint')assert.equal(painted.parked[i].materials[name],color)
const pad=page.getByRole('slider',{name:'Rotate selected car'}).filter({visible:true})
const b=await pad.boundingBox();const before=await inspect();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+70,b.y+b.height/2,{steps:12});await page.mouse.up();await page.waitForTimeout(250);const after=await inspect();assert.ok(Math.abs(after.parked[2].rotation-before.parked[2].rotation)>.4)
await page.getByRole('button',{name:'Book this car'}).click();await page.waitForTimeout(3000);const booking=await inspect();assert.ok(Math.abs(booking.offset-.6)<.008);assert.match(await page.locator('.booking-selection').innerText(),/Your selected ride/)
await scroll(.5);await page.getByRole('button',{name:'Self-Drive',exact:true}).click();await page.waitForTimeout(1000);await page.getByRole('complementary',{name:'Self-Drive details'}).waitFor();await page.screenshot({path:path.join(output,'desktop-service-info.png')})
await page.getByRole('button',{name:/^Book now/}).click();await page.waitForTimeout(2500);assert.ok(Math.abs((await inspect()).offset-.6)<.008)
for(const width of [390,375]){
 await page.setViewportSize({width,height:844})
 for(const [label,offset] of [['fleet',.28],['services',.5]]){
   await scroll(offset)
   if(label==='services'){await page.getByRole('button',{name:'Chauffeur',exact:true}).click();await page.waitForTimeout(800)}
   if(label==='fleet'&&width===390){
     const touchPad=await page.getByRole('slider',{name:'Rotate selected car'}).filter({visible:true}).boundingBox(),beforeTouch=await inspect(),session=await page.context().newCDPSession(page)
     await session.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1})
     const x=touchPad.x+touchPad.width/2,y=touchPad.y+touchPad.height/2
     await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]})
     for(let i=1;i<=6;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+i*8,y}]})
     await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300)
     const afterTouch=await inspect();assert.notDeepEqual(beforeTouch.parked.map(c=>c.rotation),afterTouch.parked.map(c=>c.rotation));assert.ok(Math.abs(afterTouch.offset-.28)<.002)
     report.touchRotation=true;await session.send('Emulation.setTouchEmulationEnabled',{enabled:false})
   }
   await page.screenshot({path:path.join(output,`mobile-${width}-${label}.png`)});const sample={label:`mobile-${width}-${label}`,...await inspect()}
   const card=sample.boxes.find(b=>b.name.includes('scene-card')).box,book=sample.boxes.find(b=>b.name.includes('book')).box,heading=sample.boxes.find(b=>b.name==='H1'&&b.box.y<300).box
   assert.ok(card.x>=0&&card.right<=width);assert.ok(card.top>heading.bottom+8);assert.ok(card.top>book.bottom+8)
   report.samples.push(sample)
 }
}
report.interactions={arrows:true,clickMesh:true,clickPriceTag:true,recolor:true,drag:true,bookingOffset:booking.offset,bookingSelection:true,serviceBooking:true}
assert.deepEqual(messages,[]);assert.deepEqual(external,[])
await browser.close()
await fs.writeFile(path.join(output,'scene-report.json'),JSON.stringify(report,null,2))
console.log('PASS scenes, interactions, booking context, mobile captures, no warnings or external assets.')
