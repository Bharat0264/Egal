import {useEffect,useRef} from 'react'
import {useFrame,useThree} from '@react-three/fiber'
import {performanceRuntime} from '../performance/runtime'

export default function RenderBudget({low,performanceLow}){
 const{gl,clock,setDpr,setFrameloop}=useThree(),current=useRef(1.25),applied=useRef(1.25),lastInput=useRef(performance.now()),lastRender=useRef(0),sample=useRef({elapsed:0,count:0})
 useEffect(()=>{gl.domElement.dataset.quality=performanceLow?'performance':low?'balanced':'high'},[gl,low,performanceLow])
 useEffect(()=>{
  let onScreen=true,paused=false,savedTime=0
  const activity=()=>{lastInput.current=performance.now()}
  const visibility=()=>{const next=document.hidden||!onScreen;if(next===paused)return;if(next){savedTime=clock.elapsedTime;setFrameloop('never')}else{setFrameloop('always');clock.elapsedTime=savedTime;activity()}paused=next}
  const observer=new IntersectionObserver(entries=>{onScreen=entries[0].isIntersecting;visibility()});observer.observe(gl.domElement)
  const events=['pointerdown','pointermove','wheel','touchstart','keydown','scroll'];for(const event of events)document.addEventListener(event,activity,{passive:true,capture:true})
  document.addEventListener('visibilitychange',visibility)
  return()=>{observer.disconnect();for(const event of events)document.removeEventListener(event,activity,true);document.removeEventListener('visibilitychange',visibility);setFrameloop('always')}
 },[gl,clock,setFrameloop])
 useFrame(({scene,camera},delta)=>{
  const target=performanceRuntime.dprTarget??1.25;current.current+=(target-current.current)*Math.min(delta*2,1)
  if(Math.abs(current.current-applied.current)>.015){applied.current=current.current;setDpr(applied.current)}else if(Math.abs(gl.getPixelRatio()-applied.current)>.015)setDpr(applied.current)
  const now=performance.now(),active=performanceRuntime.warming||now-lastInput.current<2000;performanceRuntime.active=active
  if(active&&performanceRuntime.ready){sample.current.elapsed+=delta;sample.current.count++;if(sample.current.elapsed>=1){const fps=sample.current.count/sample.current.elapsed;if(fps<55&&performanceRuntime.dprTarget>1){performanceRuntime.dprTarget=Math.max(1,performanceRuntime.dprTarget-.15);performanceRuntime.raiseAfter=now+10000}sample.current.elapsed=0;sample.current.count=0}}else{sample.current.elapsed=0;sample.current.count=0}
  performanceRuntime.didRender=false
  if(active||now-lastRender.current>=1000/30-1){performanceRuntime.frameTime=now-lastRender.current;lastRender.current=now;performanceRuntime.didRender=true;gl.render(scene,camera)}
 },100)
 return null
}
