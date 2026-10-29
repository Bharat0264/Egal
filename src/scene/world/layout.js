import { Vector3, MathUtils } from 'three'
import { roadCurve, getJourneyProgress } from '../Road'
import { landmarks } from '../../data/landmarks'
import {createTerrainSurface} from './terrainSurface'

// Grade only the new lay-by footprint, including a small vegetation setback.
// This uses the anchor's existing t; the route and landmark data stay untouched.
const bayU = getJourneyProgress(landmarks.fleetBay.t)
const bayOrigin = roadCurve.getPointAt(bayU), bayForward = roadCurve.getTangentAt(bayU)
const bayRight = new Vector3(-bayForward.z,0,bayForward.x).normalize()
bayOrigin.addScaledVector(bayRight,-11)

const destinationU=getJourneyProgress(landmarks.destination.t)
const destinationOrigin=roadCurve.getPointAt(destinationU),destinationForward=roadCurve.getTangentAt(destinationU)
const destinationRight=new Vector3(-destinationForward.z,0,destinationForward.x).normalize()
export const servicesAnchorU=Math.max(0,Math.min(getJourneyProgress(landmarks.servicesFork.t),getJourneyProgress(landmarks.tollGate.t)-110/roadCurve.getLength()))
const servicesOrigin=roadCurve.getPointAt(servicesAnchorU),servicesForward=roadCurve.getTangentAt(servicesAnchorU)
const servicesRight=new Vector3(-servicesForward.z,0,servicesForward.x).normalize()

const reserve=(origin,right,forward,minX,maxX,minZ,maxZ)=>({x:origin.x,z:origin.z,rx:right.x,rz:right.z,fx:forward.x,fz:forward.z,minX,maxX,minZ,maxZ,feather:7})
export const terrainSurface=createTerrainSurface(roadCurve,[
 reserve(bayOrigin,bayRight.clone().negate(),bayForward,-9,9.5,-17,17),
 reserve(destinationOrigin,destinationRight.clone().negate(),destinationForward,-1,22,-12,15),
 reserve(servicesOrigin,servicesRight.clone().negate(),servicesForward,-28,28,4,39),
])
export const groundHeightAt=terrainSurface.height

export function random(seed = 718) {
  return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296 }
}
export function frame(u, lateral = 0, height = 0) {
  const p = roadCurve.getPointAt(MathUtils.clamp(u, 0, 1))
  const tangent = roadCurve.getTangentAt(MathUtils.clamp(u, 0, 1))
  const right = new Vector3(-tangent.z, 0, tangent.x).normalize()
  p.addScaledVector(right, lateral); p.y = height
  return { p, tangent, right, yaw: Math.atan2(tangent.x, tangent.z) }
}
export function writeFrame(u,lateral,height,out){roadCurve.getPointAt(MathUtils.clamp(u,0,1),out.p);roadCurve.getTangentAt(MathUtils.clamp(u,0,1),out.tangent);out.right.set(-out.tangent.z,0,out.tangent.x).normalize();out.p.addScaledVector(out.right,lateral);out.p.y=height;return out}
export function reserved(u, lateral) {
  const p = roadCurve.getPointAt(u), t = roadCurve.getTangentAt(u)
  p.addScaledVector(new Vector3(-t.z,0,t.x).normalize(),lateral).sub(bayOrigin)
  const x = -p.dot(bayRight), z = p.dot(bayForward)
  if(x > -9 && x < 9.5 && Math.abs(z) < 17) return true
  p.add(bayOrigin).sub(destinationOrigin)
  const destinationX=-p.dot(destinationRight),destinationZ=p.dot(destinationForward)
  if(destinationX>-1 && destinationX<22 && destinationZ>-12 && destinationZ<15)return true
  p.add(destinationOrigin).sub(servicesOrigin)
  const servicesX=-p.dot(servicesRight),servicesZ=p.dot(servicesForward)
  if(Math.abs(servicesX)<29&&servicesZ>3&&servicesZ<40)return true
  return Object.values(landmarks).some(a => a.clearance && Math.abs(u - getJourneyProgress(a.t)) < 0.027 && lateral < -4 && lateral > -a.clearance)
}
export function landHeight(u, lateral) {
  const {p}=frame(u,lateral)
  return groundHeightAt(p.x,p.z)
}
