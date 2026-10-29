import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, CanvasTexture, Color } from 'three'

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

let blob
export function SoftCarShadow({ width, length }) {
  const texture=useMemo(()=>{if(blob)return blob;const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,10,64,64,64);g.addColorStop(0,'#ffffffff');g.addColorStop(.55,'#ffffffb0');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return blob=new CanvasTexture(c)},[])
  return (
    <mesh name="car-contact-shadow" position={[0,.026,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[width*1.4,length*1.25]}/><meshBasicMaterial map={texture} color="#182526" opacity={.35} transparent depthWrite={false}/></mesh>
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
