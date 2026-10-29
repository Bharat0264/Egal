import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, MathUtils } from 'three'
import { frame, random } from './layout'
import { getJourneyProgress } from '../Road'
import { windowTexture } from './textures'
import Instances from './Instances'
import {performanceRuntime} from '../performance/runtime'

export default function City({ low, state }) {
  const group = useRef(), walls = useRef(), trim = useRef()
  const haze=useMemo(()=>({color:{value:new Color('#795f9e')},amount:{value:0}}),[])
  const purpleFog=useMemo(()=>shader=>{
    shader.uniforms.cityHaze=haze.color;shader.uniforms.cityDusk=haze.amount
    shader.fragmentShader=shader.fragmentShader.replace('#include <fog_pars_fragment>','#include <fog_pars_fragment>\nuniform vec3 cityHaze;uniform float cityDusk;').replace('#include <fog_fragment>',`#ifdef USE_FOG
      float cityFog=1.-exp(-fogDensity*fogDensity*vFogDepth*vFogDepth);
      gl_FragColor.rgb=mix(gl_FragColor.rgb,mix(fogColor,cityHaze,cityDusk),cityFog);
      #endif`)
  },[haze])
  const windows = useMemo(windowTexture, [])
  const origin = useMemo(() => frame(getJourneyProgress(1), -60).p.add(frame(getJourneyProgress(1)).tangent.multiplyScalar(90)), [])
  const data = useMemo(() => {
    const r = random(184), buildings = [], spokes = [], pods = [], piers = [], cables = []
    for (let i = 0; i < (low ? 30 : 60); i++) {
      const h = 7 + Math.pow(r(), 1.5) * 24
      buildings.push({ position: [(i % 10 - 4.5) * 8, h / 2 - 1, -Math.floor(i / 10) * 10], scale: [4 + r() * 3, h, 4 + r() * 3] })
    }
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI * 2 / 12
      spokes.push({ position: [43 + Math.sin(a) * 3.5, 9 + Math.cos(a) * 3.5, 8], rotation: [0, 0, -a], scale: [0.09, 7, 0.09] })
      pods.push({ position: [43 + Math.sin(a) * 7, 9 + Math.cos(a) * 7, 8], scale: [1.1, 1.4, 1] })
    }
    for (let x = -8; x <= 80; x += 16) piers.push({ position: [x, -1.5, 21], scale: [1.3, 8, 3] })
    for (let x = 0; x <= 70; x += 5) {
      const height = 2 + 6 * Math.pow((x % 35 - 17.5) / 17.5, 2)
      cables.push({ position: [x, 3 + height / 2, 20], scale: [0.06, height, 0.06] })
    }
    return { buildings, spokes, pods, piers, cables }
  }, [low])
  useFrame(() => {
    const visibility = performanceRuntime.warming?1:MathUtils.smoothstep(state.progress, 0.73, 0.82)
    group.current.visible = visibility > 0.001
    haze.amount.value=MathUtils.smoothstep(state.progress,.88,1)
    walls.current.opacity = visibility * 0.88; walls.current.emissiveIntensity = state.night * 1.8
    trim.current.emissiveIntensity = state.night * 1.7
  })
  return <group ref={group} userData={{curveWindow:true}} name="distant-city" position={origin.toArray()}>
    <Instances name="city-buildings" items={data.buildings}><boxGeometry /><meshStandardMaterial ref={walls} onBeforeCompile={purpleFog} map={windows} emissiveMap={windows} emissive="#ffbc68" emissiveIntensity={0} color="#b7c0bd" transparent roughness={0.75} /></Instances>
    <mesh position={[43, 9, 8]}><torusGeometry args={[7, 0.14, 5, 40]} /><meshStandardMaterial ref={trim} color="#d9c2ac" emissive="#ffae57" /></mesh>
    <Instances name="ferris-spokes" items={data.spokes}><boxGeometry /><meshStandardMaterial color="#c9b8a5" /></Instances>
    <Instances name="ferris-gondolas" items={data.pods}><boxGeometry /><meshStandardMaterial color="#dba27a" /></Instances>
    <Instances name="bridge-piers" items={data.piers}><boxGeometry /><meshStandardMaterial color="#86908e" /></Instances>
    <mesh position={[36, 2.7, 21]} scale={[94, 0.55, 4]}><boxGeometry /><meshStandardMaterial color="#b5aaa0" /></mesh>
    <Instances name="bridge-cables" items={data.cables}><boxGeometry /><meshStandardMaterial color="#d8c8af" /></Instances>
  </group>
}
