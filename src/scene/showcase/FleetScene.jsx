import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame,useThree } from '@react-three/fiber'
import { RoundedBox, useGLTF, useScroll } from '@react-three/drei'
import { Color, MathUtils } from 'three'
import { cars, fleetCopy, formatPrice, getHeroCarModel } from '../../data/cars'
import { brand } from '../../data/brand'
import { fleetModels } from '../../data/fleetModels'
import useReducedMotion from '../world/useReducedMotion'
import { useSelection } from '../../state/SelectionContext'
import { fleetFrame } from './layout'
import { textOpacity } from './sceneWindows'
import useSceneVisibility from './useSceneVisibility'
import { parkedAsset } from './parkedAsset'
import { preloadFleetInIdle, useFleetAsset } from './fleetAssets'
import Instances from '../world/Instances'
import { crownGeometry } from '../world/CoastalProps'
import { PARKED_YAW, ROW_X, TABLE_X, TABLE_Z, TABLE_RADIUS, BAY_WIDTH, BAY_LENGTH, rowZ, bayDividers } from './fleetLayout'
import {priceAtlas} from './priceAtlas'

export class FleetBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

const ignoreRoof = () => {}
function PaintedParts({ source, color, onRoof, type, url, status }) {
  const parts = useMemo(() => source.map(part => ({ ...part, material: part.material.clone() })), [source])
  useEffect(() => {
    const roof = Math.max(...source.map(part => { part.geometry.computeBoundingBox(); return part.geometry.boundingBox.max.y }))
    onRoof(roof)
  }, [source, onRoof])
  const target = useMemo(() => new Color(), [])
  useEffect(()=>{target.set(color)},[target,color])
  useEffect(() => () => parts.forEach(p => p.material.dispose()), [parts])
  useFrame((_, delta) => {
    const alpha=1-Math.exp(-delta*8)
    for(const part of parts)if(part.name==='BodyPaint')part.material.color.lerp(target,alpha)
  })
  return <group name={`parked-model-${type}`} userData={{modelUrl:url,modelStatus:status}}>{parts.map((part,index) => <mesh key={part.key || `${part.name}-${index}`} name={`${type}-${part.name}`} geometry={part.geometry} material={part.material} dispose={null} />)}</group>
}
function HeroParkedModel(props) {
  const url=getHeroCarModel()
  return url ? <HeroAsset {...props} url={url}/> : <SimpleParkedCar color={props.color}/>
}
function HeroAsset({url,...props}) {
  const {scene}=useGLTF(url,false,true)
  const source=useMemo(()=>parkedAsset(scene),[scene])
  return <PaintedParts {...props} source={source} url={url} status="hero-fallback"/>
}
function FleetVariant(props) {
  const asset=useFleetAsset(props.type)
  return asset?.parts ? <PaintedParts {...props} source={asset.parts} url={asset.url} status="fleet"/> : <HeroParkedModel {...props}/>
}
export function ParkedModel({type,color,onRoof=ignoreRoof,variant=false}) {
  const props={type,color,onRoof}
  // The office continues to reuse the hero and never starts a fleet request.
  return variant ? <FleetVariant {...props}/> : <HeroParkedModel {...props}/>
}

function SimpleParkedCar({ color }) {
  return <group><mesh position={[0,.55,0]}><boxGeometry args={[1.8,.65,4.3]} /><meshStandardMaterial color={color} /></mesh><mesh position={[0,1.05,-.15]}><boxGeometry args={[1.5,.6,2.1]} /><meshStandardMaterial color="#142a37" /></mesh></group>
}

function FleetCar({ car, index }) {
  const compact=useThree(s=>s.size.width<768)
  const reducedMotion=useReducedMotion()
  const root = useRef(), spin = useRef(), tag = useRef(), drag = useRef({ x: 0, time: 0, moved: false })
  const tags=useMemo(priceAtlas,[])
  const [roof, setRoof] = useState(1.6)
  const scroll = useScroll()
  const { colors, selectCar, interaction, selectionRef } = useSelection()
  const asset=useFleetAsset(car.id)
  const displayScale=asset?.parts ? car.scale : fleetModels[car.id].fallbackScale
  const z = rowZ[index]
  useFrame((_, delta) => {
    const dt = Math.min(delta, .1), motion = interaction.current
    const selected=index===selectionRef.current.index
    root.current.position.x = MathUtils.damp(root.current.position.x, selected ? TABLE_X : ROW_X, 4, dt)
    root.current.position.z = MathUtils.damp(root.current.position.z, selected ? TABLE_Z : z, 4, dt)
    root.current.position.y = MathUtils.damp(root.current.position.y, selected ? .09 : .015, 4, dt)
    const scale = MathUtils.damp(root.current.scale.x, displayScale * (selected ? 1.18 : 1), 4, dt); root.current.scale.setScalar(scale)
    if (selected) {
      if (!motion.dragging) { motion.yaw += motion.velocity * dt; motion.velocity = MathUtils.damp(motion.velocity, 0, 3, dt); if (!reducedMotion && performance.now() - motion.lastInput > 1800) motion.yaw += dt * .12 }
      spin.current.rotation.y = -Math.PI / 2 + .45 + motion.yaw
    } else spin.current.rotation.y = MathUtils.damp(spin.current.rotation.y, PARKED_YAW, 4, dt)
    const fade = textOpacity(scroll.offset,'fleet'), active = fade>0
    if(tag.current){tag.current.visible=active&&!selected;tag.current.material.opacity=fade*.8}
  })
  const begin = event => {
    if(index!==selectionRef.current.index||textOpacity(scroll.offset,'fleet')<=0)return
    event.stopPropagation(); event.target.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, time: performance.now(), moved: false }
    interaction.current.dragging = true; interaction.current.velocity = 0; interaction.current.lastInput = performance.now()
  }
  const move = event => {
    if (index!==selectionRef.current.index||!interaction.current.dragging) return
    const now = performance.now(), dx = event.clientX - drag.current.x
    interaction.current.yaw += dx * .012; interaction.current.velocity = MathUtils.clamp(dx * .012 / Math.max((now - drag.current.time) / 1000, .016), -2, 2)
    interaction.current.lastInput = now; drag.current = { x: event.clientX, time: now, moved: true }
  }
  const end = () => { interaction.current.dragging = false; interaction.current.lastInput = performance.now() }
  return <group ref={root} name={`fleet-car-${car.id}`} position={[ROW_X, .08, z]} scale={displayScale} onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onClick={e => { if(textOpacity(scroll.offset,'fleet')<=0)return; e.stopPropagation(); if (index!==selectionRef.current.index) selectCar(index) }}>
    <group ref={spin} rotation={[0,PARKED_YAW,0]}>
      <FleetBoundary fallback={<SimpleParkedCar color={colors[index]} />}><Suspense fallback={<SimpleParkedCar color={colors[index]} />}><ParkedModel variant type={car.id} color={colors[index]} onRoof={setRoof} /></Suspense></FleetBoundary>
    </group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.015,0]}><planeGeometry args={[2.7,4.8]} /><meshBasicMaterial color="#29343c" transparent opacity={.12} depthWrite={false} /></mesh>
    <sprite ref={tag} name={`fleet-price-${car.id}`} position={[0,roof+.4/displayScale,0]} scale={[(compact?.052:.071)/displayScale,.043/displayScale,1]} onClick={e=>{if(textOpacity(scroll.offset,'fleet')<=0)return;e.stopPropagation();selectCar(index)}}><spriteMaterial map={tags[index]} sizeAttenuation={false} transparent depthWrite={false} toneMapped={false}/></sprite>
  </group>
}

export default function FleetScene({ low, started }) {
  const root=useRef(),scroll=useScroll(),queued=useRef(false)
  useFrame(()=>{
    if(started && !queued.current && scroll.offset>.10){queued.current=true;preloadFleetInIdle()}
  })
  useSceneVisibility(root,'fleet')
  const lines = useMemo(() => bayDividers.map(z => ({ position: [ROW_X,.032,z], scale: [6.3,.025,.055] })), [])
  const wall = useMemo(() => Array.from({ length: 37 }, (_, i) => ({ position: [-7.8,.16,-14.4 + i * .8], scale: [.28,.32,.76] })), [])
  const palms = useMemo(() => Array.from({ length: low ? 2 : 4 }, (_, i) => ({ position: [8.8,2.4,-12 + i * (low ? 24 : 8)], scale: [.13,4.8,.13] })), [low])
  const crown = useMemo(crownGeometry,[])
  return <group ref={root} visible={false} name="fleet-bay" position={fleetFrame.p.toArray()} rotation={[0,fleetFrame.yaw,0]}>
    <RoundedBox name="fleet-paving" args={[BAY_WIDTH,.14,BAY_LENGTH]} radius={.035} position={[0,-.07,0]}><meshStandardMaterial color="#a4a396" roughness={.95} /></RoundedBox>
    <Instances name="parking-bay-lines" items={lines}><boxGeometry /><meshBasicMaterial color={brand.colors.cream} /></Instances>
    <Instances name="fleet-stone-wall" items={wall}><boxGeometry /><meshStandardMaterial color="#b6ad95" roughness={1} /></Instances>
    <Instances name="fleet-palm-trunks" items={palms}><cylinderGeometry args={[.7,1,1,6]} /><meshStandardMaterial color="#8b6a4f" /></Instances>
    <Instances name="fleet-palm-crowns" geometry={crown} items={palms.map(p => ({ position: [p.position[0],4.8,p.position[2]], scale: 4.8 }))}><meshStandardMaterial color="#52754b" side={2} /></Instances>
    <mesh name="fleet-turntable" position={[TABLE_X,.025,TABLE_Z]}><cylinderGeometry args={[TABLE_RADIUS,TABLE_RADIUS+.1,.12,64]} /><meshStandardMaterial color="#bdb7a7" metalness={.25} roughness={.45} /></mesh>
    <mesh name="fleet-glow-ring" rotation={[Math.PI/2,0,0]} position={[TABLE_X,.095,TABLE_Z]}><torusGeometry args={[TABLE_RADIUS-.06,.055,6,80]} /><meshBasicMaterial color={brand.colors.orange} toneMapped={false} /></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[TABLE_X,.088,TABLE_Z]}><ringGeometry args={[TABLE_RADIUS-.15,TABLE_RADIUS+.25,64]} /><meshBasicMaterial color="#ffaf57" transparent opacity={.25} depthWrite={false} toneMapped={false} /></mesh>
    {cars.map((car,index) => <FleetCar key={car.id} car={car} index={index} />)}
  </group>
}
