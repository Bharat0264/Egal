import { Suspense, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox, useScroll } from '@react-three/drei'
import DeferredText from './DeferredText'
import { DoubleSide } from 'three'
import SpurRoads from './SpurRoads'
import Chauffeur from './Chauffeur'
import { serviceIconTexture } from './serviceIcons'
import { services } from '../../data/services'
import { useSelection } from '../../state/SelectionContext'
import { servicesFrame } from './layout'
import { textOpacity } from './sceneWindows'
import useSceneVisibility from './useSceneVisibility'
import Instances from '../world/Instances'
import { windowTexture } from '../world/textures'

const FONT = `${import.meta.env.BASE_URL}fonts/DejaVuSans.ttf`
function Icon({ type }) {
  const texture = useMemo(() => serviceIconTexture(type),[type])
  return <mesh><planeGeometry args={[1,1]} /><meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} /></mesh>
}
function Sign({ service, index, low }) {
  const { serviceId,setServiceId }=useSelection(), material=useRef(), border=useRef(), hovered=useRef(false), scroll=useScroll()
  const x=(1-index)*(low?9:14), z= index===1 ? 25 : 21, width=low?3.9:6.3
  const selected=serviceId===service.id
  useFrame((_,delta)=>{
    material.current.emissiveIntensity += (((selected||hovered.current)?.42:.035)-material.current.emissiveIntensity)*(1-Math.exp(-delta*7))
    border.current.material.opacity += ((selected?.9:.3)-border.current.material.opacity)*(1-Math.exp(-delta*7))
  })
  const posts=useMemo(()=>[-1,1].map(side=>({position:[side*(width/2-.3),1.8,0],scale:[.12,3.6,.12]})),[width])
  return <group name={`service-sign-${service.id}`} position={[x,3.6,z]} onPointerOver={e=>{if(textOpacity(scroll.offset,'services')<=0)return;e.stopPropagation();hovered.current=true}} onPointerOut={()=>{hovered.current=false}} onClick={e=>{if(textOpacity(scroll.offset,'services')<=0)return;e.stopPropagation();setServiceId(serviceId===service.id?null:service.id)}}>
    <RoundedBox args={[width,2,.22]} radius={.1}><meshStandardMaterial ref={material} color={service.color} emissive={service.color} emissiveIntensity={.035} roughness={.45} /></RoundedBox>
    <mesh ref={border} position={[0,0,.13]}><planeGeometry args={[width+.12,2.12]} /><meshBasicMaterial color="#ffbe70" transparent opacity={.3} side={DoubleSide} /></mesh>
    <group position={[0,0,-.15]} rotation={[0,Math.PI,0]}>
      <group position={[low?-1.37:-2.35,0,.025]} scale={low?.76:.98}><Icon type={service.icon} /></group>
      <Suspense fallback={null}><DeferredText stage="services" font={FONT} fontSize={low?.43:.66} position={[low?-.75:-1.6,.25,.025]} anchorX="left" color="#fff6e6">{service.title}</DeferredText><DeferredText stage="services" font={FONT} fontSize={low?.20:.29} position={[low?-.75:-1.6,-.38,.025]} anchorX="left" color="#fff2df">{service.subtitle}</DeferredText></Suspense>
    </group>
    <Instances name={`sign-legs-${service.id}`} items={posts.map(p=>({...p,position:[p.position[0],-1.8,0]}))}><boxGeometry /><meshStandardMaterial color="#675d4b" /></Instances>
  </group>
}
function MiniLandmarks({ low, compact }) {
  const windows=useMemo(windowTexture,[])
  const towers=useMemo(()=>Array.from({length:low?3:6},(_,i)=>({position:[(compact?12:19)+(i%3)*2.3,(5+i%3*1.2)/2,25+Math.floor(i/3)*4],scale:[1.8,5+i%3*1.2,2]})),[low,compact])
  const peaks=useMemo(()=>Array.from({length:low?2:4},(_,i)=>({position:[-8-i*2.2,2.5+(i%2),29+i%2*3],scale:[1.8,1+i%2*.3,1.4]})),[low])
  const hotel=useMemo(()=>[{position:[-3.4,2.3,33],scale:[.5,4.6,2]},{position:[3.4,2.3,33],scale:[.5,4.6,2]},{position:[0,4.7,33],scale:[7.4,.5,3.2]}],[])
  const car=useMemo(()=>[{position:[0,.65,31],scale:[2,.65,3.8]},{position:[0,1.2,31],scale:[1.7,.65,1.8]}],[])
  return <group name="service-mini-landmarks">
    <Instances name="service-city-towers" items={towers}><boxGeometry /><meshStandardMaterial map={windows} color="#a9b9c1" roughness={.7} /></Instances>
    <Instances name="service-mountains" items={peaks}><coneGeometry args={[1.8,5,5]} /><meshStandardMaterial color="#57756e" flatShading /></Instances>
    <mesh position={[-10,.02,28]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[5,20]} /><meshStandardMaterial color="#d6c59e" /></mesh>
    <Instances name="hotel-entrance" items={hotel}><boxGeometry /><meshStandardMaterial color="#d2baa0" /></Instances>
    <mesh position={[0,2.3,34]}><boxGeometry args={[5.7,4.3,.2]} /><meshStandardMaterial color="#72513a" emissive="#ffba69" emissiveIntensity={.14} /></mesh>
    <Instances name="chauffeur-car" items={car}><boxGeometry /><meshStandardMaterial color="#19272c" metalness={.5} roughness={.3} /></Instances>
    <mesh name="chauffeur-open-door" position={[1.6,.9,31.1]} rotation={[0,-.85,0]}><boxGeometry args={[.07,1,1.5]} /><meshStandardMaterial color="#1d2b30" /></mesh>
    <Chauffeur />
  </group>
}
export default function ServicesScene({low}) {
  const compact = useThree(state => state.size.width < 768)
  const root = useRef()
  useSceneVisibility(root,'services')
  return <group ref={root} visible={false} name="services-fork" position={servicesFrame.p.toArray()} rotation={[0,servicesFrame.yaw,0]}>
    <SpurRoads compact={compact} /><MiniLandmarks low={low} compact={compact} />{services.map((service,index)=><Sign key={service.id} service={service} index={index} low={compact} />)}
  </group>
}
