import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { Vector3 } from 'three'
import { brand } from '../../data/brand'
import { contactCopy } from '../../data/booking'
import { destinationFrame, PARKING_POSITION } from './journeyLayout'
import { FleetBoundary, ParkedModel } from './FleetScene'
import { getHeroCarModel } from '../../data/cars'
import Instances from '../world/Instances'
import { crownGeometry } from '../world/CoastalProps'
import { sunGlowTexture } from '../world/textures'
import { timberTexture } from './step6Textures'
import useSceneVisibility from './useSceneVisibility'
import ContactLighting from './ContactLighting'
import DeferredText from './DeferredText'
const FONT=`${import.meta.env.BASE_URL}fonts/DejaVuSans.ttf`
function Pin() {
 const root=useRef(),glow=useMemo(sunGlowTexture,[]),position=useMemo(()=>new Vector3(...PARKING_POSITION).add(new Vector3(0,2.55,0)),[])
 useFrame(({camera,clock,scene})=>{
  const car=scene.getObjectByName('car')
  if(car){car.getWorldPosition(root.current.position);root.current.parent.worldToLocal(root.current.position);root.current.position.y+=2.55}
  else root.current.position.copy(position)
  root.current.position.y+=Math.sin(clock.elapsedTime*1.8)*.06
  // The pin faces the camera after accounting for the destination group's rotation.
  root.current.quaternion.copy(root.current.parent.getWorldQuaternion(root.current.quaternion).invert()).multiply(camera.quaternion)
 })
 return <group ref={root} name="destination-map-pin">
  <mesh><torusGeometry args={[.34,.12,6,24]}/><meshBasicMaterial color="#ff9c2c" toneMapped={false}/></mesh>
  <mesh position={[0,-.45,0]} rotation={[0,0,Math.PI]}><coneGeometry args={[.35,.65,3]}/><meshBasicMaterial color="#ff9c2c" toneMapped={false}/></mesh>
  <sprite scale={[2.8,2.8,1]} position={[0,-.15,-.08]}><spriteMaterial map={glow} transparent depthWrite={false} opacity={.5} color="#ffac3a" toneMapped={false}/></sprite>
 </group>
}
export default function ContactScene({low}) {
 const root=useRef(),crown=useMemo(crownGeometry,[]),timber=useMemo(timberTexture,[])
 const shell=useMemo(()=>[
  {position:[10.5,-.08,2],scale:[14,.14,18]},
  {position:[10.5,6.9,7],scale:[12.5,.3,8.5]},
  {position:[10.5,3.35,7],scale:[12.5,.2,8.5]},
  {position:[10.5,3.4,11],scale:[12,6.8,.3]},
  ...[4.5,16.5].map(x=>({position:[x,3.4,7],scale:[.3,6.8,8]})),
 ],[])
 const posts=useMemo(()=>[4.6,8.6,12.6,16.4].map(x=>({position:[x,3.4,2.93],scale:[.14,6.8,.14]})),[])
 const lights=useMemo(()=>Array.from({length:low?3:6},(_,i)=>({position:[4.9+i*(low?5.6:2.24),.225,-7],scale:[.14,.45,.14]})),[low])
 const panes=useMemo(()=>[0,1].flatMap(floor=>[0,1,2].map(i=>({position:[6.6+i*4,floor*3.4+1.65,3],scale:[3.8,3.1,.08]}))),[])
 const palms=useMemo(()=>[[-.5,3.2,5],[19.5,3.2,4],...(low?[]:[[18.5,3.2,-5]])].map(position=>({position,scale:[.16,6.4,.16]})),[low])
 const parking=useMemo(()=>[
  {position:[6.45,.025,-4],scale:[.07,.025,5.6]}, {position:[9.55,.025,-4],scale:[.07,.025,5.6]}, {position:[8,.025,-1.2],scale:[3.15,.025,.07]},
 ],[])
 useSceneVisibility(root,'contact')
 return <group ref={root} visible={false} name="egal-destination" position={destinationFrame.p.toArray()} rotation={[0,destinationFrame.yaw,0]}>
  <RoundedBox args={[16,.14,22]} radius={.1} position={[11,-.1,1]}><meshStandardMaterial color="#8c9290" roughness={.85}/></RoundedBox>
  <Instances name="showroom-shell" items={shell}><boxGeometry/><meshStandardMaterial color="#29323a" metalness={.25} roughness={.55}/></Instances>
  <Instances name="showroom-window-frames" items={posts}><boxGeometry/><meshStandardMaterial color="#17232a" metalness={.7} roughness={.3}/></Instances>
  <Instances name="showroom-glass" items={panes}><boxGeometry/><meshStandardMaterial color="#9dc6cd" transparent opacity={.18} metalness={.45} roughness={.13} depthWrite={false}/></Instances>
  <mesh position={[10.5,3.45,10.75]} rotation={[0,Math.PI,0]}><planeGeometry args={[11.7,6.5]}/><meshStandardMaterial map={timber} color="#c18e62" emissive="#ffb66d" emissiveIntensity={.3} roughness={.7}/></mesh>
  <Instances name="showroom-timber-cladding" items={[{position:[4.3,3.5,7],scale:[.09,6.4,7.7]},{position:[16.7,3.5,7],scale:[.09,6.4,7.7]},{position:[10.5,3.35,2.81],scale:[12.2,.34,.08]}]}><boxGeometry/><meshStandardMaterial map={timber} color="#c69b78" roughness={.65}/></Instances>
  <mesh name="showroom-roof-overhang" position={[10.5,7.12,7]}><boxGeometry args={[14,.18,10]}/><meshStandardMaterial color="#24303a" metalness={.4} roughness={.38}/></mesh>
  <Instances name="showroom-warm-light-strips" items={[{position:[10.5,7.005,1.96],scale:[13.9,.045,.045]},{position:[3.53,7.005,6.95],scale:[.045,.045,10]},{position:[17.47,7.005,6.95],scale:[.045,.045,10]},{position:[10.5,3.18,2.8],scale:[12,.035,.04]},{position:[10.5,6.6,10.45],scale:[11.2,.07,.07]}]}><boxGeometry/><meshBasicMaterial color="#ffcc86" toneMapped={false}/></Instances>
  <RoundedBox args={[8.2,2.05,.14]} radius={.04} position={[10.5,5.35,2.77]}><meshStandardMaterial color="#202c34" roughness={.5}/></RoundedBox>
  <Suspense fallback={null}><group position={[10.5,5.65,2.65]} rotation={[0,Math.PI,0]}>
   <DeferredText stage="contact" font={FONT} fontSize={1.18} position={[-1.13,0,.02]} color="#ff8e32"><meshStandardMaterial color="#ff8e32" emissive="#ff7a24" emissiveIntensity={.8} toneMapped={false}/>{brand.name.slice(0,1)}</DeferredText>
   <DeferredText stage="contact" font={FONT} fontSize={1.18} anchorX="left" position={[-.7,0,.02]} color="white"><meshStandardMaterial color="white" emissive="#ffe7cf" emissiveIntensity={.6} toneMapped={false}/>{brand.name.slice(1)}</DeferredText>
   <DeferredText stage="contact" font={FONT} position={[0,-.8,.02]} fontSize={.29} letterSpacing={.035} color="#ffe0bc">{contactCopy.motto.replaceAll(' · ',' - ')}</DeferredText>
  </group></Suspense>
  {[0,1].map(i=><group key={i} position={[7.2+i*5.4,0,6.2]} rotation={[0,Math.PI+.18,0]} scale={.78}><FleetBoundary fallback={null}><Suspense fallback={null}>{getHeroCarModel()&&<ParkedModel type="sedan" color={i?'#a63227':'#f1e6ce'}/>}</Suspense></FleetBoundary></group>)}
  <group name="destination-welcome-board" position={[2,1.3,-6]}>
   <RoundedBox args={[3.75,2.2,.2]} radius={.07}><meshBasicMaterial color="#f78b32" toneMapped={false}/></RoundedBox>
   <RoundedBox args={[3.63,2.08,.05]} radius={.05} position={[0,0,-.13]}><meshStandardMaterial color="#14242d" roughness={.6}/></RoundedBox>
   <mesh position={[0,-.9,.04]}><boxGeometry args={[.12,2,.12]}/><meshStandardMaterial color="#4e5247"/></mesh>
   <Suspense fallback={null}>
    <DeferredText stage="contact" font={FONT} position={[0,.38,-.17]} rotation={[0,Math.PI,0]} fontSize={.54} color="#fff0d9" outlineColor="#ff9b3f" outlineWidth={.009}>{brand.name}</DeferredText>
    <DeferredText stage="contact" font={FONT} position={[0,-.32,-.17]} rotation={[0,Math.PI,0]} fontSize={.25} lineHeight={1.2} color="#fff2d9" maxWidth={3.2} textAlign="center">{contactCopy.sign}</DeferredText>
   </Suspense>
  </group>
  <Instances name="destination-parking-lines" items={parking}><boxGeometry/><meshBasicMaterial color="#fff4d9"/></Instances>
  <Instances name="destination-palm-trunks" items={palms}><cylinderGeometry args={[.7,1,1,6]}/><meshStandardMaterial color="#876448"/></Instances>
  <Instances name="destination-palm-crowns" items={palms.map(p=>({position:[p.position[0],6.4,p.position[2]],scale:5.4}))} geometry={crown}><meshStandardMaterial color="#4e6e46" side={2}/></Instances>
  <Instances name="destination-path-lights" items={lights}><cylinderGeometry args={[1,1.1,1,8]}/><meshStandardMaterial color="#35403c" metalness={.35}/></Instances>
  <Instances name="destination-path-glow" items={lights.map(p=>({position:[p.position[0],.47,p.position[2]],scale:[.15,.12,.15]}))}><cylinderGeometry args={[1,1,1,10]}/><meshStandardMaterial color="#fff0c9" emissive="#ffd09b" emissiveIntensity={4} toneMapped={false}/></Instances>
  <Instances name="entrance-path-light-line" items={Array.from({length:low?4:7},(_,i)=>({position:[12,.018,-6+i*(low?2.6:1.3)],scale:[.8,.025,.055]}))}><boxGeometry/><meshBasicMaterial color="#ffc78a" toneMapped={false}/></Instances>
  <ContactLighting lights={lights} low={low}/><Pin/>
 </group>
}
