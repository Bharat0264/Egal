import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import { roadCurve } from './Road'
export default function Car() {
  const ref = useRef(), scroll = useScroll()
  useFrame(() => {
    const point = roadCurve.getPointAt(scroll.offset), tangent = roadCurve.getTangentAt(scroll.offset)
    ref.current.position.set(point.x, 0.48, point.z)
    ref.current.rotation.y = Math.atan2(tangent.x, tangent.z)
  })
  return <group ref={ref}><mesh><boxGeometry args={[1.5, 0.7, 2.7]} /><meshStandardMaterial color="#FFF7EC" /></mesh><mesh position={[0, 0.55, -0.15]}><boxGeometry args={[1.2, 0.55, 1.35]} /><meshStandardMaterial color="#0F1B4C" /></mesh><mesh position={[0, 0, -1.36]}><boxGeometry args={[1.2, 0.12, 0.03]} /><meshBasicMaterial color="#F97316" /></mesh></group>
}
