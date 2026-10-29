import { Box3, Group, Vector3 } from 'three'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { batchCar } from './batchCar.js'

export const CAR_NODES = [
  'Body', 'Cabin_Glass', 'Wheel_FL', 'Wheel_FR', 'Wheel_RL', 'Wheel_RR',
  'SteerPivot_FL', 'SteerPivot_FR', 'Headlight_L', 'Headlight_R',
  'Taillight_L', 'Taillight_R', 'Grille', 'Bumper_Front', 'Bumper_Rear',
  'Mirror_L', 'Mirror_R', 'Trim',
]

// The approved Blender export guarantees Y-up/+Z-forward and explicit part names.
// Clone the cached scene and materials; geometry/texture data stays read-only.
export function prepareCarModel(scene, { length = 4.3 } = {}) {
  const root = new Group()
  root.name = 'egal-normalized-car'
  const model = clone(scene)
  root.add(model)
  const nodes = Object.fromEntries(CAR_NODES.map((name) => [name, model.getObjectByName(name)]))
  const missing = CAR_NODES.filter((name) => !nodes[name])
  if (missing.length) throw new Error(`Car model is missing required nodes: ${missing.join(', ')}`)

  root.updateWorldMatrix(true, true)
  const bounds = new Box3().setFromObject(model, true)
  const original = bounds.getSize(new Vector3())
  if (!Number.isFinite(original.z) || original.z <= 0) throw new Error('Car model has no usable length.')
  model.scale.multiplyScalar(length / original.z)
  root.updateWorldMatrix(true, true)
  bounds.setFromObject(model, true)
  const center = bounds.getCenter(new Vector3())
  model.position.add(new Vector3(-center.x, -bounds.min.y, -center.z))
  root.updateWorldMatrix(true, true)
  const size = new Box3().setFromObject(root, true).getSize(new Vector3())

  const materials = new Map()
  model.traverse((object) => {
    if (!object.isMesh) return
    object.castShadow = false
    object.receiveShadow = false
    const isolate = (source) => {
      if (!materials.has(source)) {
        const material = source.clone()
        // Thin tinted glass/lamp covers on mobile use alpha + environment
        // reflections instead of a full second rendering of the whole world.
        if(material.transmission>0){
          material.transmission=0;material.transparent=true;material.depthWrite=false
          material.opacity=material.name==='Glass'?.88:material.name==='LampLens_Red'?.15:.1
        }
        if (material.name === 'Glass') material.depthWrite = false
        material.transparent=true;material.forceSinglePass=true
        materials.set(source, material)
      }
      return materials.get(source)
    }
    object.material = Array.isArray(object.material) ? object.material.map(isolate) : isolate(object.material)
  })
  const ownedMaterials = [...materials.values()]
  const paintMaterials = ownedMaterials.filter((material) => material.name === 'BodyPaint')
  const paintColors = paintMaterials.map((material) => material.color.clone())
  const tailMaterials = ownedMaterials.filter((material) => material.name === 'Taillight' && material.emissive)
  const tailIntensities = tailMaterials.map((material) => material.emissiveIntensity)
  const wheels = ['FL', 'FR', 'RL', 'RR'].map((corner) => {
    const spin = nodes[`Wheel_${corner}`]
    const wheelSize = new Box3().setFromObject(spin, true).getSize(new Vector3())
    return {
      spin,
      steer: nodes[`SteerPivot_${corner}`] ?? null,
      radius: Math.max(wheelSize.y, wheelSize.z) / 2,
      spinAxis: new Vector3(1, 0, 0),
      steerAxis: new Vector3(0, 1, 0),
      spinRotation: spin.quaternion.clone(),
      steerRotation: nodes[`SteerPivot_${corner}`]?.quaternion.clone() ?? null,
    }
  })
  const tailPositions = ['Taillight_L', 'Taillight_R'].map((name) => {
    const point = new Box3().setFromObject(nodes[name], true).getCenter(new Vector3())
    return root.worldToLocal(point)
  })
  const batches = batchCar(model, [...wheels.map(wheel => wheel.spin),nodes.Body])
  for(const name of CAR_NODES)nodes[name]=batches.replacements.get(nodes[name])??nodes[name]
  for(const wheel of wheels){wheel.spin=batches.replacements.get(wheel.spin)??wheel.spin;wheel.steer=batches.replacements.get(wheel.steer)??wheel.steer}
  return {
    root, size, nodes, paintMaterials, paintColors, tailMaterials, tailIntensities, wheels, tailPositions,
    dispose() { batches.dispose(); ownedMaterials.forEach((material) => material.dispose()) },
  }
}
