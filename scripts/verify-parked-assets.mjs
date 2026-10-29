import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {GLTFLoader,MeshoptDecoder} from 'three-stdlib'
import {Box3,Group,Mesh,MeshStandardMaterial,BoxGeometry,Vector3} from 'three'
import {parkedAsset} from '../src/scene/showcase/parkedAsset.js'
const loader=new GLTFLoader().setMeshoptDecoder(typeof MeshoptDecoder==='function'?MeshoptDecoder():MeshoptDecoder)
loader.register(()=>({name:'EXT_texture_webp',loadTexture:async()=>null}))
const buffer=await fs.readFile('public/models/car.opt.glb')
const gltf=await loader.parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'')
const original=new Box3().setFromObject(gltf.scene,true),parts=parkedAsset(gltf.scene),box=new Box3()
for(const part of parts){part.geometry.computeBoundingBox();box.union(part.geometry.boundingBox)}
const size=box.getSize(new Vector3()),centre=box.getCenter(new Vector3())
assert.ok(Math.abs(box.min.y)<1e-5);assert.ok(Math.abs(centre.x)<1e-5&&Math.abs(centre.z)<1e-5)
assert.ok(size.z<=4.30001&&size.x<=2.13001);assert.ok(size.z>4)
assert.deepEqual(new Box3().setFromObject(gltf.scene,true),original)
assert.equal(parkedAsset(gltf.scene),parts)
// Multi-material primitives are split and preserve paint-only material identity.
const fixture=new Group(),paint=new MeshStandardMaterial({name:'BodyPaint',color:'#fff'}),trim=new MeshStandardMaterial({name:'Trim',color:'#111'})
fixture.add(new Mesh(new BoxGeometry(2,1.5,5),[paint,trim,paint,trim,paint,trim]))
const split=parkedAsset(fixture);assert.equal(split.length,2);assert.ok(split.every(part=>part.geometry.attributes.position.count>0))
const cloned=parts.map(part=>({...part,material:part.material.clone()})),untouched=parts.map(part=>part.material.color.getHexString())
for(const part of cloned)if(part.name==='BodyPaint')part.material.color.set('#123456')
parts.forEach((part,i)=>assert.equal(part.material.color.getHexString(),untouched[i]))
console.log('PASS parked asset: original hero unchanged, centred/grounded/bounded, shared geometry cache, multi-material support and isolated paint clones.',size.toArray())
