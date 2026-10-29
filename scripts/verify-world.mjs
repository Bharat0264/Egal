import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(path.join(process.env.EGAL_BROWSER_MODULES, 'package.json'))
const { chromium } = require('playwright')
const output = path.resolve('assets/world-checks')
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-unsafe-swiftshader'] })
const report = { measurement: 'Headless Microsoft Edge, local machine, WebGL renderer recorded below. CPU throttle is a simulation, not a physical phone.' }

async function scroll(page, offset) {
  await page.evaluate(value => {
    const el = [...document.querySelectorAll('div')].find(e => e.clientHeight > 0 && e.scrollHeight > e.clientHeight * 3 && getComputedStyle(e).overflowY === 'auto')
    el.scrollTop = (el.scrollHeight - el.clientHeight) * value
  }, offset)
  await page.waitForTimeout(2200)
}
async function instrument(page) {
  await page.addInitScript(() => {
    const qa = window.__worldQA = { calls: 0, frames: [] }
    for (const Type of [WebGLRenderingContext, WebGL2RenderingContext]) for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      if (!Object.hasOwn(Type.prototype, name)) continue
      const original = Type.prototype[name]
      Type.prototype[name] = function (...args) { qa.calls++; return original.apply(this, args) }
    }
    let previous = performance.now()
    function frame(now) {
      qa.frames.push({ ms: now - previous, calls: qa.calls }); if (qa.frames.length > 600) qa.frames.shift()
      previous = now; qa.calls = 0; requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })
}
async function measure(page) {
  await page.evaluate(() => { window.__worldQA.frames = [] })
  await page.waitForTimeout(3200)
  return page.evaluate(() => {
    const frames = window.__worldQA.frames.filter(f => f.ms > 0 && f.calls > 0)
    const gl = document.querySelector('canvas').getContext('webgl2'), ext = gl.getExtension('WEBGL_debug_renderer_info')
    return { fps: +(1000 / (frames.reduce((s, f) => s + f.ms, 0) / frames.length)).toFixed(1), drawCalls: Math.round(frames.reduce((s, f) => s + f.calls, 0) / frames.length), frames: frames.length, renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) }
  })
}

// Development assertions inspect the real R3F scene without app debug hooks.
const dev = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const devMessages = []
dev.on('console', m => { if (['warning', 'error'].includes(m.type())) devMessages.push(m.text()) })
dev.on('pageerror', e => devMessages.push(e.message))
await dev.goto('http://localhost:5173/')
await dev.getByRole('button', { name: /^START/ }).click({ timeout: 45000 })
report.alignment = []
for (const offset of [0, 0.25, 0.5, 0.75, 1]) {
  await scroll(dev, offset)
  const sample = await dev.evaluate(async offset => {
    const entry = performance.getEntriesByType('resource').find(e => /@react-three_fiber\.js/.test(e.name))
    const fiber = await import(entry.name), { scene, camera, gl } = fiber._roots.get(document.querySelector('canvas')).store.getState()
    const car = scene.getObjectByName('car'), { roadCurve, getJourneyProgress } = await import('/src/scene/Road.jsx')
    const point = roadCurve.getPointAt(getJourneyProgress(offset))
    const instances = []; scene.traverse(o => { if (o.isInstancedMesh) instances.push({ name: o.name, count: o.count }) })
    return { offset, error: car.position.distanceTo(point), distance: Math.hypot(camera.position.x - car.position.x, camera.position.z - car.position.z), height: camera.position.y - car.position.y, fov: camera.fov, fog: scene.fog.color.getHexString(), instances, calls: gl.info.render.calls, triangles: gl.info.render.triangles, city: scene.getObjectByName('distant-city').visible, landmarks: !!scene.getObjectByName('landmark-fleetBay') }
  }, offset)
  assert.ok(sample.error < 0.03); assert.ok(Math.abs(sample.distance - 7.5) < 0.001); assert.ok(Math.abs(sample.height - 1.9) < 0.001); assert.equal(sample.fov, 45)
  assert.equal(sample.city, offset >= 0.75); assert.equal(sample.landmarks, true)
  report.alignment.push(sample)
}
await dev.setViewportSize({ width: 375, height: 812 }); await scroll(dev, 0)
report.mobileInstances = await dev.evaluate(async () => {
  const entry = performance.getEntriesByType('resource').find(e => /@react-three_fiber\.js/.test(e.name))
  const fiber = await import(entry.name), { scene } = fiber._roots.get(document.querySelector('canvas')).store.getState()
  return ['palm-trunks', 'shrubs', 'coastal-rocks', 'city-buildings'].map(name => ({ name, count: scene.getObjectByName(name).count }))
})
for (const mobile of report.mobileInstances) {
  const desktop = report.alignment[0].instances.find(i => i.name === mobile.name)
  assert.ok(mobile.count / desktop.count > 0.4 && mobile.count / desktop.count < 0.6)
}
assert.deepEqual(devMessages, [])
report.devMessages = devMessages
await dev.close()

// Production captures and measurements include no development-only anchors.
for (const mobile of [false, true]) {
  const context = await browser.newContext({ viewport: mobile ? { width: 375, height: 812 } : { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await context.newPage(), messages = []
  await instrument(page)
  page.on('console', m => { if (['warning', 'error'].includes(m.type())) messages.push(m.text()) })
  page.on('pageerror', e => messages.push(e.message))
  await page.goto('http://localhost:4173/')
  await page.getByRole('button', { name: /^START/ }).click({ timeout: 45000 })
  const bytes = await page.evaluate(() => [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')].reduce((s, e) => ({ encoded: s.encoded + e.encodedBodySize, decoded: s.decoded + e.decodedBodySize }), { encoded: 0, decoded: 0 }))
  assert.ok(bytes.encoded < 8 * 1024 * 1024)
  for (const offset of [0, 0.25, 0.5, 0.75, 1]) {
    await scroll(page, offset)
    await page.screenshot({ path: path.join(output, `${mobile ? 'mobile' : 'desktop'}-${String(offset).replace('.', '-')}.png`) })
    const text = await page.evaluate(() => [...document.querySelectorAll('.section-copy')].filter(e => getComputedStyle(e).visibility !== 'hidden').map(e => {
      const box = e.querySelector('h1').getBoundingClientRect()
      return { left: box.left, right: box.right, width: innerWidth, font: parseFloat(getComputedStyle(e.querySelector('h1')).fontSize) }
    }))
    text.forEach(t => { assert.ok(t.left >= 0 && t.right <= t.width + 1); assert.ok(t.font >= 28) })
  }
  await scroll(page, 0.9)
  if (mobile) { const cdp = await context.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }) }
  const stats = await measure(page)
  assert.deepEqual(messages, [])
  report[mobile ? 'mobile4xCPU' : 'desktop'] = { ...stats, initialEncodedBytes: bytes.encoded, initialDecodedBytes: bytes.decoded, messages }
  await context.close()
}
await fs.writeFile(path.join(output, 'world-report.json'), JSON.stringify(report, null, 2))
await browser.close()
console.log(JSON.stringify({ alignment: report.alignment.map(({ offset, error, distance, calls, triangles }) => ({ offset, error, distance, calls, triangles })), desktop: report.desktop, mobile4xCPU: report.mobile4xCPU }, null, 2))
