import { useMemo } from 'react'
import { AdditiveBlending, Vector3 } from 'three'
import { frame } from '../world/layout'
import { roadCurve } from '../Road'
import { destinationFrame } from './journeyLayout'
import { sunGlowTexture } from '../world/textures'
import Instances from '../world/Instances'

export default function ContactLighting({lights,low}) {
 const glow=useMemo(sunGlowTexture,[])
 const lamps=useMemo(()=>{
  const up=new Vector3(0,1,0),length=roadCurve.getLength()
  return [3,14,25].map(distance=>{
   // Find the destination's actual arc coordinate without changing landmark data.
   let nearest=0,best=Infinity
   for(let i=0;i<=1000;i++){const d=roadCurve.getPointAt(i/1000).distanceToSquared(destinationFrame.p);if(d<best){best=d;nearest=i/1000}}
   const f=frame(nearest+distance/length,-3.6)
   const local=point=>point.sub(destinationFrame.p).applyAxisAngle(up,-destinationFrame.yaw).toArray()
   const base=local(f.p.clone()),head=local(f.p.clone().addScaledVector(f.right,.7))
   return {base,head,yaw:f.yaw-destinationFrame.yaw}
  })
 },[])
 return <group name="contact-lighting">
  {lights.map((light,i)=><sprite key={i} name={`bollard-halo-${i}`} position={[light.position[0],.5,light.position[2]]} scale={[1.2,1.2,1]}><spriteMaterial map={glow} color="#ffc47a" opacity={.43} transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false}/></sprite>)}
  {[0,lights.length-1].map((index,i)=><pointLight key={i} name="bollard-warm-pool" position={[lights[index].position[0],.62,lights[index].position[2]]} color="#ffc27c" intensity={low&&i>0?0:2.4} userData={{sceneIntensity:low&&i>0?0:2.4}} distance={4} decay={2}/>)}
  <pointLight name="showroom-interior-warmth" position={[10.5,2.6,6.5]} color="#ffbf7f" intensity={18} distance={11} decay={2}/>
  <Instances name="contact-streetlamp-posts" items={lamps.map(l=>({position:[l.base[0],2.15,l.base[2]],scale:[.065,4.3,.065]}))}><cylinderGeometry args={[1,1,1,8]}/><meshStandardMaterial color="#35413f" metalness={.4}/></Instances>
  <Instances name="contact-streetlamp-arms" items={lamps.map(l=>({position:[(l.base[0]+l.head[0])/2,4.23,(l.base[2]+l.head[2])/2],rotation:[0,l.yaw,0],scale:[.85,.07,.07]}))}><boxGeometry/><meshStandardMaterial color="#35413f" metalness={.4}/></Instances>
  <Instances name="contact-streetlamp-heads" items={lamps.map(l=>({position:[l.head[0],4.19,l.head[2]],rotation:[0,l.yaw,0],scale:[.4,.065,.25]}))}><boxGeometry/><meshStandardMaterial color="#fff2d1" emissive="#ffcd92" emissiveIntensity={4} toneMapped={false}/></Instances>
  {lamps.map((lamp,i)=><group key={i} position={[lamp.head[0],4.12,lamp.head[2]]}>
   <sprite scale={[2,2,1]}><spriteMaterial map={glow} color="#ffc887" opacity={.4} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false}/></sprite>
   <pointLight color="#ffc887" intensity={!low||i===1?7:0} userData={{sceneIntensity:!low||i===1?7:0}} distance={8} decay={2}/>
  </group>)}
 </group>
}
