import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import { SCENE_WINDOWS, windowOpacity } from './sceneWindows'
import { warmScene } from './warmScene'

// Fade at the shader output so animated colours/opacities and Troika glyph masks
// remain intact. At zero visibility the whole subtree is culled by Three.
export default function useSceneVisibility(root,id) {
 const scroll=useScroll(),materials=useRef(new Map()),lights=useRef(new Map()),scan=useRef(1),previous=useRef(-1)
 const warmup=useRef(null)
 useFrame(({gl,scene,camera},delta)=>{
  const opacity=windowOpacity(scroll.offset,id),group=root.current
  if(!group)return
  group.visible=opacity>0;group.userData.sceneOpacity=opacity
  const approaching=scroll.offset>=SCENE_WINDOWS[id][0]-.10&&scroll.offset<SCENE_WINDOWS[id][0]
  if(!group.visible&&!approaching)return
  scan.current+=delta
  // Discover late Suspense/Troika materials without traversing every frame.
  if(scan.current>=.25||(group.visible&&previous.current===0)){
  scan.current=0
  group.traverse(object=>{
   if(object.isLight){if(!lights.current.has(object))lights.current.set(object,object.intensity);object.intensity=lights.current.get(object)*opacity}
   if(!object.isMesh&&!object.isSprite)return
   for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if(!material)continue
    if(!materials.current.has(material)){
     const privateHooks=new Map(Object.keys(material).filter(key=>key.startsWith('_onBeforeCompile')).map(key=>[key,material[key]]))
     const original={compile:material.onBeforeCompile,key:material.customProgramCacheKey,transparent:material.transparent,depthWrite:material.depthWrite,forceSinglePass:material.forceSinglePass,privateHooks,privateKey:null}
     const uniform={value:opacity}
     const compile=function(shader,renderer){
      // Troika invokes its custom callback after its own shader upgrade. Calling
      // the public getter from that callback would re-enter the upgrade.
      if(!material.isDerivedMaterial)original.compile.call(this,shader,renderer)
      else original.privateHooks.get(original.privateKey)?.call(this,shader,renderer)
      shader.uniforms.egalSceneOpacity=uniform
      shader.fragmentShader='uniform float egalSceneOpacity;\n'+shader.fragmentShader
      const tail=shader.fragmentShader.lastIndexOf('}')
      shader.fragmentShader=shader.fragmentShader.slice(0,tail)+'\n gl_FragColor.a *= egalSceneOpacity;\n'+shader.fragmentShader.slice(tail)
     }
     material.onBeforeCompile=compile
     if(material.isDerivedMaterial)original.privateKey=Object.keys(material).find(key=>key.startsWith('_onBeforeCompile')&&material[key]===compile)
     material.customProgramCacheKey=function(){return original.key.call(this)+'-egal-scene-fade-v1'}
     // Opaque export materials are double-sided. The fade must not turn every
     // parked car into two full draws (back + front) throughout the showcase.
     material.transparent=true;material.forceSinglePass=true;material.needsUpdate=true
     materials.current.set(material,{original,uniform})
    }
   }
  })
  }
  if(opacity!==previous.current||scan.current===0){
   for(const[material,record]of materials.current){record.uniform.value=opacity;material.depthWrite=opacity<.999?false:record.original.depthWrite}
   for(const[light,intensity]of lights.current)light.intensity=intensity*opacity
   previous.current=opacity
  }
  if(approaching&&!warmup.current)warmup.current=warmScene(gl,scene,camera,group)
 })
 useEffect(()=>()=>{
  warmup.current?.()
  materials.current.forEach(({original},material)=>{if(material.isDerivedMaterial){if(original.privateHooks.has(original.privateKey))material[original.privateKey]=original.privateHooks.get(original.privateKey);else delete material[original.privateKey]}else material.onBeforeCompile=original.compile;material.customProgramCacheKey=original.key;material.transparent=original.transparent;material.depthWrite=original.depthWrite;material.forceSinglePass=original.forceSinglePass;material.needsUpdate=true})
  lights.current.forEach((intensity,light)=>{light.intensity=intensity})
  materials.current.clear();lights.current.clear()
 },[])
}
