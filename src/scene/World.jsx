import { useEffect,useMemo,useRef,useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer, ScrollControls,PerformanceMonitor,useProgress } from '@react-three/drei'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import CameraRig from './CameraRig'
import Road from './Road'
import Car from './Car'
import Terrain from './world/Terrain'
import Sea from './world/Sea'
import CoastalProps from './world/CoastalProps'
import Atmosphere, { createWorldState } from './world/Atmosphere'
import City from './world/City'
import LandmarkMarkers from './world/LandmarkMarkers'
import useLowPower from './world/useLowPower'
import FleetScene from './showcase/FleetScene'
import ServicesScene from './showcase/ServicesScene'
import SceneCoordinator from './showcase/SceneCoordinator'
import BookingScene from './showcase/BookingScene'
import ContactScene from './showcase/ContactScene'
import { useSelectionActions } from '../state/SelectionContext'
import RenderBudget from './world/RenderBudget'
import WorldBoundary from './WorldFallback'
import useReducedMotion from './world/useReducedMotion'
import { qualityProfile } from './world/renderQuality'
import CoastalBackdrop from './world/CoastalBackdrop'

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

function Progress({onProgress}){const{progress}=useProgress();useEffect(()=>onProgress?.(progress),[progress,onProgress]);return null}
export default function World({ onScrollReady, onCarReady, started, transition,onProgress }) {
  // Capture loss even while model suspense prevents the scene's effects mounting.
  useEffect(()=>{const lost=event=>{if(event.target instanceof HTMLCanvasElement){event.preventDefault();location.replace('/simple?reason=webgl')}};window.addEventListener('webglcontextlost',lost,true);return()=>window.removeEventListener('webglcontextlost',lost,true)},[])
  const hardwareLow = useLowPower(),[degraded,setDegraded]=useState(false),mounted=useRef(performance.now())
  const hardLow=navigator.hardwareConcurrency<=4||(navigator.deviceMemory&&navigator.deviceMemory<=4)
  const low=hardwareLow||degraded
  const reducedMotion=useReducedMotion()
  const profile=useMemo(()=>qualityProfile({coarse:matchMedia('(pointer: coarse)').matches||innerWidth<768,cores:navigator.hardwareConcurrency,memory:navigator.deviceMemory,dpr:devicePixelRatio}),[])
  const state = useMemo(createWorldState, [])
  const { setServiceId } = useSelectionActions()
  return <WorldBoundary onReady={onCarReady} onScrollReady={onScrollReady}><Canvas fallback={<p>3D is unavailable. <a href="/simple">Continue in Simple view</a></p>} onPointerMissed={() => setServiceId(null)} dpr={profile.max} gl={{ toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }} camera={{ position: [0, 1.9, 7.5], fov: 45, near: 0.1, far: 600 }}>
    <color attach="background" args={['#f8c1a9']} />
    <fog attach="fog" args={['#ffb36b', 75, 200]} />
    <StudioEnvironment />
    <Progress onProgress={onProgress}/>
    <PerformanceMonitor bounds={()=>[45,58]} iterations={8} ms={500} threshold={.75} onDecline={()=>{if(performance.now()-mounted.current>8000)setDegraded(true)}}/>
    <RenderBudget low={low} performanceLow={Boolean(degraded||hardLow)} />
    <ScrollControls pages={6} damping={0.2}>
      <Atmosphere state={state} />
      <Terrain />
      <CoastalBackdrop low={low}/>
      <Sea low={low} reducedMotion={reducedMotion} state={state} />
      <CoastalProps low={low} reducedMotion={reducedMotion} state={state} />
      <City low={low} state={state} />
      <Road />
      <Car onReady={onCarReady} low={low} />
      <FleetScene low={low} started={started} /><ServicesScene low={low} /><BookingScene /><ContactScene low={low} /><SceneCoordinator />
      <CameraRig onScrollReady={onScrollReady} started={started} transition={transition} reducedMotion={reducedMotion} />
      {import.meta.env.DEV && <LandmarkMarkers />}
    </ScrollControls>
  </Canvas></WorldBoundary>
}
