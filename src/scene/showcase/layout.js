import { Vector3 } from 'three'
import { frame,servicesAnchorU } from '../world/layout'
import { getJourneyProgress, roadCurve } from '../Road'
import { landmarks } from '../../data/landmarks'
import { windowOpacity } from './sceneWindows'

export const fleetFrame = frame(getJourneyProgress(landmarks.fleetBay.t), -11, 0.12)
// Includes the full 36 m landmark envelope plus a curved-road safety buffer.
export {servicesAnchorU}
export const servicesFrame = frame(servicesAnchorU)
export function worldPoint(anchor, xyz) { return new Vector3(...xyz).applyAxisAngle(new Vector3(0, 1, 0), anchor.yaw).add(anchor.p) }
export const sceneBlend = (offset,id) => windowOpacity(offset,id)
