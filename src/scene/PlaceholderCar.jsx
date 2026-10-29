import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { brand } from '../data/brand'
import { CAR_WIDTH } from './Road'

const wheelWidth = 0.16
const wheelPositions = [-1, 1].flatMap((side) =>
  [-0.62, 0.62].map((axle) => [side * (CAR_WIDTH - wheelWidth) / 2, 0.23, axle]),
)

export default function PlaceholderCar({ color = brand.colors.cream, motion, onReady }) {
  const wheels = useRef([]), lights = useRef([])
  useEffect(() => { onReady?.() }, [onReady])
  useFrame(() => {
    if (!motion) return
    wheels.current.forEach((wheel, index) => {
      wheel.rotation.x = motion.current.distance / 0.23
      wheel.rotation.y = wheelPositions[index][2] > 0 ? motion.current.steer : 0
    })
    lights.current.forEach((light) => { light.emissiveIntensity = 0.8 + motion.current.brake * 0.7 })
  })
  return (
    <group name="placeholder-car">
      <mesh name="body" position={[0, 0.45, 0]}>
        <boxGeometry args={[1.04, 0.38, 1.95]} />
        <meshStandardMaterial color={color} roughness={0.27} metalness={0.25} />
      </mesh>
      <mesh name="cabin" position={[0, 0.79, -0.08]}>
        <boxGeometry args={[0.85, 0.32, 1.08]} />
        <meshStandardMaterial color={brand.colors.navy} roughness={0.2} metalness={0.2} />
      </mesh>
      <mesh name="roof" position={[0, 0.96, -0.08]}>
        <boxGeometry args={[0.88, 0.035, 1.12]} />
        <meshStandardMaterial color={color} roughness={0.27} metalness={0.25} />
      </mesh>
      <mesh name="lower-trim" position={[0, 0.31, 0]}>
        <boxGeometry args={[1.055, 0.07, 1.96]} />
        <meshStandardMaterial color={brand.colors.orange} roughness={0.5} />
      </mesh>
      {wheelPositions.map((position, index) => (
        <group key={index} ref={(node) => { wheels.current[index] = node }} position={position}>
          <mesh name={`wheel-${index}`} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.23, 0.23, wheelWidth, 20]} />
            <meshStandardMaterial color="#202735" roughness={0.85} />
          </mesh>
          <mesh position={[Math.sign(position[0]) * 0.082, 0, 0]}>
            <boxGeometry args={[0.01, 0.24, 0.035]} />
            <meshStandardMaterial color={brand.colors.cream} roughness={0.5} />
          </mesh>
        </group>
      ))}
      {[-0.36, 0.36].map((x, index) => (
        <mesh key={x} name={`tail-light-${index}`} position={[x, 0.51, -0.984]}>
          <boxGeometry args={[0.22, 0.075, 0.035]} />
          <meshStandardMaterial ref={(material) => { lights.current[index] = material }} color={brand.colors.orange} emissive={brand.colors.orange} emissiveIntensity={0.8} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}
