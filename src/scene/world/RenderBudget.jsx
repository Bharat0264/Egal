import {useEffect,useMemo,useRef} from 'react'
import {useFrame,useThree} from '@react-three/fiber'
import {qualityProfile} from './renderQuality'
export default function RenderBudget({low,performanceLow}){
 const{gl,clock,setDpr,setFrameloop,invalidate}=useThree()
 const profile=useMemo(()=>qualityProfile({coarse:matchMedia('(pointer: coarse)').matches||innerWidth<768,cores:navigator.hardwareConcurrency,memory:navigator.deviceMemory,dpr:devicePixelRatio}),[])
 const current=useRef(profile.max),applied=useRef(profile.max)
 useEffect(()=>{gl.transmissionResolutionScale=low?.25:.5;gl.domElement.dataset.quality=performanceLow?'performance':profile.level},[gl,low,performanceLow,profile])
 useEffect(()=>{
  let onScreen=true,paused=false,savedTime=0
  const update=()=>{const next=document.hidden||!onScreen;if(next===paused)return;if(next){savedTime=clock.elapsedTime;setFrameloop('never')}else{setFrameloop('always');clock.elapsedTime=savedTime;invalidate()}paused=next}
  const observer=new IntersectionObserver(entries=>{onScreen=entries[0].isIntersecting;update()});observer.observe(gl.domElement)
  document.addEventListener('visibilitychange',update)
  return()=>{observer.disconnect();document.removeEventListener('visibilitychange',update);setFrameloop('always')}
 },[gl,clock,setFrameloop,invalidate])
 useFrame((_,delta)=>{const target=performanceLow?Math.min(devicePixelRatio,1):profile.max;current.current+=(target-current.current)*Math.min(delta*.8,1);if(Math.abs(current.current-applied.current)>.02){applied.current=current.current;setDpr(applied.current)}else if(Math.abs(gl.getPixelRatio()-applied.current)>.02)setDpr(applied.current)})
 return null
}
