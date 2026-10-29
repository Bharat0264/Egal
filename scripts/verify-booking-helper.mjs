import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json')),{chromium}=require('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true})
const page=await browser.newPage(),messages=[]
page.on('pageerror',e=>messages.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))messages.push(m.text())})
// Use a same-origin blank document to verify the real Vite-transformed helper without a second WebGL scene.
await page.route('**/booking-test',route=>route.fulfill({contentType:'text/html',body:'<title>Booking helper checks</title>'}))
await page.goto('http://localhost:5174/booking-test')
let posted
await page.route('**/api/bookings',async route=>{posted=route.request().postDataJSON();await route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'})})
const result=await page.evaluate(async()=>{
 const {validateBooking,bookingEstimate,submitBooking}=await import('/src/lib/booking.js')
 const good={pickup:'2099-06-01',dropoff:'2099-06-04',location:'Test airport',carId:'premium-suv',color:'#c0161b',phone:'9876543210',service:'self-drive',website:''}
 const invalids=[{...good,pickup:'2020-01-01'},{...good,dropoff:good.pickup},{...good,dropoff:'2099-05-01'},{...good,pickup:'2099-02-30'},{...good,phone:'1234567890'},{...good,phone:'98765'},{...good,website:'spam'},{...good,carId:'unknown'}]
 return {valid:validateBooking(good),invalids:invalids.map(data=>validateBooking(data)),estimate:bookingEstimate(good),submitted:await submitBooking(good)}
})
assert.deepEqual(result.valid,{});for(const errors of result.invalids)assert.ok(Object.keys(errors).length)
assert.deepEqual(result.estimate,{days:3,rate:4299,total:12897});assert.equal(result.submitted.channel,'endpoint')
assert.equal(posted.phone,'9876543210');assert.equal(posted.estimate.total,12897);assert.equal(posted.carId,'premium-suv');assert.ok(!('website' in posted))
// A failed backend remains an error, never a false success.
await page.unroute('**/api/bookings');await page.route('**/api/bookings',route=>route.abort('failed'))
const rejected=await page.evaluate(async()=>{const{submitBooking}=await import('/src/lib/booking.js');try{await submitBooking({pickup:'2099-06-01',dropoff:'2099-06-04',location:'Test',carId:'suv',color:'#fff',phone:'9876543210',service:'self-drive'});return false}catch{return true}})
assert.ok(rejected)
await browser.close();await fs.writeFile('assets/step6-checks/helper-report.json',JSON.stringify({result,posted,rejected},null,2))
console.log('PASS dev server, required/date/phone/honeypot validation, estimate, endpoint JSON success and network failure.')
