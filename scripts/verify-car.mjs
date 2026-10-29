import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { Box3, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { CAR_NODES, prepareCarModel } from '../src/scene/carModel.js'

await MeshoptDecoder.ready
const files = ['car.glb', 'car.opt.glb']
const report = { renamedNodes: [], renamedMaterials: [], files: {} }
for (const file of files) {
const bytes = await fs.readFile(new URL(`../public/models/${file}`, import.meta.url))
// Geometry-only Node audit: browsers verify actual image decoding/rendering.
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
loader.register(()=>({name:'EXT_texture_webp',loadTexture:async()=>null}))
const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
const car = prepareCarModel(gltf.scene), other = prepareCarModel(gltf.scene)
for (const name of CAR_NODES) assert.ok(car.nodes[name], name)
assert.ok(Math.abs(car.size.z - 4.3) < 1e-6)
assert.ok(Math.abs(new Box3().setFromObject(car.root).min.y) < 1e-6)
const originalPaint = other.paintMaterials[0].color.getHex()
const unchanged = []
car.root.traverse(o => {
  if (!o.isMesh) return
  for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
    if (m.name !== 'BodyPaint') unchanged.push([m, m.color.getHex()])
    else assert.ok(o === car.nodes.Body || car.nodes.Body.getObjectById(o.id), 'BodyPaint belongs only to Body')
  }
})
car.paintMaterials.forEach(m => m.color.set('#ff6600'))
assert.equal(other.paintMaterials[0].color.getHex(), originalPaint)
for (const [m, color] of unchanged) assert.equal(m.color.getHex(), color)
for (const wheel of car.wheels) {
  const hub = wheel.spin.getWorldPosition(new Vector3())
  wheel.spin.quaternion.copy(wheel.spinRotation).multiply(new wheel.spin.quaternion.constructor().setFromAxisAngle(wheel.spinAxis, 1 / wheel.radius))
  car.root.updateMatrixWorld(true)
  assert.ok(hub.distanceTo(wheel.spin.getWorldPosition(new Vector3())) < 1e-6)
  const stopped = wheel.spin.quaternion.clone()
  wheel.spin.quaternion.copy(wheel.spinRotation).multiply(new wheel.spin.quaternion.constructor().setFromAxisAngle(wheel.spinAxis, 1 / wheel.radius))
  assert.ok(stopped.angleTo(wheel.spin.quaternion) < 1e-6)
  if (wheel.spin.name.includes('_F')) {
    assert.equal(wheel.spin.parent, wheel.steer)
    wheel.steer.quaternion.copy(wheel.steerRotation).multiply(new wheel.spin.quaternion.constructor().setFromAxisAngle(wheel.steerAxis, .12))
    car.root.updateMatrixWorld(true)
    assert.ok(hub.distanceTo(wheel.spin.getWorldPosition(new Vector3())) < .001, 'steering keeps its hub')
  }
}
const raw = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString())
assert.equal(raw.images?.length,1,'Only the in-house tire normal texture is embedded')
assert.ok(['image/png','image/webp'].includes(raw.images[0].mimeType))
assert.ok(raw.materials.find(m=>m.name==='Tire').normalTexture)
assert.ok(raw.materials.filter(m=>m.name!=='Tire').every(m=>!m.normalTexture))
assert.ok(!raw.cameras?.length)
assert.ok(!raw.extensionsUsed?.includes('KHR_draco_mesh_compression'))
assert.ok(!raw.extensionsUsed?.includes('KHR_lights_punctual'))
assert.ok(!raw.nodes.some(node => /Studio_|RoadLine|Distant_|Sun_Disc|CAMERA|RoofRail/.test(node.name)))
for (const name of CAR_NODES) assert.ok(raw.nodes.some(node => node.name === name), `${file}: ${name}`)
for (const name of ['BodyPaint','Glass','Tire','Rim','Headlight','Taillight','Trim']) assert.ok(raw.materials.some(material => material.name === name))
const sourceBounds = new Box3().setFromObject(gltf.scene, true)
const sourceCenter = sourceBounds.getCenter(new Vector3())
assert.ok(Math.abs(sourceBounds.min.y) < .002)
assert.ok(Math.abs(sourceCenter.x) < .002 && Math.abs(sourceCenter.z) < .002, 'export centred at ground origin')
const head = gltf.scene.getObjectByName('Headlight_L'), tail = gltf.scene.getObjectByName('Taillight_L')
assert.ok(new Box3().setFromObject(head, true).getCenter(new Vector3()).z > new Box3().setFromObject(tail, true).getCenter(new Vector3()).z, '+Z forward')
const triangles = raw.meshes.reduce((sum, mesh) => sum + mesh.primitives.reduce((n, primitive) => n + raw.accessors[primitive.indices].count / 3, 0), 0)
report.files[file] = {
  bytes: bytes.length, triangles,
  nodes: raw.nodes.map(node => node.name), materials: raw.materials.map(material => material.name),
  extensions: raw.extensionsUsed, imageTextures: raw.images?.length ?? 0,
  sourceBounds: { min: sourceBounds.min.toArray(), max: sourceBounds.max.toArray() },
  normalizedSize: car.size.toArray(),
}
if (file.includes('.opt.')) assert.ok(bytes.length < 3_000_000)
console.log(`PASS ${file}: ${bytes.length} bytes; ${triangles} triangles; ${CAR_NODES.length} required nodes; normalization, isolated paint, hub-safe spin/steering, no studio objects.`)
car.dispose(); other.dispose()
}
assert.deepEqual(report.files[files[0]].nodes, report.files[files[1]].nodes)
assert.deepEqual(report.files[files[0]].materials, report.files[files[1]].materials)
assert.equal(report.files[files[0]].triangles, report.files[files[1]].triangles, 'approved geometry retained')
await fs.writeFile(new URL('../assets/web-export-report.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`)
