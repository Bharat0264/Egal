import {useMemo,useSyncExternalStore} from 'react'
import {useFrame} from '@react-three/fiber'
import {useScroll} from '@react-three/drei'
import {performanceRuntime,sceneIndex} from './runtime'
import FleetScene from '../showcase/FleetScene'
import ServicesScene from '../showcase/ServicesScene'
import BookingScene from '../showcase/BookingScene'
import ContactScene from '../showcase/ContactScene'
export default function SceneSlots({low,started}){
 const scroll=useScroll(),store=useMemo(()=>{let value=-1,queued=false,pending=-1;const listeners=new Set();return{get:()=>value,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},set(next){if(next===value)return;pending=next;if(queued)return;queued=true;queueMicrotask(()=>{queued=false;if(value!==pending){value=pending;for(const fn of listeners)fn()}})}}},[])
 const active=useSyncExternalStore(store.subscribe,store.get,store.get)
 useFrame(()=>store.set(performanceRuntime.warming?-1:sceneIndex(scroll.offset)))
 const near=index=>active<0||Math.abs(active-index)<=1
 return <>{near(1)&&<FleetScene low={low} started={started}/>} {near(2)&&<ServicesScene low={low}/>} {near(3)&&<BookingScene/>} {near(4)&&<ContactScene low={low}/>}</>
}
