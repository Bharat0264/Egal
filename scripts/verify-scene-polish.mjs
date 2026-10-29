import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
import {createHash} from 'node:crypto'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json'))
const{chromium}=require('playwright'),output=path.resolve('assets/scene-polish-checks')
await fs.mkdir(output,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']})
const page=await browser.newPage({viewport:{width:1440,height:900}}),messages=[]
page.on('console',m=>{if(['warning','error'].includes(m.type()))messages.push(m.text())});page.on('pageerror',e=>messages.push(e.message))
await page.goto('http://localhost:5173/');await page.getByRole('button',{name:/^START/}).click({timeout:45000})
async function scroll(offset){await page.evaluate(offset=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*offset},offset);await page.waitForTimeout(2700)}
async function inspect(){return page.evaluate(async()=>{
 const entry=performance.getEntriesByType('resource').find(e=>/@react-three_fiber\.js/.test(e.name)),fiber=await import(entry.name),{scene,camera}=fiber._roots.get(document.querySelector('canvas')).store.getState()
 const fleet=scene.getObjectByName('fleet-bay'),V=camera.position.constructor,inv=fleet.matrixWorld.clone().invert(),layout=await import('/src/scene/showcase/fleetLayout.js')
 function meshBounds(mesh,space){mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox,min=new V(Infinity,Infinity,Infinity),max=new V(-Infinity,-Infinity,-Infinity);for(const x of[b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z]){const p=new V(x,y,z).applyMatrix4(mesh.matrixWorld);if(space)p.applyMatrix4(space);else p.project(camera);min.min(p);max.max(p)}return{min:min.toArray(),max:max.toArray()}}
 const parked=[]
 fleet.updateWorldMatrix(true,true)
 for(const root of fleet.children.filter(o=>o.name.startsWith('fleet-car-'))){let min=new V(Infinity,Infinity,Infinity),max=new V(-Infinity,-Infinity,-Infinity);root.traverse(o=>{if(o.isMesh&&o.material.name){const b=meshBounds(o,inv);min.min(new V(...b.min));max.max(new V(...b.max))}});parked.push({name:root.name,position:root.position.toArray(),yaw:root.children[0].rotation.y,min:min.toArray(),max:max.toArray()})}
 const signBoxes={};for(const id of['self-drive','chauffeur','outstation']){const root=scene.getObjectByName(`service-sign-${id}`),b=meshBounds(root.children[0]);signBoxes[id]={left:(b.min[0]+1)*innerWidth/2,right:(b.max[0]+1)*innerWidth/2,top:(1-b.max[1])*innerHeight/2,bottom:(1-b.min[1])*innerHeight/2};const p=root.getWorldPosition(new V()).project(camera);signBoxes[id].point={x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2}}
 const rect=e=>{const b=e.getBoundingClientRect();return{left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height}}
 const tags=[...document.querySelectorAll('.fleet-price')].filter(e=>getComputedStyle(e).display!=='none').map(e=>({text:e.innerText,opacity:+getComputedStyle(e).opacity,box:rect(e)}))
 const obstacles=[...document.querySelectorAll('.scene-card,.section-copy h1,.service-hint,.service-choices,.book')].filter(e=>getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none').map(e=>({name:e.className||e.tagName,box:rect(e)}))
 const spur=scene.getObjectByName('spur-asphalt-0'),hero=scene.getObjectByName('car')
 return{parked,tags,obstacles,signBoxes,tableClearance:layout.TABLE_X-(layout.TABLE_RADIUS+.25)-(-7.8+.14),bay:{width:layout.BAY_WIDTH,length:layout.BAY_LENGTH},gap:layout.PARKING_GAP,sharedAsphalt:spur.material.map===scene.getObjectByName('asphalt').material.map,spurVertices:spur.geometry.attributes.position.count,spurUV:spur.geometry.attributes.uv.array[spur.geometry.attributes.uv.array.length-1],chauffeurLegs:scene.getObjectByName('chauffeur-legs').count,chase:Math.hypot(camera.position.x-hero.position.x,camera.position.z-hero.position.z),city:scene.getObjectByName('distant-city').visible,sky:scene.fog.color.getHexString()}
})}
const overlaps=(a,b)=>a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1
const report={fleet:[],services:[],messages}
await scroll(.28)
for(let i=0;i<2;i++){await page.getByRole('button',{name:'Previous car',exact:true}).click();await page.waitForTimeout(150)}
for(const selected of[0,2,4]){
 if(selected)for(let i=0;i<2;i++){await page.getByRole('button',{name:'Next car',exact:true}).click();await page.waitForTimeout(150)}
 await page.waitForTimeout(2100);const sample=await inspect()
 assert.equal(sample.tags.length,4);assert.ok(sample.tableClearance>1)
 for(let i=0;i<sample.parked.length;i++)if(i!==selected){const car=sample.parked[i];assert.ok(car.min[0]>-sample.bay.width/2&&car.max[0]<sample.bay.width/2);assert.ok(car.min[2]>-sample.bay.length/2&&car.max[2]<sample.bay.length/2);assert.ok(Math.abs(car.yaw-(-Math.PI/2+Math.PI/9))<.03);if(i>0&&i-1!==selected)assert.ok(car.min[2]-sample.parked[i-1].max[2]>1.36)}
 for(let i=0;i<sample.tags.length;i++){assert.ok(sample.tags[i].opacity<1);for(let j=i+1;j<sample.tags.length;j++)assert.ok(!overlaps(sample.tags[i].box,sample.tags[j].box),'price tags overlap');for(const o of sample.obstacles)assert.ok(!overlaps(sample.tags[i].box,o.box),`tag overlaps ${o.name}`)}
 assert.equal(await page.locator('.spec-heading p').count(),selected===4?1:0)
 assert.deepEqual(await page.locator('.car-specs dt').allTextContents(),['Seats','Fuel','Price'])
 report.fleet.push({selected,...sample});await page.screenshot({path:path.join(output,`fleet-${selected+1}.png`)})
}
await scroll(.5);assert.equal(await page.locator('.service-info').count(),0)
let sample=await inspect();assert.ok(sample.sharedAsphalt);assert.ok(sample.spurVertices>350&&sample.spurUV>5);assert.equal(sample.chauffeurLegs,2)
await page.mouse.move(sample.signBoxes.outstation.point.x,sample.signBoxes.outstation.point.y);await page.waitForTimeout(300);assert.equal(await page.locator('.service-info').count(),0,'hover must not open a card')
await page.screenshot({path:path.join(output,'services-no-card.png')});report.services.push({card:null,...sample})
await page.getByRole('button',{name:'Outstation',exact:true}).click();await page.waitForTimeout(1200);sample=await inspect()
const card=sample.obstacles.find(o=>o.name.includes('service-info')).box,chips=sample.obstacles.find(o=>o.name==='service-choices').box
assert.ok(card.left<100);assert.ok(!overlaps(card,sample.signBoxes.outstation));assert.ok(Math.abs((chips.left+chips.right)/2-720)<2)
for(const b of Object.values(sample.signBoxes))assert.ok(!overlaps(chips,b))
for(const o of sample.obstacles.filter(o=>['H1','service-hint'].includes(o.name)))assert.ok(!overlaps(card,o.box))
await page.screenshot({path:path.join(output,'services-outstation.png')});report.services.push({card:'outstation',...sample})
await page.mouse.click(20,720);await page.waitForTimeout(200);assert.equal(await page.locator('.service-info').count(),0)
for(const offset of[.75,1]){await scroll(offset);sample=await inspect();assert.ok(sample.city);assert.ok(Math.abs(sample.chase-7.5)<.001);await page.screenshot({path:path.join(output,`scroll-${offset}.png`)})}
await page.setViewportSize({width:390,height:844});await scroll(.28);await page.screenshot({path:path.join(output,'mobile-fleet.png')})
await scroll(.5);assert.equal(await page.locator('.service-info').count(),0);await page.screenshot({path:path.join(output,'mobile-services.png')})
await page.getByRole('button',{name:'Outstation',exact:true}).click();await page.waitForTimeout(900);sample=await inspect();const mobileCard=sample.obstacles.find(o=>o.name.includes('service-info')).box
assert.ok(mobileCard.left>=0&&mobileCard.right<=390);assert.ok(!overlaps(mobileCard,sample.signBoxes.outstation));await page.screenshot({path:path.join(output,'mobile-services-outstation.png')})
assert.deepEqual(messages,[])
await browser.close()
const expected={'brand.js':'A1AF89A39B87FD5B73BE9FB5D8114F2530E14FA27DE19E0CE8D1008A1EC911C5','cars.js':'53FFB69480E0F7F63AD2AF218B2C601675CAC2219EE28369EAABF5EA2033412E','landmarks.js':'66DE592143A520AA9317CD831E1A500B834220307B146F5DC8EA46C9E3FFEB0E','sections.js':'9D4FF539281BB83276C5FD846AFF49329D02050980FB95F0BDDBC35813F590D4','services.js':'EA59DDAF0B68AD43C49F4547D2762AD44289339AD48D3EA9E6F1069FF73CE4F9'}
for(const[file,hash]of Object.entries(expected))assert.equal(createHash('sha256').update(await fs.readFile(`src/data/${file}`)).digest('hex').toUpperCase(),hash)
report.dataFilesUnchanged=true
await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log('PASS fleet spacing/tags/specs, click-only opposite service cards, ribbon roads, desktop/mobile, unchanged data, zero warnings.')
