import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import { MathUtils, Vector3 } from 'three'
import { getJourneyProgress, roadCurve } from './Road'
import { useSelection } from '../state/SelectionContext'
import { fleetFrame, servicesFrame, sceneBlend, worldPoint } from './showcase/layout'
import { services } from '../data/services'
import { tollFrame, destinationFrame, journeyPose } from './showcase/journeyLayout'
import { TABLE_X, TABLE_Z } from './showcase/fleetLayout'
import { drivingShot } from './cinematicShots'

export const CHASE_DISTANCE = 7.5
export const CHASE_HEIGHT = 1.9
export const CHASE_FOV = 45
const LOOK_AHEAD = 7

export default function CameraRig({ onScrollReady, started, transition, reducedMotion }) {
  const opening=useRef({elapsed:0,release:0})
  const scroll = useScroll()
  const { serviceId, journeyMotion } = useSelection()
  const camera = useThree((state) => state.camera)
  const low = useThree(state => state.size.width < 768)
  const scrollDistance=useRef(1)
  useLayoutEffect(()=>{const update=()=>{scrollDistance.current=Math.max(1,scroll.el.scrollHeight-scroll.el.clientHeight)};update();const observer=new ResizeObserver(update);observer.observe(scroll.el);observer.observe(scroll.fill);return()=>observer.disconnect()},[scroll])
  const vectors = useMemo(() => ({
    point: new Vector3(), tangent: new Vector3(), heading: new Vector3(), right:new Vector3(), look: new Vector3(), position: new Vector3(), smoothLook: new Vector3(), openingPoint:new Vector3(), up:new Vector3(0,1,0),shot:new Float64Array(4),
  }), [])
  const poses=useMemo(()=>({
    fleet:worldPoint(fleetFrame,low?[-78,12,TABLE_Z+4]:[-27,5.8,14]),fleetLook:worldPoint(fleetFrame,low?[TABLE_X,-9,TABLE_Z]:[1.7,1,7]),
    services:worldPoint(servicesFrame,low?[0,10,-48]:[0,4,-14]),servicesLook:worldPoint(servicesFrame,low?[0,-5,21]:[0,3.1,20]),
    booking:worldPoint(tollFrame,low?[1,7.5,-43]:[-1,3.6,-17]),bookingLook:worldPoint(tollFrame,low?[1,-2,0]:[-1,2.35,0]),
    contact:worldPoint(destinationFrame,low?[7,13,-65]:[-4,8,-23]),contactLook:worldPoint(destinationFrame,low?[9,-8,3]:[8,2,4]),
    gateForward:new Vector3(0,0,1).applyAxisAngle(new Vector3(0,1,0),tollFrame.yaw),
  }),[low])

  useLayoutEffect(() => {
    // Begin at the actual car's road position; no independent model orbit.
    const u = getJourneyProgress(scroll.offset)
    roadCurve.getPointAt(u, vectors.point)
    roadCurve.getTangentAt(u, vectors.heading)
    camera.position.copy(vectors.point).addScaledVector(vectors.heading, -CHASE_DISTANCE)
    camera.position.y += CHASE_HEIGHT
    vectors.look.copy(vectors.point).addScaledVector(vectors.heading, LOOK_AHEAD)
    vectors.look.y += 0.1
    camera.fov = CHASE_FOV
    camera.updateProjectionMatrix()
    camera.lookAt(vectors.look)
    vectors.smoothLook.copy(vectors.look)
    if(!reducedMotion){
      vectors.right.set(-vectors.heading.z,0,vectors.heading.x)
      camera.position.copy(vectors.point).addScaledVector(vectors.heading,low?-14:-15).addScaledVector(vectors.right,low?2:6)
      camera.position.y+=low?4.2:5.6
      vectors.look.copy(vectors.point).addScaledVector(vectors.right,low?0:-3.5);vectors.look.y+=.6
      camera.lookAt(vectors.look);vectors.smoothLook.copy(vectors.look)
    }
  }, [camera, scroll, vectors, low, reducedMotion])

  // Keep the existing native-scroll synchronisation before drei's damping.
  useFrame(() => {
    const distance = scrollDistance.current
    scroll.scroll.current = distance > 0 ? scroll.el.scrollTop / distance : 0
  }, -1)

  useFrame((_, delta) => {
    journeyPose(scroll.offset,journeyMotion.current.gateDrive,vectors.point,vectors.tangent)

    // Smooth only heading, so turns never alter the chase radius or focal length.
    // Account for real elapsed time after shader compilation; capping the
    // damping delta left the camera travelling behind already-updated UI.
    const alpha = reducedMotion?1:1 - Math.pow(1 - 0.08, Math.max(delta, 0) * 60)
    vectors.heading.lerp(vectors.tangent, alpha).normalize()
    vectors.right.set(-vectors.heading.z,0,vectors.heading.x)
    const shot=drivingShot(scroll.offset,low,reducedMotion,vectors.shot)
    vectors.position.copy(vectors.point).addScaledVector(vectors.heading,-shot[2]).addScaledVector(vectors.right,shot[0]);vectors.position.y+=shot[1]
    vectors.look.copy(vectors.point).addScaledVector(vectors.heading,shot[3]);vectors.look.y+=.5
    const fleetWeight = sceneBlend(scroll.offset, 'fleet'), serviceWeight = sceneBlend(scroll.offset, 'services')
    if (fleetWeight > 0) {
      vectors.position.lerp(poses.fleet, fleetWeight)
      vectors.look.lerp(poses.fleetLook, fleetWeight)
    }
    if (serviceWeight > 0) {
      const look = poses.servicesLook
      const pose = vectors.openingPoint.copy(poses.services)
      const index = services.findIndex(s => s.id === serviceId)
      if (index >= 0 && !reducedMotion) pose.sub(look).applyAxisAngle(vectors.up, (index - 1) * Math.PI / 18).add(look)
      vectors.position.lerp(pose,serviceWeight); vectors.look.lerp(look,serviceWeight)
    }
    const bookingWeight=sceneBlend(scroll.offset,'booking')
    const destinationWeight=sceneBlend(scroll.offset,'contact')
    if(bookingWeight>0) {
      const push=MathUtils.smoothstep(journeyMotion.current.gateDrive,.28,1)*2
      vectors.position.lerp(vectors.openingPoint.copy(poses.booking).addScaledVector(poses.gateForward,push),bookingWeight)
      vectors.look.lerp(poses.bookingLook,bookingWeight)
    }
    if(destinationWeight>0) {
      vectors.position.lerp(poses.contact,destinationWeight)
      vectors.look.lerp(poses.contactLook,destinationWeight)
    }
    opening.current.elapsed+=delta
    if(started)opening.current.release=transition.current.skip||reducedMotion?1:Math.min(1,opening.current.release+Math.min(delta,.1)/1.35)
    const release=MathUtils.smootherstep(opening.current.release,0,1)
    if(release<1&&scroll.offset<.02){
      const reveal=reducedMotion||low?1:MathUtils.smootherstep(Math.min(opening.current.elapsed/3,1),0,1)
      const distance=MathUtils.lerp(low?14:15,low?12:8.4,reveal),height=MathUtils.lerp(low?4.2:5.6,low?3.2:2.8,reveal)
      vectors.position.lerp(vectors.openingPoint.copy(vectors.point).addScaledVector(vectors.heading,-distance).addScaledVector(vectors.right,low?1.8:4.4).addScaledVector(vectors.up,height),1-release)
      vectors.look.lerp(vectors.openingPoint.copy(vectors.point).addScaledVector(vectors.right,low?0:-3.5).addScaledVector(vectors.up,low?3.4:.7),1-release)
    }
    if (!reducedMotion) {
      camera.position.lerp(vectors.position,alpha)
      vectors.smoothLook.lerp(vectors.look,alpha); camera.lookAt(vectors.smoothLook)
    } else {
      camera.position.copy(vectors.position); vectors.smoothLook.copy(vectors.look); camera.lookAt(vectors.look)
    }
    onScrollReady(scroll)
  })
  return null
}
