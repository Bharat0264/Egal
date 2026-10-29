import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, BufferGeometry, Float32BufferAttribute } from 'three'
import { createRibbon } from '../Road'
import { frame } from './layout'
import Instances from './Instances'

export default function Sea({ low, reducedMotion, state }) {
  const seaMaterial = useRef(), foamMaterial = useRef()
  const uniforms = useMemo(() => ({ time: { value: 0 }, detail: { value: low ? 0 : 1 }, water: { value: new Color('#278b99') }, horizon: { value: new Color() }, sunDirection: { value: state.sunDirection }, fogNear: { value: 35 }, fogFar: { value: 200 } }), [state, low])
  useFrame(({ clock, scene }) => {
    for (const material of [seaMaterial.current, foamMaterial.current]) {
      const current = material.uniforms
      current.time.value = low || reducedMotion ? 0 : clock.elapsedTime
      current.detail.value = low ? 0 : 1
      current.water.value.copy(state.water); current.horizon.value.copy(state.horizon)
      current.sunDirection.value.copy(state.sunDirection)
      current.fogNear.value = scene.fog.near; current.fogFar.value = scene.fog.far
    }
  })
  const shore = useMemo(() => createRibbon(2.1, [{ start: 0, end: 1, segments: 400 }], 10.1, -2.12), [])
  return <group name="sea-and-shore">
    <mesh position={[220, -2.25, -130]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[520, 1100, low ? 1 : 80, low ? 1 : 100]} />
      <shaderMaterial ref={seaMaterial} uniforms={uniforms} toneMapped={false} vertexShader={`
        uniform float time; varying vec3 vWorld; varying float vDepth;
        void main(){ vec3 p=position; p.z += sin(p.x*.13+time*.6)*.07+cos(p.y*.19+time*.4)*.045;
          vec4 world=modelMatrix*vec4(p,1.); vWorld=world.xyz; vec4 mv=viewMatrix*world; vDepth=-mv.z; gl_Position=projectionMatrix*mv; }
      `} fragmentShader={`
        uniform float time; uniform float detail; uniform vec3 water; uniform vec3 horizon; uniform vec3 sunDirection; uniform float fogNear; uniform float fogFar;
        varying vec3 vWorld; varying float vDepth;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
        void main(){
          vec2 uv=vWorld.xz*.65+vec2(time*.06,-time*.08);
          float a=.5,b=.5; if(detail>.5){a=noise(uv);b=noise(uv*1.7+8.);}
          vec3 n=normalize(vec3((a-.5)*.17,1.,(b-.5)*.2)); vec3 view=normalize(cameraPosition-vWorld);
          float glint=pow(max(dot(reflect(-normalize(sunDirection),n),view),0.),75.);
          vec2 sunAxis=normalize(sunDirection.xz), viewAxis=normalize(vWorld.xz-cameraPosition.xz);
          float streak=pow(max(dot(sunAxis,viewAxis),0.),65.)*(.82+.18*sin(uv.x*.7+uv.y*.9))*exp(-abs(view.y-sunDirection.y)*3.5);
          float ripple=(a+b-1.)*.06; float fresnel=pow(1.-max(dot(n,view),0.),3.);
          vec3 c=mix(water+vec3(ripple),horizon,fresnel*.22)+vec3(1.,.65,.24)*(glint*.55+streak*.34);
          c=mix(c,horizon,smoothstep(fogNear,fogFar,vDepth)); gl_FragColor=vec4(c,1.);
          #include <colorspace_fragment>
        }
      `} />
    </mesh>
    <mesh geometry={shore}><shaderMaterial ref={foamMaterial} transparent depthWrite={false} uniforms={uniforms} vertexShader={`varying vec2 vUv; varying float depth; void main(){vUv=uv; vec4 p=modelViewMatrix*vec4(position,1.);depth=-p.z;gl_Position=projectionMatrix*p;}`} fragmentShader={`
      uniform float time; uniform float fogFar; varying vec2 vUv; varying float depth;
      void main(){float ribbon=sin(vUv.x*17.+sin(vUv.y*8.+time)*.6);float grain=sin(vUv.y*49.+vUv.x*33.-time*.5);float alpha=smoothstep(.1,.7,ribbon+grain*.3)*.5*(1.-smoothstep(30.,fogFar,depth));gl_FragColor=vec4(.89,.96,.9,alpha);}
    `} /></mesh>
    <Sailboats />
  </group>
}

function Sailboats() {
  const data = useMemo(() => [0.12, 0.34, 0.55, 0.73].map((u, i) => {
    const f = frame(u, 30 + i % 2 * 26, -2.05)
    return { position: f.p.toArray(), rotation: [0, i * 1.2, 0], scale: 0.7 + i * 0.15 }
  }), [])
  const sail = useMemo(() => {
    const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute([0, 0.3, -1, 0, 3.6, 0, 0, 0.3, 0.95], 3)); g.computeVertexNormals(); return g
  }, [])
  return <group>
    <Instances name="boat-hulls" items={data.map(s => ({ ...s, scale: [s.scale * 0.48, s.scale * 0.22, s.scale * 1.5] }))}><sphereGeometry args={[1, 6, 3]} /><meshStandardMaterial color="#e3d2ad" roughness={0.7} /></Instances>
    <Instances name="boat-sails" items={data} geometry={sail}><meshStandardMaterial color="#fff4db" side={2} /></Instances>
    <Instances name="boat-masts" items={data.map(s => ({ ...s, position: [s.position[0], s.position[1] + 1.7 * s.scale, s.position[2]], scale: [0.025, 3.5 * s.scale, 0.025] }))}><cylinderGeometry args={[1, 1, 1, 5]} /><meshStandardMaterial color="#6a6250" /></Instances>
  </group>
}
