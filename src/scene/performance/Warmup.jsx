import {useEffect,useRef} from 'react'
import {useFrame,useThree} from '@react-three/fiber'
import {useProgress} from '@react-three/drei'
import {performanceRuntime,releaseWarmMaterials} from './runtime'

const names=['fleet-bay','services-fork','toll-gate','egal-destination']
export default function Warmup({onReady,onProgress}){
 const {gl,scene,camera,setFrameloop,invalidate}=useThree(),progress=useProgress(),begun=useRef(false),age=useRef(0),alive=useRef(true)
 useEffect(()=>{if(!begun.current)onProgress?.(Math.min(50,progress.progress*.5))},[progress.progress,onProgress])
 useEffect(()=>()=>{alive.current=false;releaseWarmMaterials()},[])
 useFrame((_,delta)=>{
  age.current+=delta
  if(begun.current||age.current<.5||progress.active||!scene.environment)return
  let text=0,pending=false,car=false
  scene.traverse(o=>{if('textRenderInfo' in o){text++;if(!o.textRenderInfo)pending=true}if(o.name==='egal-normalized-car'||o.name==='placeholder-car')car=true})
  if(text<24||pending||!car)return
  const roots=names.map(name=>scene.getObjectByName(name));if(roots.some(r=>!r))return
  begun.current=true
  const prepare=async()=>{
   setFrameloop('never')
   try{
    onProgress?.(55)
    const textures=new Set()
    scene.traverse(o=>{o.userData.prepareMaterials?.();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const value of Object.values(m))if(value?.isTexture)textures.add(value);if(m.uniforms)for(const u of Object.values(m.uniforms))if(u?.value?.isTexture)textures.add(u.value)}})
    for(const texture of textures)if(!texture.isRenderTargetTexture)gl.initTexture(texture)
    // Compile the full set plus each real light/visibility configuration.
    for(let variant=-1;variant<roots.length;variant++){
     for(let i=0;i<roots.length;i++)roots[i].visible=variant<0||variant===i
     scene.updateMatrixWorld(true)
     await gl.compileAsync(scene,camera)
     if(!alive.current)return
     onProgress?.(60+(variant+2)*7)
    }
    for(const root of roots)root.visible=false
    performanceRuntime.programsAtStart=gl.info.programs.length
    performanceRuntime.warming=false;performanceRuntime.ready=true;performanceRuntime.progress=100
    onProgress?.(100);onReady?.()
   }catch{if(alive.current)location.replace('/simple?reason=scene')}
   finally{if(alive.current){setFrameloop('always');invalidate()}}
  }
  void prepare()
 })
 return null
}
