import { useMemo, useRef } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { landmarks } from '../../data/landmarks'
import { getJourneyProgress } from '../Road'
import { frame } from './layout'
import { servicesAnchorU } from '../showcase/layout'
import useSceneVisibility from '../showcase/useSceneVisibility'

const scenes={fleetBay:'fleet',servicesFork:'services',tollGate:'booking',destination:'contact'}
export default function LandmarkMarkers() {
  return Object.entries(landmarks).map(([id,anchor])=><Marker key={id} id={id} anchor={anchor}/>)
}
function Marker({id,anchor}) {
  const root=useRef(),f=frame(id==='servicesFork'?servicesAnchorU:getJourneyProgress(anchor.t),-4.8,.55)
  useSceneVisibility(root,scenes[id])
  return <group ref={root} visible={false} name={`landmark-${id}`} position={f.p.toArray()}>
    <mesh><boxGeometry args={[.45,1.1,.45]}/><meshStandardMaterial color="#eb8b35"/></mesh>
    <Label text={`${anchor.label} · ${anchor.t}`}/>
  </group>
}

function Label({ text }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 48
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff0d9'; ctx.fillRect(0, 0, 256, 48)
    ctx.fillStyle = '#263844'; ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, 128, 31)
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t
  }, [text])
  return <sprite position={[0, 1.1, 0]} scale={[2.5, 0.47, 1]}><spriteMaterial map={texture} /></sprite>
}
