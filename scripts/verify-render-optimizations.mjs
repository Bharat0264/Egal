import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { GLTFLoader, MeshoptDecoder } from 'three-stdlib'
import { Box3, Vector3 } from 'three'
import { prepareCarModel } from '../src/scene/carModel.js'
import { createQualityController, qualityProfile } from '../src/scene/world/renderQuality.js'
const loader=new GLTFLoader().setMeshoptDecoder(typeof MeshoptDecoder==='function'?MeshoptDecoder():MeshoptDecoder)
loader.register(()=>({name:'EXT_texture_webp',loadTexture:async()=>null}))
const bytes=await fs.readFile('public/models/car.opt.glb')
const {scene}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')
const triangleCount=root=>{let total=0;root.traverse(o=>{if(o.isMesh)total+=Math.min(o.geometry.drawRange.count,o.geometry.index?.count??o.geometry.attributes.position.count)/3});return total}
const before=triangleCount(scene),bounds=new Box3().setFromObject(scene,true),car=prepareCarModel(scene)
assert.equal(triangleCount(car.root),before)
assert.deepEqual(new Box3().setFromObject(scene,true),bounds)
assert.equal(triangleCount(scene),before)
const box=new Box3().setFromObject(car.root,true),size=box.getSize(new Vector3())
assert.ok(Math.abs(size.z-4.3)<1e-5);assert.ok(Math.abs(box.min.y)<1e-5)
for(const wheel of car.wheels){assert.ok(wheel.spin.children.some(o=>o.name.startsWith('batch-')));wheel.spin.quaternion.setFromAxisAngle(wheel.spinAxis,.5);wheel.spin.updateWorldMatrix(true,true)}
assert.ok(car.paintMaterials.every(m=>m.name==='BodyPaint'))
let draws=0;car.root.traverse(o=>{if(o.isMesh&&o.geometry.attributes.position.count)draws++})
assert.ok(draws<40)
const profile=qualityProfile({coarse:true,cores:8,memory:8,dpr:3}),controller=createQualityController(profile)
assert.equal(profile.max,1.35)
for(let i=0;i<160;i++)controller.sample(.05)
assert.ok(controller.target<profile.max)
for(let i=0;i<3000;i++)controller.sample(.05)
assert.ok(controller.target>=profile.min)
for(let i=0;i<3000;i++)controller.sample(1/60)
assert.ok(controller.target<=profile.max&&controller.target>profile.min)
car.dispose()
console.log(`PASS unchanged ${before} triangles/silhouette, ${draws} batched draws, grounded 4.3m car, live wheel pivots, original asset isolation and quality hysteresis.`)
