import { useEffect, useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Frustum, MathUtils, Matrix4, Object3D, Sphere, Vector3, Color } from 'three'
import {nearestCurveU} from '../performance/WorldWindow'
import {performanceRuntime} from '../performance/runtime'
import {roadCurve} from '../Road'
const roadLength=roadCurve.getLength()

// Full bounds catch a tall pole even when its base projects below the copy.
export function overlapsHeadline(geometry, matrix, camera, scratch = new Vector3()) {
  if (!geometry.boundingBox) geometry.computeBoundingBox()
  const { min, max } = geometry.boundingBox
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity
  for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
    scratch.set(x, y, z).applyMatrix4(matrix).applyMatrix4(camera.matrixWorldInverse)
    if (scratch.z >= -0.1) continue
    scratch.applyMatrix4(camera.projectionMatrix)
    const sx = (scratch.x + 1) / 2, sy = (1 - scratch.y) / 2
    left = Math.min(left, sx); right = Math.max(right, sx); top = Math.min(top, sy); bottom = Math.max(bottom, sy)
  }
  return right > -0.03 && left < 0.48 && bottom > 0.12 && top < 0.63
}

// Every repeated prop shares one geometry/material and one draw call per batch.
export default function Instances({name,items,children,headlineSafe=false,near=0,far=Infinity,...props}){
 useEffect(()=>()=>props.geometry?.dispose(),[props.geometry])
 const ref=useRef(),state=useRef({records:[],corners:[],revision:-1,warming:true}),point=useRef(new Vector3()),matrix=useRef(new Matrix4()),projection=useRef(new Matrix4()),lastProjection=useRef(new Matrix4()),frustum=useRef(new Frustum()),sphere=useRef(new Sphere())
 useLayoutEffect(()=>{
  const mesh=ref.current,dummy=new Object3D(),tint=new Color();mesh.updateWorldMatrix(true,false);mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere()
  const {min,max}=mesh.geometry.boundingBox,corners=[]
  for(const x of[min.x,max.x])for(const y of[min.y,max.y])for(const z of[min.z,max.z])corners.push(new Vector3(x,y,z))
  let parent=mesh.parent,windowed=false;while(parent){if(parent.userData.curveWindow)windowed=true;parent=parent.parent}
  state.current.windowed=windowed;state.current.corners=corners
  state.current.records=items.map((item,i)=>{
   dummy.position.fromArray(item.position);dummy.rotation.set(...(item.rotation||[0,0,0]));const scale=item.scale??1;Array.isArray(scale)?dummy.scale.fromArray(scale):dummy.scale.setScalar(scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(item.color)mesh.setColorAt(i,tint.set(item.color))
   const center=mesh.geometry.boundingSphere.center.clone().applyMatrix4(dummy.matrix).applyMatrix4(mesh.matrixWorld),radius=mesh.geometry.boundingSphere.radius*Math.max(dummy.scale.x,dummy.scale.y,dummy.scale.z)*mesh.matrixWorld.getMaxScaleOnAxis(),bounds=item.headlineBounds,worldCorners=[]
   if(bounds)for(const x of[bounds[0],bounds[3]])for(const y of[bounds[1],bounds[4]])for(const z of[bounds[2],bounds[5]])worldCorners.push(new Vector3(x,y,z))
   return{color:item.color?new Color(item.color):null,matrix:dummy.matrix.clone(),visible:1,blocked:false,inWindow:true,slot:i,center,radius,u:windowed?nearestCurveU(center):0,worldCorners:bounds?worldCorners:null}
  });state.current.revision=-1;mesh.count=items.length;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()
 },[items])
 useFrame(({camera},delta)=>{
  const mesh=ref.current,data=state.current,warming=performanceRuntime.warming
  if(!headlineSafe&&!data.windowed&&near===0&&far===Infinity)return
  if(!warming){let parent=mesh.parent;while(parent){if(!parent.visible)return;parent=parent.parent}}
  projection.current.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse)
  let moved=false
  for(let i=0;i<16;i++)if(Math.abs(projection.current.elements[i]-lastProjection.current.elements[i])>.0001){moved=true;break}
  const changedWindow=data.revision!==performanceRuntime.windowRevision||data.warming!==warming||moved
  if(!changedWindow&&!data.animating)return
  if(changedWindow){lastProjection.current.copy(projection.current);frustum.current.setFromProjectionMatrix(projection.current);data.revision=performanceRuntime.windowRevision;data.warming=warming}
  let changed=false,count=0;data.animating=false
  for(const item of data.records){
   if(changedWindow){sphere.current.center.copy(item.center);sphere.current.radius=item.radius+1;const distance=camera.position.distanceToSquared(item.center);item.inWindow=warming||((!data.windowed||Math.abs(item.u-performanceRuntime.windowU)*roadLength<180)&&frustum.current.intersectsSphere(sphere.current)&&distance>=near*near&&distance<far*far)}
   if(!item.inWindow){item.slot=-1;continue}
   if(headlineSafe&&moved&&!warming){
    if(item.worldCorners)matrix.current.copy(projection.current);else matrix.current.multiplyMatrices(projection.current,item.matrix)
    let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity
    for(const corner of item.worldCorners??data.corners){point.current.copy(corner).applyMatrix4(matrix.current);if(point.current.z>1||point.current.z< -1)continue;const x=(point.current.x+1)/2,y=(1-point.current.y)/2;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
    item.blocked=right>-.03&&left<.48&&bottom>.12&&top<.63
   }
   const next=warming?1:MathUtils.damp(item.visible,item.blocked?0:1,12,Math.min(delta,.1)),fading=Math.abs(next-item.visible)>.00001;item.visible=next;if(fading)data.animating=true
   if(next<.001){item.slot=-1;continue}
   if(fading||item.slot!==count||changedWindow){matrix.current.copy(item.matrix).scale(point.current.setScalar(next));mesh.setMatrixAt(count,matrix.current);if(item.color)mesh.setColorAt(count,item.color);changed=true}
   item.slot=count++
  }
  mesh.count=count;mesh.visible=count>0;if(changed){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true}
 })
 return <instancedMesh ref={ref} name={name} args={[null,null,items.length]} {...props}>{children}</instancedMesh>
}
