import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import { Vector3 } from 'three'
import { roadCurve } from './Road'
export default function CameraRig({ onScrollReady }) {
  const scroll = useScroll()
  const vectors = useMemo(() => ({ behind: new Vector3(), look: new Vector3(), target: new Vector3() }), [])
  // Keep the native scroll fraction current before ScrollControls applies damping.
  useFrame(() => {
    const distance = scroll.el.scrollHeight - scroll.el.clientHeight
    scroll.scroll.current = distance > 0 ? scroll.el.scrollTop / distance : 0
  }, -1)
  useFrame(({ camera }, delta) => {
    const point = roadCurve.getPointAt(scroll.offset), tangent = roadCurve.getTangentAt(scroll.offset)
    vectors.behind.copy(point).addScaledVector(tangent, -8); vectors.behind.y = 5
    vectors.target.copy(point).addScaledVector(tangent, 5); vectors.target.y = 0.5
    const alpha = 1 - Math.exp(-5 * delta)
    camera.position.lerp(vectors.behind, alpha); vectors.look.lerp(vectors.target, alpha); camera.lookAt(vectors.look)
    onScrollReady(scroll)
  })
  return null
}
