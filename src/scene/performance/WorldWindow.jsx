import {useMemo} from 'react'
import {useFrame} from '@react-three/fiber'
import {Vector3,Quaternion} from 'three'
import {roadCurve} from '../Road'
import {performanceRuntime} from './runtime'
export const curveSamples=Array.from({length:161},(_,i)=>roadCurve.getPointAt(i/160))
export function nearestCurveU(position){let best=Infinity,index=0;for(let i=0;i<curveSamples.length;i++){const p=curveSamples[i],d=(position.x-p.x)**2+(position.z-p.z)**2;if(d<best){best=d;index=i}}return index/160}
export default function WorldWindow(){
 const previous=useMemo(()=>({position:new Vector3(Infinity,0,0),quaternion:new Quaternion()}),[])
 useFrame(({camera})=>{if(camera.position.distanceToSquared(previous.position)<1&&Math.abs(camera.quaternion.dot(previous.quaternion))>.9998)return;previous.position.copy(camera.position);previous.quaternion.copy(camera.quaternion);performanceRuntime.windowU=nearestCurveU(camera.position);performanceRuntime.windowRevision++},-.75)
 return null
}
