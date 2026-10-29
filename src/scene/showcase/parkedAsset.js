import { Box3, Float32BufferAttribute, Group, Vector3 } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
const assets=new WeakMap()

function geometryFor(mesh) {
 let geometry=mesh.geometry.clone()
 for(const name of['position','normal','uv']){
  const attribute=geometry.attributes[name]
  if(!attribute)continue
  const values=new Float32Array(attribute.count*attribute.itemSize),getters=['getX','getY','getZ','getW']
  for(let i=0;i<attribute.count;i++)for(let c=0;c<attribute.itemSize;c++)values[i*attribute.itemSize+c]=attribute[getters[c]](i)
  geometry.setAttribute(name,new Float32BufferAttribute(values,attribute.itemSize))
 }
 geometry.applyMatrix4(mesh.matrixWorld)
 if(geometry.index){const indexed=geometry;geometry=indexed.toNonIndexed();indexed.dispose()}
 for(const key of Object.keys(geometry.attributes))if(!['position','normal','uv'].includes(key))geometry.deleteAttribute(key)
 if(!geometry.attributes.normal)geometry.computeVertexNormals()
 if(!geometry.attributes.uv)geometry.setAttribute('uv',new Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2))
 return geometry
}
// Static display normalisation is independent of the animated hero's rig/loader.
export function parkedAsset(scene){
 if(assets.has(scene))return assets.get(scene)
 const root=new Group(),model=clone(scene);root.add(model);root.updateWorldMatrix(true,true)
 const front=new Box3(),rear=new Box3()
 for(const side of ['L','R']){
  const head=model.getObjectByName(`Headlight_${side}`),tail=model.getObjectByName(`Taillight_${side}`)
  if(head)front.union(new Box3().setFromObject(head,true))
  if(tail)rear.union(new Box3().setFromObject(tail,true))
 }
 if(!front.isEmpty()&&!rear.isEmpty()){
  const direction=front.getCenter(new Vector3()).sub(rear.getCenter(new Vector3()))
  if(Math.hypot(direction.x,direction.z)>.1)root.rotation.y=-Math.atan2(direction.x,direction.z)
 }
 root.updateWorldMatrix(true,true)
 const bounds=new Box3().setFromObject(root,true),size=bounds.getSize(new Vector3())
 if(!Number.isFinite(size.z)||size.z<=0||size.x<=0)throw new Error('Invalid fleet model bounds')
 root.scale.setScalar(Math.min(4.3/size.z,2.13/size.x));root.updateWorldMatrix(true,true)
 bounds.setFromObject(root,true);const centre=bounds.getCenter(new Vector3())
 root.position.set(-centre.x,-bounds.min.y,-centre.z);root.updateWorldMatrix(true,true)
 const groups=new Map()
 function add(material,geometry){
  if(!groups.has(material)){
   const cheap=material.clone();if('transmission'in cheap)cheap.transmission=0
   cheap.transparent=false;cheap.opacity=1
   groups.set(material,{name:material.name,material:cheap,geometries:[]})
  }
  groups.get(material).geometries.push(geometry)
 }
 root.traverse(object=>{
  if(!object.isMesh)return
  const geometry=geometryFor(object)
  if(!Array.isArray(object.material)){add(object.material,geometry);return}
  for(const group of geometry.groups){
   const part=geometry.clone()
   for(const[name,attribute]of Object.entries(geometry.attributes))part.setAttribute(name,new Float32BufferAttribute(attribute.array.slice(group.start*attribute.itemSize,(group.start+group.count)*attribute.itemSize),attribute.itemSize))
   part.clearGroups();add(object.material[group.materialIndex],part)
  }
  geometry.dispose()
 })
 const result=[...groups.values()].map((group,index)=>{
  const geometry=mergeGeometries(group.geometries);group.geometries.forEach(g=>g.dispose())
  if(!geometry)throw new Error('Invalid fleet primitives')
  return{key:`${group.name}-${index}`,name:group.name,geometry,material:group.material}
 })
 if(!result.length)throw new Error('Empty fleet model')
 assets.set(scene,result);return result
}
