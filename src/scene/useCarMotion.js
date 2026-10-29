import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import { MathUtils, Vector3 } from 'three'
import { getJourneyProgress, roadCurve } from './Road'
import { journeyPose } from './showcase/journeyLayout'
import { useSelectionActions } from '../state/SelectionContext'


export default function useCarMotion(anchor, suspension) {
  const scroll = useScroll()
  const {journeyMotion}=useSelectionActions()
  const motion = useRef({ distance: 0, speed: 0, steer: 0, brake: 0, phase: 0 })
  const scratch = useMemo(() => ({ point: new Vector3(), tangent: new Vector3(), before: new Vector3(), after: new Vector3(), movement: new Vector3() }), [])
  const previous = useRef({ speed: 0, point: new Vector3(),started:false })

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1)
    const u = getJourneyProgress(scroll.offset)
    journeyPose(scroll.offset,journeyMotion.current.gateDrive,scratch.point,scratch.tangent)
    anchor.current.position.copy(scratch.point)
    anchor.current.rotation.y = Math.atan2(scratch.tangent.x, scratch.tangent.z)

    const movement = previous.current.started ? scratch.movement.subVectors(scratch.point,previous.current.point) : scratch.movement.setScalar(0)
    const travelled = movement.length() * (movement.dot(scratch.tangent)<0?-1:1)
    const speed = Math.min(Math.abs(travelled)/Math.max(delta,1/120)*.08,1)
    const span = 0.002
    roadCurve.getTangentAt(Math.max(u - span, 0), scratch.before)
    roadCurve.getTangentAt(Math.min(u + span, 1), scratch.after)
    const turn = Math.atan2(
      scratch.before.z * scratch.after.x - scratch.before.x * scratch.after.z,
      scratch.before.dot(scratch.after),
    )
    const curvature = turn / (2 * span * roadCurve.getLength())
    const steering = MathUtils.clamp(Math.atan(2.6 * curvature), -0.16, 0.16)
    const braking = previous.current.speed > 0.025 && speed < previous.current.speed - 0.001 ? 1 : 0

    motion.current.distance += travelled
    motion.current.speed = MathUtils.damp(motion.current.speed, speed, 7, dt)
    motion.current.steer = MathUtils.damp(motion.current.steer, steering, 8, dt)
    motion.current.brake = MathUtils.damp(motion.current.brake, braking, braking ? 12 : 3, dt)
    motion.current.phase += Math.abs(travelled) * 5
    suspension.current.rotation.z = -motion.current.steer * motion.current.speed * 0.12
    suspension.current.position.y = (Math.sin(motion.current.phase) + 1) * motion.current.speed * 0.003
    previous.current.speed = speed
    previous.current.started=true
    previous.current.point.copy(scratch.point)
  })
  return motion
}
