import {Float32BufferAttribute,Matrix4,Mesh} from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'

export function mergeStatics(root){
 root.updateWorldMatrix(true,true)
 const inverse=root.matrixWorld.clone().invert(),groups=new Map(),created=[]
 root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.isInstancedMesh||'textRenderInfo' in mesh||Array.isArray(mesh.material)||mesh.material.transparent||mesh.material.isDerivedMaterial)return
  let parent=mesh;while(parent&&parent!==root){if(/^(fleet-car-|parked-model-|toll-barrier-|toll-signal-|destination-map-pin|service-sign-)/.test(parent.name))return;parent=parent.parent}
  const m=mesh.material,key=[m.type,m.color?.getHex(),m.emissive?.getHex(),m.emissiveIntensity,m.roughness,m.metalness,m.side,m.toneMapped,m.map?.uuid,m.normalMap?.uuid,m.emissiveMap?.uuid,m.vertexColors].join('|')
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh)
 })
 for(const meshes of groups.values()){
  if(meshes.length<2)continue
  const parts=meshes.map(mesh=>{let g=mesh.geometry.clone();if(g.index){const old=g;g=g.toNonIndexed();old.dispose()}for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);if(!g.attributes.normal)g.computeVertexNormals();if(!g.attributes.uv)g.setAttribute('uv',new Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));return g.applyMatrix4(new Matrix4().multiplyMatrices(inverse,mesh.matrixWorld))})
  const geometry=mergeGeometries(parts);for(const part of parts)part.dispose();if(!geometry)continue
  const merged=new Mesh(geometry,meshes[0].material);merged.name='merged-static-'+created.length;root.add(merged);for(const mesh of meshes)mesh.visible=false;created.push({merged,meshes})
 }
 root.userData.staticBatches=created.length
 return()=>{for(const{merged,meshes}of created){root.remove(merged);merged.geometry.dispose();for(const mesh of meshes)mesh.visible=true}}
}
