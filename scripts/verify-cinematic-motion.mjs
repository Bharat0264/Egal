import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
import {drivingShot} from '../src/scene/cinematicShots.js'
for(const mobile of[false,true])for(const reduced of[false,true]){
 let previous=drivingShot(0,mobile,reduced)
 for(let i=1;i<=1000;i++){
  const shot=drivingShot(i/1000,mobile,reduced)
  assert.ok(shot[1]>1.5&&shot[2]>5&&shot[3]>0)
  for(let axis=0;axis<4;axis++)assert.ok(Math.abs(shot[axis]-previous[axis])<.3)
  previous=shot
 }
}
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json')),{chromium}=require('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),page=await browser.newPage(),messages=[]
page.on('pageerror',e=>messages.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))messages.push(m.text())})
await page.goto('http://localhost:5173/');await page.getByRole('button',{name:/Skip introduction/}).click({timeout:60000})
await page.evaluate(async()=>{const entry=performance.getEntriesByType('resource').find(e=>/@react-three_fiber\.js/.test(e.name)),fiber=await import(entry.name);window.store=fiber._roots.get(document.querySelector('canvas')).store;window.scroller=[...document.querySelectorAll('div')].find(e=>e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto')})
const snapshot=()=>page.evaluate(()=>{const{scene,camera}=window.store.getState(),car=scene.getObjectByName('car'),wheel=car.getObjectByName('Wheel_RL');return{car:car.position.toArray(),wheel:wheel.quaternion.toArray(),camera:camera.position.toArray()}})
await page.waitForTimeout(2000);const initial=await snapshot()
await page.evaluate(()=>window.scroller.scrollTop=(window.scroller.scrollHeight-window.scroller.clientHeight)*.07);await page.waitForTimeout(3500);const moving=await snapshot()
assert.notDeepEqual(moving.car,initial.car);assert.notDeepEqual(moving.wheel,initial.wheel)
await page.waitForTimeout(1500);const stopped=await snapshot();await page.waitForTimeout(500);const stable=await snapshot()
assert.ok(stable.wheel.every((v,i)=>Math.abs(v-stopped.wheel[i])<1e-5))
await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(1000);const reduced=await snapshot();await page.waitForTimeout(500);const staticPose=await snapshot();assert.ok(staticPose.camera.every((v,i)=>Math.abs(v-reduced.camera[i])<1e-5))
assert.deepEqual(messages,[]);await page.close()
const bypass=await browser.newPage();let release
const gate=new Promise(resolve=>release=resolve)
await bypass.route('**/models/car.opt.glb',async route=>{await gate;await route.continue()})
await bypass.goto('http://localhost:4173/');await bypass.getByRole('button',{name:/Book Now/}).click();await bypass.getByRole('form',{name:'Book Your Ride'}).waitFor({timeout:30000});release();await bypass.waitForTimeout(1500)
await browser.close();await fs.writeFile('assets/cinematic-checks/motion.json',JSON.stringify({initial,moving,stopped,stable,reducedMotionStatic:true,bookingBypassesPendingModel:true,messages},null,2))
console.log('PASS continuous shot coordinates, live wheel spin/stop, grounded existing rig, reduced-motion static camera and Book Now while model download is held.')
