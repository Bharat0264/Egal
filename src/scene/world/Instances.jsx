import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils, Matrix4, Object3D, Vector3 } from 'three'

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
export default function Instances({ name, items, children, headlineSafe = false, ...props }) {
  const ref = useRef()
  const clearance = useRef([]), scratch = useRef(new Vector3()), transform = useRef(new Matrix4())
  const projection = useRef(new Matrix4()), previousProjection = useRef(new Matrix4()), elapsed = useRef(1)
  const corners = useRef([])
  useLayoutEffect(() => {
    const dummy = new Object3D()
    items.forEach((item, i) => {
      dummy.position.fromArray(item.position)
      dummy.rotation.set(...(item.rotation || [0, 0, 0]))
      const scale = item.scale ?? 1; Array.isArray(scale) ? dummy.scale.fromArray(scale) : dummy.scale.setScalar(scale)
      dummy.updateMatrix(); ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere()
    ref.current.geometry.computeBoundingBox()
    const {min,max}=ref.current.geometry.boundingBox
    corners.current=[]
    for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z])corners.current.push(new Vector3(x,y,z))
    clearance.current = items.map((item, index) => {
      ref.current.getMatrixAt(index, dummy.matrix)
      const bounds=item.headlineBounds,worldCorners=[]
      if(bounds)for(const x of[bounds[0],bounds[3]])for(const y of[bounds[1],bounds[4]])for(const z of[bounds[2],bounds[5]])worldCorners.push(new Vector3(x,y,z))
      return { matrix: dummy.matrix.clone(), visible: 1, blocked: false,worldCorners:bounds?worldCorners:null }
    })
  }, [items])
  useFrame(({ camera }, delta) => {
    if (!headlineSafe) return
    elapsed.current += delta
    projection.current.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse)
    // Clearance sampling is capped at 30Hz and stops when the camera settles.
    const project=elapsed.current>=1/30&&!projection.current.equals(previousProjection.current)
    if(project){previousProjection.current.copy(projection.current);elapsed.current=0}
    let changed = false
    clearance.current.forEach((item, i) => {
      if(project){
        if(item.worldCorners)transform.current.copy(projection.current)
        else transform.current.multiplyMatrices(projection.current,item.matrix)
        let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity
        for(const corner of item.worldCorners??corners.current){
          scratch.current.copy(corner).applyMatrix4(transform.current)
          if(scratch.current.z>1||scratch.current.z< -1)continue
          const sx=(scratch.current.x+1)/2,sy=(1-scratch.current.y)/2
          left=Math.min(left,sx);right=Math.max(right,sx);top=Math.min(top,sy);bottom=Math.max(bottom,sy)
        }
        item.blocked=right>-.03&&left<.48&&bottom>.12&&top<.63
      }
      const next = MathUtils.damp(item.visible, item.blocked ? 0 : 1, 12, Math.min(delta, 0.1))
      if (Math.abs(next - item.visible) < 0.00001) return
      item.visible = next; changed = true
      transform.current.copy(item.matrix).scale(scratch.current.setScalar(next < 0.001 ? 0 : next))
      ref.current.setMatrixAt(i, transform.current)
    })
    if (changed) ref.current.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} name={name} args={[null, null, items.length]} {...props}>{children}</instancedMesh>
}
