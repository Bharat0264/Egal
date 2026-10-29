import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import { sections } from '../../data/sections'
import { cars } from '../../data/cars'
import { MathUtils } from 'three'
import { textOpacity } from './sceneWindows'
import { useSelection } from '../../state/SelectionContext'
import {track} from '../../lib/analytics'
const sceneIds=['fleet','services','booking','contact']

export default function SceneCoordinator() {
  const scroll = useScroll(), previous = useRef({ bucket: -1, offset: 0 })
  const { scrollSelect, setServiceId, serviceId,journeyMotion, bookingStatus, bookingAt, resetBooking } = useSelection()
  const [start, end] = sections.find(s => s.id === 'fleet').range
  const reached=useRef(new Set())
  useFrame((_,delta) => {
    const offset = scroll.offset
    for(const id of sceneIds)if(textOpacity(offset,id)>.5&&!reached.current.has(id)){reached.current.add(id);track('scene_reached',{scene:id})}
    if(bookingStatus==='success' && (offset < Math.min(.8,bookingAt)-.012 || offset < previous.current.offset-.0001))resetBooking()
    journeyMotion.current.gateDrive=MathUtils.damp(journeyMotion.current.gateDrive,bookingStatus==='success'?1:0,bookingStatus==='success'?1.3:10,Math.min(delta,.1))
    const bucket = offset >= start && offset < end ? Math.min(cars.length - 1, Math.floor((offset - start) / (end - start) * cars.length)) : -1
    if (bucket !== previous.current.bucket && bucket >= 0) scrollSelect(bucket)
    if (serviceId!==null&&(Math.abs(offset - previous.current.offset) > .00001 || textOpacity(offset,'services')===0))setServiceId(null)
    previous.current.offset=offset;previous.current.bucket=bucket
  })
  return null
}
