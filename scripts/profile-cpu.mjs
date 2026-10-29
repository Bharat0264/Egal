import{createRequire}from'node:module';import path from'node:path';import fs from'node:fs/promises'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json')),{chromium}=require('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:390,height:800},deviceScaleFactor:2,isMobile:true,hasTouch:true}),cdp=await page.context().newCDPSession(page)
await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await page.goto('http://localhost:5173/');await page.getByRole('button',{name:/^START/}).click({timeout:60000});await page.evaluate(()=>{const e=[...document.querySelectorAll('div')].find(e=>e.scrollHeight>e.clientHeight*3&&getComputedStyle(e).overflowY==='auto');e.scrollTop=(e.scrollHeight-e.clientHeight)*.95});await page.waitForTimeout(18000)
await cdp.send('Profiler.enable');await cdp.send('Profiler.start');await page.waitForTimeout(3000);const{profile}=await cdp.send('Profiler.stop')
await fs.writeFile('assets/performance/cpu.json',JSON.stringify(profile));console.log(profile.nodes.filter(n=>n.hitCount).sort((a,b)=>b.hitCount-a.hitCount).slice(0,35).map(n=>({fn:n.callFrame.functionName,file:n.callFrame.url.split('/').pop(),line:n.callFrame.lineNumber,hits:n.hitCount})))
await browser.close()
