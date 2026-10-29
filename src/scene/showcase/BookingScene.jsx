import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import DeferredText from './DeferredText'
import { MathUtils } from 'three'
import { cars, formatPrice } from '../../data/cars'
import { bookingCopy } from '../../data/booking'
import { useSelection } from '../../state/SelectionContext'
import { tollFrame } from './journeyLayout'
import Instances from '../world/Instances'
import useSceneVisibility from './useSceneVisibility'
import { sunGlowTexture } from '../world/textures'
import { boothScreenTexture, pricingCarTexture, signalTexture } from './step6Textures'
const FONT=`${import.meta.env.BASE_URL}fonts/DejaVuSans.ttf`
function Words({children,...props}) {return <Suspense fallback={null}><DeferredText stage="booking" font={FONT} color="#fff2dc" anchorX="center" fontSize={.35} {...props}>{children}</DeferredText></Suspense>}
function Barrier({side}) {
 const arm=useRef(),{journeyMotion}=useSelection()
 const stripes=useMemo(()=>Array.from({length:8},(_,i)=>({position:[side*(.16+i*.38),0,0],scale:[.18,.105,.085],rotation:[0,0,-side*.22]})),[side])
 const lamps=useMemo(()=>[.35,1.5,2.7].map(x=>({position:[side*x,.005,-.057],scale:.026})),[side])
 useFrame(()=>{arm.current.rotation.z=side*MathUtils.smoothstep(journeyMotion.current.gateDrive,0,.3)*Math.PI/2})
 return <group position={[-side*3.12,.98,-.75]}>
  <mesh position={[0,-.49,0]}><boxGeometry args={[.3,.98,.34]}/><meshStandardMaterial color="#343c40"/></mesh>
  <group ref={arm} name={`toll-barrier-${side}`}>
   <mesh position={[side*1.55,0,0]}><boxGeometry args={[3.1,.1,.07]}/><meshStandardMaterial color="#fff5e8"/></mesh>
   <Instances name={`barrier-stripes-${side}`} items={stripes}><boxGeometry/><meshStandardMaterial color="#d13d39"/></Instances>
   <Instances name={`barrier-red-lights-${side}`} items={lamps}><sphereGeometry args={[1,6,4]}/><meshStandardMaterial color="#ff624b" emissive="#f52b19" emissiveIntensity={2}/></Instances>
  </group>
 </group>
}
function GateSignal({green=false}) {
 const symbol=useRef(),halo=useRef(),disc=useRef(),{journeyMotion}=useSelection()
 const texture=useMemo(()=>signalTexture(green),[green]),glow=useMemo(sunGlowTexture,[])
 useFrame((_,delta)=>{
  const weight=MathUtils.smoothstep(journeyMotion.current.gateDrive,.1,.26),on=green?weight:1-weight
  symbol.current.emissiveIntensity=MathUtils.damp(symbol.current.emissiveIntensity,.05+on*1.6,8,delta)
  symbol.current.color.setScalar(.08+on*.92)
  disc.current.emissiveIntensity=.015+on*.16
  halo.current.opacity=.025+on*.42
 })
 const color=green?'#56ff99':'#ff4b3c'
 return <group name={`toll-signal-${green?'green':'red'}`} position={[green?-2.15:2.15,4.28,-.38]} rotation={[0,Math.PI,0]}>
  <mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.43,.43,.12,32]} /><meshStandardMaterial color="#141e26"/></mesh>
  <mesh position={[0,0,.075]}><circleGeometry args={[.41,32]}/><meshStandardMaterial ref={disc} color="#0c171e" emissive={color}/></mesh>
  <mesh position={[0,0,.09]}><planeGeometry args={[.64,.64]}/><meshStandardMaterial ref={symbol} map={texture} emissiveMap={texture} emissive={color} transparent depthWrite={false} color="white"/></mesh>
  <sprite position={[0,0,.03]} scale={[1.65,1.65,1]}><spriteMaterial ref={halo} map={glow} color={color} transparent depthWrite={false} toneMapped={false}/></sprite>
 </group>
}
function PricingIcon({type,...props}) {
 const map=useMemo(()=>pricingCarTexture(type),[type])
 return <mesh {...props}><planeGeometry args={[.77,.33]}/><meshBasicMaterial map={map} transparent depthWrite={false} toneMapped={false}/></mesh>
}
function PricingBoard() {
 return <group name="pricing-board" position={[7.2,2.45,-1]} rotation={[0,Math.PI,0]}>
  <RoundedBox args={[3.55,4.7,.17]} radius={.1}><meshStandardMaterial color="#17232e" roughness={.65}/></RoundedBox>
  <Words position={[-1.43,1.92,.11]} fontSize={.36} anchorX="left">{bookingCopy.pricing}</Words><Words position={[-1.43,1.5,.11]} fontSize={.2} anchorX="left">{bookingCopy.starting}</Words>
  {cars.map((car,i)=><group key={car.id} position={[0,.95-i*.67,0]}>
   <PricingIcon type={car.id} position={[-1.12,-.08,.11]}/>
   <Words position={[-.59,.08,.12]} fontSize={.18} anchorX="left">{car.category}</Words>
   <Words position={[1.44,-.2,.12]} fontSize={.23} anchorX="right" color="#ffcb8c">{formatPrice(car.price)} /day</Words>
  </group>)}
 </group>
}
export default function BookingScene() {
 const root=useRef(),screen=useMemo(boothScreenTexture,[]),glow=useMemo(sunGlowTexture,[])
 const booths=useMemo(()=>[-1,1].map(side=>({position:[side*4.15,1.25,0],scale:[1.6,2.5,2.5]})),[])
 const windows=useMemo(()=>[-1,1].map(side=>({position:[side*4.15,1.7,-1.26],scale:[1.23,.88,.04]})),[])
 const screens=useMemo(()=>[-1,1].map(side=>({position:[side*4.15,1.12,-1.3],rotation:[0,Math.PI,0],scale:[.65,.34,1]})),[])
 const roofs=useMemo(()=>[-1,1].map(side=>({position:[side*4.15,2.58,-.12],scale:[1.95,.13,2.9]})),[])
 const lamps=useMemo(()=>[-1,1].map(side=>({position:[side*4.15,2.47,-1.45],scale:[.36,.065,.18]})),[])
 useSceneVisibility(root,'booking')
 return <group ref={root} visible={false} name="toll-gate" position={tollFrame.p.toArray()} rotation={[0,tollFrame.yaw,0]}>
  <Instances name="toll-booths" items={booths}><boxGeometry/><meshStandardMaterial color="#5c6262" roughness={.65}/></Instances>
  <Instances name="booth-glass" items={windows}><boxGeometry/><meshStandardMaterial color="#19333b" metalness={.5} roughness={.16}/></Instances>
  <Instances name="booth-screens" items={screens}><planeGeometry/><meshStandardMaterial map={screen} emissiveMap={screen} emissive="#70f5ee" emissiveIntensity={1.2} toneMapped={false}/></Instances>
  <Instances name="booth-roof-overhangs" items={roofs}><boxGeometry/><meshStandardMaterial color="#252e34" metalness={.3}/></Instances>
  <Instances name="booth-warm-lamps" items={lamps}><boxGeometry/><meshStandardMaterial color="#ffe1b0" emissive="#ffbc6b" emissiveIntensity={2.3}/></Instances>
  <Instances name="gantry-posts" items={[-1,1].map(side=>({position:[side*5.08,2.55,.1],scale:[.15,5.1,.18]}))}><boxGeometry/><meshStandardMaterial color="#262e35" metalness={.6} roughness={.32}/></Instances>
  <mesh name="gantry-beam" position={[0,5.08,.1]}><boxGeometry args={[10.3,.5,.4]}/><meshStandardMaterial color="#262e35" metalness={.6} roughness={.32}/></mesh>
  <mesh position={[0,4.815,-.12]}><boxGeometry args={[10.08,.025,.035]}/><meshBasicMaterial color="#ff9c42" toneMapped={false}/></mesh>
  <RoundedBox args={[2.85,1.12,.16]} radius={.08} position={[0,4.28,-.33]}><meshBasicMaterial color="#f88b3a" toneMapped={false}/></RoundedBox>
  <RoundedBox args={[2.76,1.03,.04]} radius={.06} position={[0,4.28,-.43]}><meshStandardMaterial color="#102044" roughness={.5}/></RoundedBox>
  <group position={[0,4.28,-.47]} rotation={[0,Math.PI,0]}><Words fontSize={.63} maxWidth={2.35} anchorY="middle" color="white"><meshStandardMaterial color="white" emissive="#fff0da" emissiveIntensity={.45} toneMapped={false}/>{bookingCopy.gateSign}</Words></group>
  <sprite position={[0,4.28,-.25]} scale={[4.2,2.1,1]}><spriteMaterial map={glow} color="#ffb071" opacity={.12} transparent depthWrite={false} toneMapped={false}/></sprite>
  <GateSignal/><GateSignal green/><Barrier side={1}/><Barrier side={-1}/><PricingBoard/>
 </group>
}
