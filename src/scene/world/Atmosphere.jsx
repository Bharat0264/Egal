import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import { AdditiveBlending, BackSide, Color, MathUtils, Vector3 } from 'three'
import { frame } from './layout'
import { getJourneyProgress } from '../Road'
import { destinationFrame } from '../showcase/journeyLayout'
import { worldPoint } from '../showcase/layout'
import { cloudTexture, sunGlowTexture } from './textures'
import Instances from './Instances'

export function createWorldState() {
  return { horizon: new Color('#ffb36b'), mid: new Color('#ffd0b2'), top: new Color('#9cc9e5'), water: new Color('#338b98'), sunDirection: new Vector3(0.7, 0.15, -1).normalize(), night: 0, progress: 0 }
}
const palettes = [
  ['#f7c396', '#b9cedb', '#327e88', '#ffe7b1'],
  ['#f5dfb2', '#85b9d5', '#258e9b', '#fff1c2'],
  ['#ef916f', '#635d94', '#376778', '#ffb465'],
].map(p => p.map(c => new Color(c)))

export default function Atmosphere({ state }) {
  const scroll = useScroll(), sky = useRef(), skyMaterial = useRef(), sun = useRef(), disc = useRef(), key = useRef(), fill = useRef(), target = useRef(), rim = useRef(), rimTarget = useRef(), halo = useRef(), outerHalo = useRef()
  const uniforms = useMemo(() => ({ horizon: { value: state.horizon }, mid: { value: state.mid }, top: { value: state.top }, sunrise: { value: new Color('#efac7e') }, progress: { value: 0 } }), [state])
  const sunset = useMemo(()=>({horizon:new Color('#f06a32'),mid:new Color('#b64780'),top:new Color('#49306c'),sun:new Color('#ffd09a'),direction:new Vector3(),right:new Vector3()}),[])
  const scratch=useMemo(()=>({peach:new Color('#ffd0b2'),color:new Color(),rim:worldPoint(destinationFrame,[-8,9,12]),rimTarget:worldPoint(destinationFrame,[8,1,-1])}),[])
  const clouds = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ position: [Math.sin(i * 3.7) * 105, 22 + i % 3 * 7, 40 - i * 41], scale: [38 + i % 3 * 8, 14, 1] })), [])
  const cloud = useMemo(cloudTexture, [])
  const sunGlow = useMemo(sunGlowTexture, [])
  useFrame(({ camera, gl, scene }, delta) => {
    const p = MathUtils.clamp(scroll.offset, 0, 1), blend = p < 0.5 ? p * 2 : (p - 0.5) * 2, a = palettes[p < 0.5 ? 0 : 1], b = palettes[p < 0.5 ? 1 : 2]
    const alpha = 1 - Math.exp(-delta * 5), dusk=MathUtils.smoothstep(p,.88,1)
    state.progress = p; state.night = MathUtils.smoothstep(p, 0.8, 1)
    skyMaterial.current.uniforms.progress.value = p
    state.mid.copy(state.horizon).lerp(scratch.peach, (1 - MathUtils.smoothstep(p, 0, 0.5)) * 0.75)
    state.horizon.lerp(scratch.color.copy(a[0]).lerp(b[0], blend), alpha); state.top.lerp(scratch.color.copy(a[1]).lerp(b[1], blend), alpha); state.water.lerp(scratch.color.copy(a[2]).lerp(b[2], blend), alpha)
    state.horizon.lerp(sunset.horizon,dusk);state.mid.lerp(sunset.mid,dusk);state.top.lerp(sunset.top,dusk)
    const f = frame(getJourneyProgress(p)), elevation = 0.13 + Math.sin(p * Math.PI) * 0.65
    state.sunDirection.copy(f.tangent).multiplyScalar(1).addScaledVector(f.right, 0.4 - p * 0.8); state.sunDirection.y = elevation; state.sunDirection.normalize()
    camera.getWorldDirection(sunset.direction);sunset.direction.y=.035
    sunset.right.set(1,0,0).applyQuaternion(camera.quaternion);sunset.right.y=0;sunset.right.normalize()
    sunset.direction.addScaledVector(sunset.right,(camera.aspect<1?.06:.18)*camera.aspect).normalize()
    state.sunDirection.lerp(sunset.direction,MathUtils.smoothstep(p,.88,.94)).normalize()
    sun.current.position.copy(camera.position).addScaledVector(state.sunDirection, 160); sun.current.quaternion.copy(camera.quaternion)
    disc.current.color.copy(a[3]).lerp(b[3], blend).lerp(sunset.sun,dusk)
    outerHalo.current.scale.set(64+dusk*24,64+dusk*24,1);outerHalo.current.material.opacity=.1+dusk*.15
    halo.current.scale.set(36+dusk*16,36+dusk*16,1);halo.current.material.opacity=.7+dusk*.12
    rim.current.position.copy(scratch.rim);rimTarget.current.position.copy(scratch.rimTarget);rimTarget.current.updateMatrixWorld();rim.current.target=rimTarget.current;rim.current.intensity=dusk*1.1
    sky.current.position.copy(camera.position)
    key.current.position.copy(f.p).addScaledVector(state.sunDirection, 40); target.current.position.copy(f.p); target.current.updateMatrixWorld(); key.current.target = target.current
    key.current.color.copy(a[3]).lerp(b[3], blend); key.current.intensity = 2.1 + Math.sin(p * Math.PI) * 0.7 - state.night * 0.7
    fill.current.intensity = 1.1 - state.night * 0.5; fill.current.color.copy(state.top)
    scene.fog.color.copy(state.horizon); scene.fog.near = 75; scene.fog.far = 200 - state.night * 30
    scene.environmentIntensity = 0.65 + Math.sin(p * Math.PI) * 0.25 - state.night * 0.18
    gl.toneMappingExposure = 0.9 + Math.sin(p * Math.PI) * 0.08 - state.night * 0.07
  })
  return <>
    <mesh name="gradient-sky" ref={sky} renderOrder={-2}><sphereGeometry args={[450, 32, 16]} /><shaderMaterial ref={skyMaterial} side={BackSide} depthWrite={false} toneMapped={false} uniforms={uniforms}
      vertexShader={`varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
      fragmentShader={`uniform vec3 horizon;uniform vec3 mid;uniform vec3 top;uniform vec3 sunrise;uniform float progress;varying vec3 direction;void main(){float h=max(normalize(direction).y,0.);float dawn=1.-smoothstep(0.,.5,progress);vec3 base=mix(horizon,sunrise,dawn*smoothstep(0.,.04,h));vec3 c=mix(base,mid,smoothstep(.04,.17,h));float dusk=smoothstep(.88,1.,progress);c=mix(c,top,smoothstep(mix(.17,.015,dusk),mix(.48,.09,dusk),h));gl_FragColor=vec4(c,1.);#include <colorspace_fragment>}`.replace(';#include', ';\n#include')} />
    </mesh>
    <group ref={sun} name="sun-disc">
      <mesh><circleGeometry args={[4, 40]} /><meshBasicMaterial ref={disc} color="#ffdb99" fog={false} toneMapped={false} /></mesh>
      <sprite ref={halo} position={[0,0,-.1]} scale={[36,36,1]}><spriteMaterial map={sunGlow} transparent opacity={.7} depthWrite={false} toneMapped={false} fog={false} /></sprite>
      <sprite ref={outerHalo} position={[0,0,-.15]} scale={[64,64,1]}><spriteMaterial map={sunGlow} color="#ffc38a" opacity={.1} transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} fog={false}/></sprite>
    </group>
    <Instances name="clouds" items={clouds}><planeGeometry /><meshBasicMaterial map={cloud} transparent opacity={0.45} depthWrite={false} side={2} /></Instances>
    <object3D ref={target} /><directionalLight ref={key} /><object3D ref={rimTarget}/><directionalLight name="sunset-rim-light" ref={rim} color="#ff954f" intensity={0}/><hemisphereLight ref={fill} args={['#adcde0', '#8b956d', 1.1]} />
  </>
}
