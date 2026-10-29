import { useMemo } from 'react'
import { BufferGeometry, Float32BufferAttribute, CatmullRomCurve3, MathUtils, Vector3 } from 'three'
import { brand } from '../data/brand'
import { asphaltTextures, lanePaintTexture } from './world/textures'

// Includes the wheels: the asphalt is exactly 2.5 times the car's full width.
export const CAR_WIDTH = 2.025
export const ROAD_WIDTH = CAR_WIDTH * 2.5
export const roadCurve = new CatmullRomCurve3([
  new Vector3(0, 0, 60), new Vector3(0, 0, 30), new Vector3(0, 0, 0),
  new Vector3(-7, 0, -30), new Vector3(7, 0, -62), new Vector3(-7, 0, -95),
  new Vector3(0, 0, -128), new Vector3(12, 0, -166),
  new Vector3(12, 0, -230), new Vector3(12, 0, -290),
])
roadCurve.arcLengthDivisions = 2700
const lengths = roadCurve.getLengths()
const roadLength = roadCurve.getLength()
const journeyStart = lengths[600] / roadLength
const journeyEnd = lengths[1800] / roadLength

// Scroll still spans 0..1; only its position on the extended road changes.
export function getJourneyProgress(offset) {
  return MathUtils.lerp(journeyStart, journeyEnd, MathUtils.clamp(offset, 0, 1))
}

export function createRibbon(width, ranges, lateralOffset = 0, elevation = 0, curve = roadCurve) {
  const positions = [], indices = [], uvs = []
  const curveLength = curve.getLength()
  const point = new Vector3(), tangent = new Vector3(), normal = new Vector3()
  for (const { start, end, segments } of ranges) {
    const firstVertex = positions.length / 3
    for (let i = 0; i <= segments; i++) {
      const u = MathUtils.lerp(start, end, i / segments)
      curve.getPointAt(u, point)
      curve.getTangentAt(u, tangent)
      // Planar curve: tangent cross world-up gives the lateral normal.
      normal.set(-tangent.z, 0, tangent.x).normalize()
      for (const side of [1, -1]) {
        const distance = lateralOffset + side * width / 2
        positions.push(point.x + normal.x * distance, point.y + elevation, point.z + normal.z * distance)
        uvs.push(distance / 4, u * curveLength / 4)
      }
      if (i < segments) {
        const n = firstVertex + i * 2
        indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3)
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

export default function Road() {
  const textures = useMemo(asphaltTextures, []),paint=useMemo(lanePaintTexture,[])
  const geometry = useMemo(() => {
    const continuous = [{ start: 0, end: 1, segments: 300 }]
    const dashes = []
    for (let distance = 0; distance < roadLength; distance += 3.2) {
      dashes.push({ start: distance / roadLength, end: Math.min(distance + 1.4, roadLength) / roadLength, segments: 4 })
    }
    const edgeOffset = ROAD_WIDTH / 2 - 0.09
    return {
      road: createRibbon(ROAD_WIDTH, continuous),
      centre: createRibbon(0.055, dashes, 0, 0.02),
      left: createRibbon(0.045, continuous, edgeOffset, 0.02),
      right: createRibbon(0.045, continuous, -edgeOffset, 0.02),
    }
  }, [])
  return (
    <group name="road">
      <mesh name="asphalt" geometry={geometry.road} receiveShadow>
        <meshStandardMaterial {...textures} roughness={0.72} metalness={0.08} />
      </mesh>
      <mesh name="centre-line" geometry={geometry.centre}>
        <meshBasicMaterial color="#F8C66C" map={paint} alphaTest={.35}/>
      </mesh>
      {[geometry.left, geometry.right].map((edge, index) => (
        <mesh name={`edge-line-${index}`} key={index} geometry={edge}>
          <meshBasicMaterial color={brand.colors.cream} map={paint} alphaTest={.35}/>
        </mesh>
      ))}
    </group>
  )
}
