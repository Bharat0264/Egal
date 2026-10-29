import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json')),{chromium}=require('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']})
const page=await browser.newPage({viewport:{width:1440,height:900}}),messages=[]
page.on('pageerror',e=>messages.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))messages.push(m.text())})
await page.route('**/api/bookings',route=>route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}))
await page.goto('http://localhost:5174/');await page.getByRole('button',{name:/^START/}).click({timeout:45000})
async function scroll(offset){await page.evaluate(offset=>{const el=[...document.querySelectorAll('div')].find(e=>e.clientHeight>0&&e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');el.scrollTop=(el.scrollHeight-el.clientHeight)*offset},offset);await page.waitForTimeout(6500)}
async function inspect(){return page.evaluate(async()=>{
 const entry=performance.getEntriesByType('resource').find(e=>/@react-three_fiber\.js/.test(e.name)),fiber=await import(entry.name),{scene,camera}=fiber._roots.get(document.querySelector('canvas')).store.getState()
 const car=scene.getObjectByName('car'),wheel=car.getObjectByName('Wheel_RL'),toll=scene.getObjectByName('toll-gate'),destination=scene.getObjectByName('egal-destination'),V=camera.position.constructor
 const light=scene.getObjectByName('toll-barrier-1'),local=car.position.clone().applyMatrix4(destination.matrixWorld.clone().invert())
 return {car:car.position.toArray(),wheel:wheel.quaternion.toArray(),barrier:light.rotation.z,parked:local.toArray(),camera:camera.position.toArray(),toll:car.position.clone().applyMatrix4(toll.matrixWorld.clone().invert()).toArray(),sky:scene.fog.color.getHexString(),pin:scene.getObjectByName('destination-map-pin').visible}
})}
await scroll(.7);const waiting=await inspect();assert.ok(Math.abs(waiting.barrier)<.01);assert.ok(waiting.toll[2]<-4.8)
await page.locator('#booking-pickup').fill('2099-06-01');await page.locator('#booking-dropoff').fill('2099-06-03');await page.locator('#booking-location').fill('Airport');await page.locator('#booking-carId').selectOption('suv');await page.locator('#booking-phone').fill('9876543210')
await page.getByRole('button',{name:'Book now',exact:true}).click();await page.waitForTimeout(6000)
const passed=await inspect();assert.ok(Math.abs(passed.barrier)>1.5);assert.ok(passed.toll[2]>7);assert.notDeepEqual(passed.wheel,waiting.wheel);assert.ok(Math.hypot(...passed.camera.map((v,i)=>v-waiting.camera[i]))>1.5)
await scroll(.65);assert.ok(Math.abs((await inspect()).barrier)<.04)
await scroll(.95);const parked=await inspect();assert.ok(Math.hypot(parked.parked[0]-8,parked.parked[1],parked.parked[2]+4)<.05)
await scroll(1);const end=await inspect();assert.ok(Math.hypot(...end.car.map((v,i)=>v-parked.car[i]))<.05)
await page.waitForTimeout(1200);const stopped=await inspect();assert.ok(stopped.wheel.every((v,i)=>Math.abs(v-end.wheel[i])<.0001));assert.notEqual(end.sky,waiting.sky)
await scroll(.75);assert.ok(Math.abs((await inspect()).barrier)<.04);assert.ok(await page.getByRole('form',{name:'Book Your Ride'}).isVisible());await scroll(1)
await page.getByRole('button',{name:/Back to start/}).click();await page.waitForTimeout(6500);await scroll(.7);assert.equal(await page.locator('#booking-carId').inputValue(),'');assert.equal(await page.locator('#booking-phone').inputValue(),'')
assert.deepEqual(messages,[])
await browser.close();await fs.writeFile('assets/step6-checks/motion-report.json',JSON.stringify({waiting,passed,parked,end,messages},null,2))
console.log('PASS dev: barrier down/up/reset, 14 m drive-through, camera push, wheels spin then stop, parking at destination and reset clears form.')
