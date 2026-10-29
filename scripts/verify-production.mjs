import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import path from 'node:path'
const require=createRequire(path.join(process.env.EGAL_BROWSER_MODULES,'package.json'))
const {chromium}=require('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']})
const page=await browser.newPage({viewport:{width:1440,height:900}})
const warnings=[],errors=[],models=[]
page.on('console',message=>{
  if(message.type()==='warning')warnings.push(message.text())
  if(message.type()==='error')errors.push(message.text())
})
page.on('pageerror',error=>errors.push(error.stack ?? error.message))
page.on('response',response=>{if(response.url().includes('/models/'))models.push({url:response.url(),status:response.status()})})
await page.goto(process.env.EGAL_PREVIEW_URL ?? 'http://localhost:4173/')
await page.getByRole('button',{name:/^START/}).waitFor({timeout:45000}).catch(async error=>{
  console.log(JSON.stringify({warnings,errors,models,body:await page.locator('body').innerText()},null,2))
  await page.screenshot({path:'assets/web-checks/production-failure.png'})
  await browser.close()
  throw error
})
await page.getByRole('button',{name:/^START/}).click()
await page.waitForTimeout(900)
await page.evaluate(()=>{
  const el=[...document.querySelectorAll('div')].find(el=>el.clientHeight>0&&el.scrollHeight>el.clientHeight*3&&getComputedStyle(el).overflowY==='auto')
  el.scrollTop=(el.scrollHeight-el.clientHeight)*.6
})
await page.waitForTimeout(2300)
await page.screenshot({path:'assets/web-checks/production.png'})
await page.setViewportSize({width:375,height:812})
await page.waitForTimeout(1000)
assert.ok(models.some(model=>model.url.endsWith('/models/car.opt.glb')&&model.status===200))
assert.deepEqual(warnings,[])
assert.deepEqual(errors,[])
await browser.close()
console.log('PASS: built production site loads car.opt.glb; START and scrolling work; desktop/mobile compile with 0 warnings and 0 errors.')
