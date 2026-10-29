import { lazy,Suspense,useEffect,useMemo,useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer, ScrollControls,PerformanceMonitor } from '@react-three/drei'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import CameraRig from './CameraRig'
import Road from './Road'
import './world/heightFog'
import Car from './Car'
import Terrain from './world/Terrain'
import Sea from './world/Sea'
import CoastalProps from './world/CoastalProps'
import RoadLife from './world/RoadLife'
import Atmosphere, { createWorldState } from './world/Atmosphere'
import City from './world/City'
import LandmarkMarkers from './world/LandmarkMarkers'
import useLowPower from './world/useLowPower'
import SceneCoordinator from './showcase/SceneCoordinator'
import { useSelectionActions } from '../state/SelectionContext'
import RenderBudget from './world/RenderBudget'
import WorldBoundary from './WorldFallback'
import useReducedMotion from './world/useReducedMotion'
import { qualityProfile } from './world/renderQuality'
import CoastalBackdrop from './world/CoastalBackdrop'
import SceneSlots from './performance/SceneSlots'
import Warmup from './performance/Warmup'
import {performanceRuntime} from './performance/runtime'
import WorldWindow from './performance/WorldWindow'
const PerfDebug=lazy(()=>import('./performance/PerfDebug'))

function StudioEnvironment() {
  return <Environment frames={1} resolution={128} environmentIntensity={0.7}>
    <color attach="background" args={['#B5C4CB']} />
    <Lightformer form="rect" position={[0, 5, 0]} scale={[8, 5]} intensity={2.2} color="#FFF7EC" />
    <Lightformer form="rect" position={[-5, 2, 1]} scale={[3, 6]} intensity={3} color="#FFDEB3" />
    <Lightformer form="rect" position={[5, 1, -2]} scale={[3, 5]} intensity={1.5} color="#DFEAFF" />
    <Lightformer form="circle" position={[2, 3, -6]} scale={5} intensity={2.5} color="#FFD198" />
    <Lightformer form="rect" position={[-2,4,-2]} rotation={[-.4,0,.3]} scale={[10,.6]} intensity={1.3} color="#fff1dc"/>
  </Environment>
}

export default function World({ onScrollReady, onCarReady, started, transition,onProgress }) {
  // Capture loss even while model suspense prevents the scene's effects mounting.
  useEffect(()=>{const lost=event=>{if(event.target instanceof HTMLCanvasElement){event.preventDefault();location.replace('/simple?reason=webgl')}};window.addEventListener('webglcontextlost',lost,true);return()=>window.removeEventListener('webglcontextlost',lost,true)},[])
  const hardwareLow = useLowPower(),[degraded,setDegraded]=useState(false)
  const hardLow=navigator.hardwareConcurrency<=4||(navigator.deviceMemory&&navigator.deviceMemory<=4)
  const low=hardwareLow||degraded
  const reducedMotion=useReducedMotion()
  const profile=useMemo(()=>qualityProfile({coarse:matchMedia('(pointer: coarse)').matches||innerWidth<768,cores:navigator.hardwareConcurrency,memory:navigator.deviceMemory,dpr:devicePixelRatio}),[])
  const state = useMemo(createWorldState, [])
  const { setServiceId } = useSelectionActions()
  return <WorldBoundary onReady={onCarReady} onScrollReady={onScrollReady}><Canvas fallback={<p>3D is unavailable. <a href="/simple">Continue in Simple view</a></p>} onPointerMissed={() => setServiceId(null)} dpr={profile.initial} gl={{ toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }} camera={{ position: [0, 1.9, 7.5], fov: 45, near: 0.1, far: 600 }}>
    <color attach="background" args={['#f8c1a9']} />
    <fogExp2 attach="fog" args={['#f7c6b2', .0038]} />
    <StudioEnvironment />
    <Warmup onProgress={onProgress} onReady={onCarReady}/>
    {new URLSearchParams(location.search).get('debug')==='perf'&&<Suspense fallback={null}><PerfDebug/></Suspense>}
    <PerformanceMonitor bounds={()=>[45,58]} iterations={6} ms={500} threshold={.99} onIncline={()=>{if(performanceRuntime.ready&&performanceRuntime.active&&performance.now()>(performanceRuntime.raiseAfter??0))performanceRuntime.dprTarget=1.75}} onDecline={()=>{if(performanceRuntime.ready&&performanceRuntime.active){performanceRuntime.dprTarget=1;setDegraded(true)}}}/>
    <RenderBudget low={low} performanceLow={Boolean(degraded||hardLow)} />
    <ScrollControls pages={6} damping={0.2}>
      <Atmosphere state={state} />
      <WorldWindow/>
      <Terrain />
      <CoastalBackdrop low={low}/>
      <Sea low={low} reducedMotion={reducedMotion} state={state} />
      <CoastalProps low={low} reducedMotion={reducedMotion} state={state} />
      <City low={low} state={state} /><RoadLife low={low} state={state}/>
      <Road />
      <Car low={low} />
      <SceneSlots low={low} started={started}/><SceneCoordinator />
      <CameraRig onScrollReady={onScrollReady} started={started} transition={transition} reducedMotion={reducedMotion} />
      {new URLSearchParams(location.search).get('debug')==='' && <LandmarkMarkers />}
    </ScrollControls>
  </Canvas></WorldBoundary>
}
