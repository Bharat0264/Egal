import { useSyncExternalStore } from 'react'
import { GLTFLoader, MeshoptDecoder } from 'three-stdlib'
import { LoadingManager } from 'three'
import { cars, getCarModel, hasFleetModel } from '../../data/cars'
import { parkedAsset } from './parkedAsset'

const records=new Map(cars.map(car=>[car.id,{status:hasFleetModel(car.id)?'idle':'missing',parts:null}]))
const listeners=new Set()
let version=0,started=false,loader
const subscribe=listener=>{listeners.add(listener);return()=>listeners.delete(listener)}
const snapshot=()=>version
function emit(){version++;listeners.forEach(listener=>listener())}
function idle(callback){
 if(typeof window.requestIdleCallback==='function')window.requestIdleCallback(callback,{timeout:2000})
 else window.setTimeout(callback,150)
}
async function load(type){
 const record=records.get(type)
 if(!hasFleetModel(type))return
 record.status='loading';emit()
 try {
  // A separate manager prevents deferred requests from changing the hero loader.
  loader ||= new GLTFLoader(new LoadingManager()).setMeshoptDecoder(typeof MeshoptDecoder==='function'?MeshoptDecoder():MeshoptDecoder)
  const gltf=await loader.loadAsync(getCarModel(type))
  record.parts=parkedAsset(gltf.scene);record.scene=gltf.scene;record.url=getCarModel(type);record.status='ready'
 } catch {
  // Missing, invalid or unsupported variants fall back without throwing into React.
  record.status='failed';record.parts=null
 }
 emit()
}
export function preloadFleetInIdle(){
 if(started)return
 started=true
 let index=0
 const next=()=>{if(index>=cars.length)return;const type=cars[index++].id;idle(()=>{load(type).finally(next)})}
 next()
}
export function useFleetAsset(type){
 useSyncExternalStore(subscribe,snapshot,snapshot)
 return records.get(type)
}
export function fleetAssetStatus(){return Object.fromEntries([...records].map(([type,record])=>[type,record.status]))}
