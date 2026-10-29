import {useEffect,useRef} from 'react'
import {addAfterEffect,useFrame,useThree} from '@react-three/fiber'
import {PerfHeadless} from 'r3f-perf'
import {performanceRuntime} from './runtime'

export default function PerfDebug(){
 const store=useThree(s=>s.get),last=useRef(0),node=useRef(),frame=useRef({delta:0,drawn:false}),samples=useRef([])
 useEffect(()=>{const panel=document.createElement('output');panel.className='performance-debug';panel.setAttribute('aria-label','Rendering performance');document.body.appendChild(panel);node.current=panel;window.__EGAL_PERF__={get:store,samples:samples.current};const remove=addAfterEffect(()=>{if(!frame.current.drawn||!performanceRuntime.didRender)return;frame.current.drawn=false;const now=performance.now();if(now-last.current<250)return;last.current=now;const gl=store().gl,stats={fps:1000/Math.max(performanceRuntime.frameTime,.01),frameTime:performanceRuntime.frameTime,drawCalls:gl.info.render.calls,triangles:gl.info.render.triangles,textures:gl.info.memory.textures,geometries:gl.info.memory.geometries,programs:gl.info.programs?.length||0};window.__EGAL_PERF__.stats=stats;panel.textContent=`${stats.fps.toFixed(1)} fps · ${stats.frameTime.toFixed(1)} ms\n${stats.drawCalls} draws · ${stats.triangles.toLocaleString()} triangles\n${stats.textures} textures · ${stats.geometries} geometries`});return()=>{remove();panel.remove();delete window.__EGAL_PERF__}},[store])
 useFrame((_,delta)=>{frame.current.delta=delta;frame.current.drawn=true},-2)
 return <PerfHeadless matrixUpdate={false}/>
}
