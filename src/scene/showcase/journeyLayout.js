import { MathUtils, Vector3 } from 'three'
import { frame } from '../world/layout'
import { roadCurve, getJourneyProgress } from '../Road'
import { landmarks } from '../../data/landmarks'
import { worldPoint } from './layout'
export const tollFrame = frame(getJourneyProgress(landmarks.tollGate.t))
export const destinationFrame = frame(getJourneyProgress(landmarks.destination.t))
export const PARKING_POSITION = [8,0,-4]
const pathLength=roadCurve.getLength(), up=new Vector3(0,1,0)
const tollPoint=new Vector3(),tollTangent=new Vector3(),parkingPoint=worldPoint(destinationFrame,PARKING_POSITION),parkingTangent=new Vector3(0,0,1).applyAxisAngle(up,destinationFrame.yaw)
export function journeyPose(offset, gateDrive, point, tangent) {
  const u=getJourneyProgress(offset)
  roadCurve.getPointAt(u,point);roadCurve.getTangentAt(u,tangent)
  const tollWeight=MathUtils.smoothstep(offset,.60,.665)*(1-MathUtils.smoothstep(offset,.77,.80))
  if(tollWeight>0) {
    const drive=MathUtils.smoothstep(gateDrive,.28,.98)
    const at=getJourneyProgress(landmarks.tollGate.t)+(-5.7+drive*14)/pathLength
    point.lerp(roadCurve.getPointAt(at,tollPoint),tollWeight)
    tangent.lerp(roadCurve.getTangentAt(at,tollTangent),tollWeight).normalize()
  }
  const parkWeight=MathUtils.smoothstep(offset,.83,.95)
  if(parkWeight>0) {
    point.lerp(parkingPoint,parkWeight)
    tangent.lerp(parkingTangent,parkWeight).normalize()
  }
  return point
}
