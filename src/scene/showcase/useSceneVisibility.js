import {useLayoutEffect,useRef} from 'react'
import {useFrame} from '@react-three/fiber'
import {useScroll} from '@react-three/drei'
import {windowOpacity} from './sceneWindows'
import {keepWarmMaterial,performanceRuntime} from '../performance/runtime'
import {mergeStatics} from '../performance/mergeStatics'

export default function useSceneVisibility(root,id){
 const scroll=useScroll(),materials=useRef(new Map()),lights=useRef(new Map()),elapsed=useRef(1),previous=useRef(-1)
 const scan=()=>{
  const group=root.current;if(!group)return
  group.traverse(object=>{
   if(object.isLight&&!lights.current.has(object))lights.current.set(object,object.intensity)
   if(!object.isMesh&&!object.isSprite)return
   for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if(!material||materials.current.has(material))continue
    const hooks=new Map(Object.keys(material).filter(k=>k.startsWith('_onBeforeCompile')).map(k=>[k,material[k]]))
    const original={compile:material.onBeforeCompile,key:material.customProgramCacheKey,depthWrite:material.depthWrite,privateKey:null},uniform={value:1}
    const compile=function(shader,renderer){
     if(!material.isDerivedMaterial)original.compile.call(this,shader,renderer)
     else hooks.get(original.privateKey)?.call(this,shader,renderer)
     shader.uniforms.egalSceneOpacity=uniform
     shader.fragmentShader='uniform float egalSceneOpacity;\n'+shader.fragmentShader
     const tail=shader.fragmentShader.lastIndexOf('}')
     shader.fragmentShader=shader.fragmentShader.slice(0,tail)+'\n gl_FragColor.a *= egalSceneOpacity;\n'+shader.fragmentShader.slice(tail)
    }
    material.onBeforeCompile=compile
    if(material.isDerivedMaterial)original.privateKey=Object.keys(material).find(k=>k.startsWith('_onBeforeCompile')&&material[k]===compile)
    material.customProgramCacheKey=function(){return original.key.call(this)+'-egal-scene-fade-v2'}
    material.transparent=true;material.forceSinglePass=true;material.needsUpdate=true
    materials.current.set(material,{original,uniform});keepWarmMaterial(material)
   }
  })
 }
 useLayoutEffect(()=>{const cleanup=mergeStatics(root.current);scan();root.current.userData.prepareMaterials=scan;return()=>{cleanup();materials.current.clear();lights.current.clear()}},[])
 useFrame((_,delta)=>{
  const group=root.current;if(!group)return
  const opacity=performanceRuntime.warming?1:windowOpacity(scroll.offset,id)
  group.visible=opacity>0;group.userData.sceneOpacity=opacity
  if(!group.visible)return
  elapsed.current+=delta
  if(elapsed.current>.25){elapsed.current=0;scan()}
  if(opacity!==previous.current||elapsed.current===0){
   for(const[m,r]of materials.current){r.uniform.value=opacity;m.depthWrite=opacity<.999?false:r.original.depthWrite}
   for(const[light,intensity]of lights.current)light.intensity=(light.userData.sceneIntensity??intensity)*opacity
   previous.current=opacity
  }
 })
}
