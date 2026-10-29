import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

// Browser tooling is supplied by the workspace runtime, not an app dependency.
const require = createRequire(path.join(process.env.EGAL_BROWSER_MODULES, 'package.json'))
const { chromium } = require('playwright')
const output = path.resolve('assets/polish-checks')
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-unsafe-swiftshader'] })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const page = await context.newPage()
const warnings = [], errors = []
page.on('console', message => {
  if (message.type() === 'warning') warnings.push(message.text())
  if (message.type() === 'error') errors.push(message.text())
})
page.on('pageerror', error => errors.push(error.message))
let releaseModel, requested
const gate = new Promise(resolve => { releaseModel = resolve })
const modelRequested = new Promise(resolve => { requested = resolve })
await page.route('**/models/car.opt.glb', async route => { requested(); await gate; await route.continue() })
await page.goto(process.env.EGAL_BASE_URL ?? 'http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await Promise.race([modelRequested, new Promise((_, reject) => setTimeout(() => reject(new Error('Optimized model was not requested')), 30000))])
assert.equal(await page.getByRole('button', { name: /^START/ }).count(), 0, 'START must wait for the model')
releaseModel()
await page.getByRole('button', { name: /^START/ }).waitFor({ state: 'visible', timeout: 45000 })
await page.getByRole('button', { name: /^START/ }).click()
await page.waitForTimeout(1200)

async function inspect() {
  return page.evaluate(async () => {
    const entry = performance.getEntriesByType('resource').find(item => /@react-three_fiber\.js/.test(item.name))
    if (!entry) throw new Error('Fiber module resource not found')
    const fiber = await import(entry.name)
    const state = fiber._roots.get(document.querySelector('canvas')).store.getState()
    const { scene, camera } = state
    const car = scene.getObjectByName('car')
    const model = scene.getObjectByName('egal-normalized-car')
    if (!model) throw new Error('The real model did not mount')
    const Vector = car.position.constructor
    model.updateWorldMatrix(true, true)
    const inverse = model.matrixWorld.clone().invert()
    const min = new Vector(Infinity, Infinity, Infinity), max = new Vector(-Infinity, -Infinity, -Infinity)
    const ndcMin = new Vector(Infinity, Infinity, Infinity), ndcMax = new Vector(-Infinity, -Infinity, -Infinity)
    model.traverse(object => {
      if (!object.isMesh) return
      const matrix = inverse.clone().multiply(object.matrixWorld)
      const position = object.geometry.attributes.position
      const v = new Vector(), projected = new Vector()
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i).applyMatrix4(matrix)
        min.min(v); max.max(v)
        projected.copy(v).applyMatrix4(model.matrixWorld).project(camera)
        ndcMin.min(projected); ndcMax.max(projected)
      }
    })
    const wheels = ['FL','FR','RL','RR'].map(corner => model.getObjectByName(`Wheel_${corner}`).quaternion.toArray())
    const dx = camera.position.x - car.position.x, dz = camera.position.z - car.position.z
    const road = await import('/src/scene/Road.jsx')
    const { overlapsHeadline } = await import('/src/scene/world/Instances.jsx')
    const Matrix = model.matrixWorld.constructor, transform = new Matrix(), position = new Vector()
    const obstructions = []
    for (const name of ['shrubs','lamp-poles','lamp-arms','lamp-heads','sign-posts','road-sign-0','road-sign-1']) {
      const mesh = scene.getObjectByName(name)
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, transform); position.setFromMatrixPosition(transform)
        if (Math.hypot(transform.elements[0],transform.elements[1],transform.elements[2]) < 0.001) continue
        if (overlapsHeadline(mesh.geometry, transform, camera)) obstructions.push(`${name}:${i}`)
      }
    }
    const palms = scene.getObjectByName('palm-trunks')
    let nearestPalm = Infinity
    for (let i = 0; i < palms.count; i++) {
      palms.getMatrixAt(i, transform); position.setFromMatrixPosition(transform); position.y = 0
      for (let j = 0; j <= 100; j++) nearestPalm = Math.min(nearestPalm, position.distanceTo(road.roadCurve.getPointAt(j/100)))
    }
    const gravel = scene.getObjectByName('coastal-terrain').children.find(o => o.material?.map)?.material.map
    const shadow = scene.getObjectByName('car-contact-shadow').children.find(o => o.isMesh)
    // Read the baked contact texture, so an empty shadow map cannot pass QA.
    const context = state.gl.getContext(), texture = shadow.material.map
    const oldFramebuffer = context.getParameter(context.FRAMEBUFFER_BINDING), framebuffer = context.createFramebuffer()
    context.bindFramebuffer(context.FRAMEBUFFER, framebuffer)
    context.framebufferTexture2D(context.FRAMEBUFFER, context.COLOR_ATTACHMENT0, context.TEXTURE_2D, state.gl.properties.get(texture).__webglTexture, 0)
    const framebufferStatus = context.checkFramebufferStatus(context.FRAMEBUFFER)
    const pixels = new Uint8Array(texture.image.width * texture.image.height * 4)
    context.readPixels(0, 0, texture.image.width, texture.image.height, context.RGBA, context.UNSIGNED_BYTE, pixels)
    context.bindFramebuffer(context.FRAMEBUFFER, oldFramebuffer); context.deleteFramebuffer(framebuffer)
    let shadowPixels = 0
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 8) shadowPixels++
    const scroller = [...document.querySelectorAll('div')].find(el => el.clientHeight > 0 && el.scrollHeight > el.clientHeight * 3 && getComputedStyle(el).overflowY === 'auto')
    if (!scroller) throw new Error('Native scroll container not found')
    const offset = scroller.scrollTop / (scroller.scrollHeight - scroller.clientHeight)
    const curvePoint = road.roadCurve.getPointAt(road.getJourneyProgress(offset))
    const steering = ['FL','FR'].map(corner => model.getObjectByName(`SteerPivot_${corner}`).quaternion.toArray())
    return {
      offset, position: car.position.toArray(), centreLineError: car.position.distanceTo(curvePoint),
      horizontalDistance: Math.hypot(dx, dz), height: camera.position.y - car.position.y,
      fov: camera.fov, localGround: min.y, length: max.z-min.z, width: max.x-min.x,
      projected: { width: ndcMax.x-ndcMin.x, height: ndcMax.y-ndcMin.y, min: ndcMin.toArray(), max: ndcMax.toArray() },
      wheels, steering,
      obstructions, nearestPalm, fogNear: scene.fog.near, exposure: state.gl.toneMappingExposure,
      gravel: { width: gravel.image.width, anisotropy: gravel.anisotropy, mipmaps: gravel.generateMipmaps, repeat: gravel.repeat.toArray() },
      shadow: { opacity: shadow.material.opacity, width: shadow.material.map.image.width, coverage: shadowPixels / (texture.image.width * texture.image.height), framebufferStatus, max: pixels.reduce((a,b)=>Math.max(a,b),0), first: Array.from(pixels.slice(0,4)) },
      sky: Object.fromEntries(Object.entries(scene.getObjectByName('gradient-sky').material.uniforms).map(([key,uniform]) => [key,uniform.value.isColor ? uniform.value.getHexString() : uniform.value])),
    }
  })
}

async function scrollTo(offset) {
  await page.evaluate(value => {
    const el = [...document.querySelectorAll('div')].find(el => el.clientHeight > 0 && el.scrollHeight > el.clientHeight * 3 && getComputedStyle(el).overflowY === 'auto')
    el.scrollTop = (el.scrollHeight-el.clientHeight)*value
  }, offset)
  await page.waitForTimeout(2800)
}

const curve = await page.evaluate(async () => {
  const { roadCurve, getJourneyProgress } = await import('/src/scene/Road.jsx')
  let best = { offset: .5, turn: 0 }
  for (let i = 5; i < 96; i++) {
    const offset = i/100, u = getJourneyProgress(offset)
    const a=roadCurve.getTangentAt(u-.002), b=roadCurve.getTangentAt(u+.002)
    const turn=Math.abs(Math.atan2(a.z*b.x-a.x*b.z,a.dot(b)))
    if (turn>best.turn) best={offset,turn}
  }
  return best.offset
})
const samples = []
for (const [label, offset] of [['scroll-0',0],['scroll-025',.25],['scroll-050',.5],['scroll-075',.75],['scroll-100',1],['curve',curve]]) {
  await scrollTo(offset)
  const sample = { label, ...await inspect() }
  assert.ok(sample.centreLineError < .015, `${label}: centre-line error ${sample.centreLineError}`)
  assert.ok(Math.abs(sample.horizontalDistance-7.5)<.0001)
  assert.ok(Math.abs(sample.height-1.9)<.0001)
  assert.equal(sample.fov,45)
  assert.ok(Math.abs(sample.localGround)<.025)
  assert.ok(Math.abs(sample.length-4.3)<.01)
  assert.deepEqual(sample.obstructions, [], 'foreground props must clear the headline rectangle')
  assert.ok(sample.nearestPalm >= 40, 'palms must remain outside the path clearance')
  assert.equal(sample.fogNear,75)
  assert.ok(Math.abs(sample.sky.progress - offset) < .005, 'sunrise mask must follow scroll')
  assert.equal(sample.gravel.width,1024); assert.equal(sample.gravel.anisotropy,8); assert.equal(sample.gravel.mipmaps,true)
  assert.equal(sample.shadow.width,256); assert.equal(sample.shadow.opacity,.35)
  assert.equal(sample.shadow.framebufferStatus,36053)
  assert.ok(sample.shadow.coverage > .02, 'contact shadow texture must contain the car silhouette')
  samples.push(sample)
  await page.screenshot({ path: path.join(output, `${label}.png`) })
}
for (const dimension of ['width','height']) {
  const values=samples.map(sample=>sample.projected[dimension])
  assert.ok(Math.max(...values)/Math.min(...values)<1.06, `constant projected ${dimension}`)
}
assert.notDeepEqual(samples[0].wheels, samples[1].wheels, 'wheels spin with travelled distance')
const stopped = await inspect()
await page.waitForTimeout(800)
const later = await inspect()
assert.deepEqual(stopped.wheels,later.wheels,'wheels stop when scrolling stops')

// Check wheel motion and chase radius during a real moving transition as well.
await page.evaluate(() => {
  const el=[...document.querySelectorAll('div')].find(el=>el.clientHeight>0&&el.scrollHeight>el.clientHeight*3&&getComputedStyle(el).overflowY==='auto')
  el.scrollTop=(el.scrollHeight-el.clientHeight)*.92
})
await page.waitForTimeout(150)
const movingA=await inspect()
await page.waitForTimeout(180)
const movingB=await inspect()
assert.notDeepEqual(movingA.wheels,movingB.wheels)
assert.ok(Math.abs(movingB.horizontalDistance-7.5)<.0001)

await page.setViewportSize({width:390,height:844})
await scrollTo(0)
const mobile=await inspect()
await page.screenshot({path:path.join(output,'mobile-390.png')})
assert.equal(mobile.fov,45)
assert.ok(mobile.projected.min[0]>-1.05 && mobile.projected.max[0]<1.05,'mobile car stays in frame')
const report={loaderGateVerified:true,samples,moving:[movingA,movingB],mobile,warnings,errors}
await fs.writeFile(path.join(output,'browser-report.json'),JSON.stringify(report,null,2)+'\n')
assert.deepEqual(warnings,[],`Browser warnings: ${warnings.join('\n')}`)
assert.deepEqual(errors,[],`Browser errors: ${errors.join('\n')}`)

// A deliberately failed model request must still produce a usable placeholder.
// Expected network/React diagnostics from this fault-injection context are separate.
const fallbackContext=await browser.newContext({viewport:{width:1440,height:900}})
const fallbackPage=await fallbackContext.newPage()
await fallbackPage.route('**/models/car.opt.glb',route=>route.abort('failed'))
await fallbackPage.goto(process.env.EGAL_BASE_URL ?? 'http://localhost:5173/')
await fallbackPage.getByRole('button',{name:/^START/}).waitFor({timeout:30000})
await fallbackPage.getByRole('button',{name:/^START/}).click()
await fallbackPage.waitForTimeout(700)
const fallbackMounted=await fallbackPage.evaluate(async()=>{
  const entry=performance.getEntriesByType('resource').find(item=>/@react-three_fiber\.js/.test(item.name))
  const fiber=await import(entry.name)
  const state=fiber._roots.get(document.querySelector('canvas')).store.getState()
  return !!state.scene.getObjectByName('placeholder-car') && !state.scene.getObjectByName('egal-normalized-car')
})
assert.ok(fallbackMounted,'error boundary mounts the placeholder')
report.errorFallbackVerified=true
await fs.writeFile(path.join(output,'browser-report.json'),JSON.stringify(report,null,2)+'\n')
await browser.close()
console.log(`PASS: model-ready loader, five scroll positions plus curve screenshots, centre line, stationary/moving wheels, fixed camera, mobile framing, ${warnings.length} warnings and ${errors.length} errors.`)
