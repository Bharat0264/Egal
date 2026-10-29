import { useMemo } from 'react'
import Instances from '../world/Instances'

export default function Chauffeur() {
  const legs=useMemo(()=>[-1,1].map(side=>({position:[side*.12,.43,0],scale:[.085,.78,.09]})),[])
  const arms=useMemo(()=>[-1,1].map(side=>({position:[side*.30,1.12,0],rotation:[0,0,side*.12],scale:[.065,.64,.07]})),[])
  const shoes=useMemo(()=>[-1,1].map(side=>({position:[side*.12,.065,-.065],scale:[.17,.13,.30]})),[])
  const hands=useMemo(()=>[-1,1].map(side=>({position:[side*.34,.77,0],scale:.075})),[])
  return <group name="chauffeur-figure" position={[2.7,0,31]}>
    <mesh position={[0,1.14,0]}><cylinderGeometry args={[.22,.25,.69,7]} /><meshStandardMaterial color="#23313e" roughness={.85} /></mesh>
    <Instances name="chauffeur-legs" items={legs}><cylinderGeometry args={[1,1,1,6]} /><meshStandardMaterial color="#182633" /></Instances>
    <Instances name="chauffeur-arms" items={arms}><cylinderGeometry args={[1,1,1,6]} /><meshStandardMaterial color="#23313e" /></Instances>
    <Instances name="chauffeur-shoes" items={shoes}><boxGeometry /><meshStandardMaterial color="#101b24" /></Instances>
    <Instances name="chauffeur-hands" items={hands}><sphereGeometry args={[1,7,5]} /><meshStandardMaterial color="#ba8d68" /></Instances>
    <mesh position={[0,1.68,0]}><sphereGeometry args={[.20,8,6]} /><meshStandardMaterial color="#ba8d68" /></mesh>
    <mesh position={[0,1.9,0]}><cylinderGeometry args={[.22,.24,.11,8]} /><meshStandardMaterial color="#152431" /></mesh>
    <mesh position={[0,1.85,-.16]}><boxGeometry args={[.35,.035,.25]} /><meshStandardMaterial color="#101b24" /></mesh>
  </group>
}
