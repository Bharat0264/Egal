import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json')),{chromium}=require('playwright'),browser=await chromium.launch({channel:'msedge',headless:true}),reports=[]
for(const[provider,port]of[['umami',5175],['plausible',5176]]){
 const page=await browser.newPage(),messages=[]
 page.on('pageerror',e=>messages.push(e.message))
 await page.addInitScript(()=>{window.__events=[];window.__audioContexts=0;for(const key of['AudioContext','webkitAudioContext'])if(window[key]){const Original=window[key];window[key]=new Proxy(Original,{construct(target,args){window.__audioContexts++;return Reflect.construct(target,args)}})}})
 await page.route('https://analytics.example/script.js',route=>route.fulfill({contentType:'text/javascript',body:provider==='umami'?'window.umami={track:(...args)=>window.__events.push(args)}':'window.__plausibleOptions=window.plausible.o;const q=window.plausible.q||[];window.plausible=(...args)=>window.__events.push(args);for(const args of q)window.plausible(...args)'}))
 await page.route('**/src/scene/World.jsx*',route=>route.fulfill({contentType:'text/javascript',body:'export default function World(){return null}'}))
 await page.goto(`http://127.0.0.1:${port}/?email=SHOULD_NOT_LEAK`);await page.waitForFunction(()=>window.__events.length>0)
 await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/src/lib/analytics.js')).name;window.api=await import(url);window.api.track('car_selected',{car:'suv',phone:'SHOULD_NOT_LEAK',email:'SHOULD_NOT_LEAK',location:'SHOULD_NOT_LEAK'});window.api.track('not_allowed',{phone:'SHOULD_NOT_LEAK'})})
 const events=await page.evaluate(()=>window.__events);assert.ok(events.some(args=>args[0]==='car_selected'));assert.ok(!JSON.stringify(events).includes('SHOULD_NOT_LEAK'))
 if(provider==='umami'){
  const data=await page.evaluate(()=>window.egalAnalyticsBeforeSend('event',{url:location.origin+'/simple?phone=SHOULD_NOT_LEAK',referrer:'https://referrer.example/private/person?email=SHOULD_NOT_LEAK',data:{car:'suv',phone:'SHOULD_NOT_LEAK'}}))
  assert.equal(data.url,`http://127.0.0.1:${port}/simple`);assert.equal(data.referrer,'https://referrer.example/');assert.deepEqual(data.data,{car:'suv'})
 }else{
  const options=await page.evaluate(()=>({auto:window.__plausibleOptions.autoCapturePageviews,forms:window.__plausibleOptions.formSubmissions,payload:window.__plausibleOptions.transformRequest({u:location.href,r:'https://referrer.example/private?phone=SHOULD_NOT_LEAK',p:{car:'suv',phone:'SHOULD_NOT_LEAK'}})}))
  assert.equal(options.auto,false);assert.equal(options.forms,false);assert.ok(!JSON.stringify(options.payload).includes('SHOULD_NOT_LEAK'))
 }
 await page.getByRole('button',{name:'Unmute sound'}).click();await page.reload();await page.getByRole('button',{name:'Mute sound'}).waitFor();await page.getByRole('button',{name:/^START/}).click();await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>window.__audioContexts),0)
 assert.deepEqual(messages,[]);reports.push({provider,piiDropped:true,noAudioEngineWithoutFiles:true,sessionSoundChoice:true});await page.close()
 const dnt=await browser.newPage();let external=0;await dnt.addInitScript(()=>Object.defineProperty(navigator,'doNotTrack',{value:'1'}));await dnt.route('https://analytics.example/**',route=>{external++;return route.abort()});await dnt.goto(`http://127.0.0.1:${port}/simple`);await dnt.waitForTimeout(400);assert.equal(external,0);await dnt.close()
}
await browser.close();await fs.writeFile('assets/hardening-checks/analytics.json',JSON.stringify(reports,null,2));console.log('PASS both tracker adapters, no form/query/referrer PII, DNT opt-out, silent missing audio, session preference and zero premature AudioContexts. All tracker traffic was intercepted.')
