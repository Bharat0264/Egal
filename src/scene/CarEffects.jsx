import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color } from 'three'
import { ContactShadows } from '@react-three/drei'

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export function SoftCarShadow({ width, length }) {
  return (
    <ContactShadows key={`${width}-${length}`} name="car-contact-shadow" position={[0, 0.026, 0]}
      width={width * 1.45} height={length * 1.28} scale={1} opacity={0.35}
      far={2.5} blur={1.8} resolution={256} frames={2} color="#182526" />
  )
}

export function TailGlow({ positions, motion }) {
  const uniforms = useMemo(() => ({
    glowColor: { value: new Color('#FF421F') },
    strength: { value: 0.18 },
  }), [])
  useFrame(() => { uniforms.strength.value = 0.18 + motion.current.brake * 0.18 })
  return positions.map((position, index) => (
    <mesh key={index} name={`tail-glow-${index}`} position={[position.x, position.y, position.z - 0.025]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[0.36, 0.19]} />
      <shaderMaterial
        uniforms={uniforms} vertexShader={vertexShader} transparent depthWrite={false}
        toneMapped={false} blending={AdditiveBlending}
        fragmentShader={`
          uniform vec3 glowColor;
          uniform float strength;
          varying vec2 vUv;
          void main() {
            float alpha = pow(1.0 - smoothstep(0.0, 0.5, length(vUv - 0.5)), 2.0);
            gl_FragColor = vec4(glowColor, alpha * strength);
            #include <colorspace_fragment>
          }
        `}
      />
    </mesh>
  ))
}
