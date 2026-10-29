import { servicesAnchorU } from '../showcase/layout'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Float32BufferAttribute, Object3D } from 'three'
import { frame, random, reserved, landHeight } from './layout'
import { getJourneyProgress, roadCurve } from '../Road'
import { landmarks } from '../../data/landmarks'
import {coastalRockGeometry,rockBottom} from './rockGeometry'
import Instances from './Instances'
import {rockTexture,terrainTextures} from './textures'
import RoadsideGrowth,{useWind,PalmImpostors} from './Vegetation'

export function crownGeometry(variant=0) {
  const leaves=variant===1?7:variant===2?11:9,reach=variant===1?.74:variant===2?.5:.6
  const positions = [], indices = []
  for (let leaf = 0; leaf < leaves; leaf++) {
    const angle = leaf * Math.PI * 2 / leaves, base = positions.length / 3
    for (let j = 0; j <= 5; j++) {
      const t = j / 5, radius = t * reach, y = Math.sin(t * Math.PI) * 0.14 - t * t * 0.16, width = Math.sin(t * Math.PI) * (variant===2?.11:.075)
      for (const side of [-1, 1]) positions.push(Math.cos(angle) * radius + Math.sin(angle) * width * side, y, Math.sin(angle) * radius - Math.cos(angle) * width * side)
      if (j < 5) { const a = base + j * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
    }
  }
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals(); return g
}

function Birds({ low, reducedMotion }) {
  const ref = useRef(), count = low ? 5 : 10
  const dummy = useMemo(() => new Object3D(), [])
  const geometry = useMemo(() => {
    const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 0.75, 0.06, 0.03, 0.35, 0, 0.25], 3)); g.computeVertexNormals(); return g
  }, [])
  useFrame(({ clock }) => {
    const time = reducedMotion ? 0 : clock.elapsedTime
    for (let i = 0; i < count; i++) for (let wing = 0; wing < 2; wing++) {
      dummy.position.set(8 + i * 3 + Math.sin(time * 0.08 + i) * 5, 9 + Math.sin(i * 4) * 2, 12 - i * 18 - Math.sin(time * 0.1 + i) * 6)
      dummy.rotation.set(0, wing ? Math.PI : 0, Math.sin(time * 2.4 + i) * 0.3 * (wing ? -1 : 1)); dummy.updateMatrix(); ref.current.setMatrixAt(i * 2 + wing, dummy.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} name="seagulls" args={[geometry, null, count * 2]} frustumCulled={false}><meshStandardMaterial color="#f5f2df" side={2} /></instancedMesh>
}

export default function CoastalProps({ low, reducedMotion, state }) {
  const bulbs = useRef()
  const rock=useMemo(()=>coastalRockGeometry(low?1:2),[low])
  const stone=useMemo(rockTexture,[]),stoneDetail=useMemo(terrainTextures,[])
  const data = useMemo(() => {
    const rng = random(), palms = [], crowns = [], shrubs = [], rocks = [], kerbs = [], leftKerbs = [], posts = [], rails = [], poles = [], arms = [], lamps = [], signs = []
    const length = roadCurve.getLength(), count = 210
    const pathSamples=Array.from({length:101},(_,i)=>roadCurve.getPointAt(i/100))
    for (let i = 0; i < count; i++) {
      const u = rng()
      // Check other segments too: curved roads can approach their own left bank.
      let lateral = -44 - rng() * 30
      let f = frame(u, lateral)
      for (let attempt = 0; attempt < 6; attempt++) {
        let nearest = Infinity
        for (const point of pathSamples) nearest = Math.min(nearest, point.distanceToSquared(f.p))
        if (nearest >= 42 * 42) break
        lateral -= 8; f = frame(u, lateral)
      }
      if (reserved(u, lateral)) continue
      const { p } = frame(u, lateral, landHeight(u, lateral)), h = 4.5 + rng() * 2, yaw = rng() * 6.28, lean = (rng() - 0.5) * 0.12
      const headlineBounds=[p.x-h*.7,p.y,p.z-h*.7,p.x+h*.7,p.y+h*1.2,p.z+h*.7]
      palms.push({ color:['#a28c63','#8b7556','#9b805c'][i%3],headlineBounds, position: [p.x, p.y + h / 2, p.z], rotation: [0, yaw, lean], scale: [0.13, h, 0.13] })
      crowns.push({ color:['#497b3d','#6b8a47','#3d6e43'][i%3],headlineBounds, position: [p.x - Math.sin(lean) * h / 2, p.y + h, p.z], rotation: [0, yaw, lean], scale: h })
    }
    for (let i = 0; i < 140; i++) {
      const u = rng(), lateral = -4.4 - rng() * 26
      if (reserved(u, lateral)) continue
      const { p } = frame(u, lateral, landHeight(u, lateral)); shrubs.push({ color:['#678d43','#859251','#52743e'][i%3],position: [p.x, p.y + 0.35, p.z], scale: [0.5 + rng(), 0.4 + rng() * 0.4, 0.5 + rng()] })
    }
    for (let i = 0; i < 88; i++) {
      const u = rng(), lateral = i < 8 ? 15 + rng() * 25 : 7 + rng() * 5
      if(reserved(u,lateral))continue
      const { p } = frame(u, lateral),rotation=[(rng()-.5)*.4,rng()*6.28,(rng()-.5)*.4],scale=[.7+rng()*1.5,.8+rng()*1.5,.7+rng()*1.5]
      p.y=landHeight(u,lateral)-rockBottom(rock,scale,rotation)-.18
      rocks.push({ position: p.toArray(), rotation, scale })
    }
    const destinationDistance=getJourneyProgress(landmarks.destination.t)*length
    const forkDistance = servicesAnchorU * length
    for (let d = 0; d < length; d += 2) {
      // Open the existing roadside furniture only across the two new mouths.
      if(d > forkDistance + 6.5 && d < forkDistance + 15.5) continue
      for (const side of [-1, 1]) { if(side<0&&d>destinationDistance-11&&d<destinationDistance+2)continue; const f = frame(d / length, side * 3.27, 0.04); (side < 0 ? leftKerbs : kerbs).push({ position: f.p.toArray(), rotation: [0, f.yaw, 0], scale: [side < 0 ? 0.126 : 0.18, 0.16, 1.92] }) }
      const f = frame(d / length, 3.62, landHeight(d/length,3.62)+.425-.02)
      posts.push({ position: f.p.toArray(), scale: [0.075, 0.85, 0.075] })
      rails.push({ position: [f.p.x, 0.74, f.p.z], rotation: [0, f.yaw, 0], scale: [0.09, 0.19, 2.06] })
    }
    for (let d = 14; d < length; d += 40) {
      if(Math.abs(d-destinationDistance)<18)continue
      const base=landHeight(d/length,-4),f = frame(d / length, -4, base+2.4)
      poles.push({ position: f.p.toArray(), scale: [0.07, 4.8, 0.07] })
      const head = f.p.clone().addScaledVector(f.right, 0.7)
      arms.push({ position: [head.x - f.right.x * 0.35, base+4.72, head.z - f.right.z * 0.35], rotation: [0, f.yaw, 0], scale: [1.4, 0.055, 0.06] })
      lamps.push({ position: [head.x, base+4.68, head.z], rotation: [0, f.yaw, 0], scale: [0.35, 0.08, 0.6] })
    }
    for (let d = 28; d < length; d += 56) { if(Math.abs(d-destinationDistance)<18)continue; const f = frame(d / length, -3.8, landHeight(d/length,-3.8)+1.6); signs.push({ position: f.p.toArray(), rotation: [0, f.yaw + Math.PI, 0] }) }
    const density=items=>low?items.filter((_,i)=>i%2===0):items
    return { palms:density(palms), crowns:density(crowns), shrubs:density(shrubs), rocks:density(rocks), kerbs, leftKerbs, posts, rails, poles, arms, lamps, signs }
  }, [low,rock])
  const crown = useMemo(()=>[0,1,2].map(crownGeometry), [])
  const wind=useWind(low,true),bushWind=useWind(low)
  const crownSets=useMemo(()=>[0,1,2].map(i=>data.crowns.filter((_,index)=>index%3===i)),[data.crowns])
  useFrame(() => { if (bulbs.current) bulbs.current.emissiveIntensity = 0.2 + state.night * 3 })
  return <group userData={{curveWindow:true}} name={low ? 'coastal-props-low' : 'coastal-props-desktop'}>
    <Instances headlineSafe far={60} name="palm-trunks" items={data.palms}><cylinderGeometry args={[0.65, 1, 1, 7, 3]} /><meshStandardMaterial color="#ffffff" roughness={1} /></Instances>
    {crownSets.map((items,i)=><Instances key={i} headlineSafe far={60} name={`palm-fronds-${i}`} items={items} geometry={crown[i]}><meshStandardMaterial onBeforeCompile={wind} color="#ffffff" roughness={.9} side={2}/></Instances>)}
    <PalmImpostors crowns={data.crowns} low={low}/><RoadsideGrowth low={low}/>
    <Instances headlineSafe name="shrubs" items={data.shrubs}><sphereGeometry args={[1,8,5]} /><meshStandardMaterial onBeforeCompile={bushWind} color="#ffffff" roughness={1} /></Instances>
    <Instances name="coastal-rocks" items={data.rocks} geometry={rock}><meshStandardMaterial map={stone} normalMap={stoneDetail.normalMap} vertexColors color="#ffffff" roughness={.94} /></Instances>
    <Instances name="kerbs" items={data.kerbs}><boxGeometry /><meshStandardMaterial color="#d4cab3" roughness={1} /></Instances>
    <Instances name="left-kerbs" items={data.leftKerbs}><boxGeometry /><meshStandardMaterial color="#b5ae9b" roughness={1} /></Instances>
    <Instances name="guard-posts" items={data.posts}><boxGeometry /><meshStandardMaterial color="#9ba7a4" metalness={0.35} roughness={0.6} /></Instances>
    <Instances name="guard-rail" items={data.rails}><boxGeometry /><meshStandardMaterial color="#b5beb5" metalness={0.45} roughness={0.5} /></Instances>
    <Instances headlineSafe name="lamp-poles" items={data.poles}><cylinderGeometry args={[1, 1, 1, 6]} /><meshStandardMaterial color="#34494a" /></Instances>
    <Instances headlineSafe name="lamp-arms" items={data.arms}><boxGeometry /><meshStandardMaterial color="#34494a" /></Instances>
    <Instances headlineSafe name="lamp-heads" items={data.lamps}><boxGeometry /><meshStandardMaterial ref={bulbs} color="#fff0c9" emissive="#ffb75a" /></Instances>
    <RoadSigns signs={data.signs} />
    <Birds low={low} reducedMotion={reducedMotion} />
  </group>
}

function RoadSigns({ signs }) {
  const maps = useMemo(() => ['curve', 'speed'].map(type => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const ctx = c.getContext('2d')
    ctx.fillStyle = type === 'curve' ? '#efbd5a' : '#f8f0da'; ctx.fillRect(0, 0, 128, 128)
    ctx.lineWidth = 9; ctx.strokeStyle = type === 'curve' ? '#343d3c' : '#cb5141'; ctx.strokeRect(5, 5, 118, 118)
    ctx.fillStyle = '#293e40'; ctx.font = 'bold 65px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(type === 'curve' ? '↱' : '50', 64, 88)
    return c
  }), [])
  // CanvasTexture is created once per sign style; the faces are instanced.
  return <group>
    <Instances headlineSafe name="sign-posts" items={signs.map(s => ({ position: [s.position[0], s.position[1]-.7, s.position[2]], scale: [0.045, 1.8, 0.045] }))}><cylinderGeometry args={[1, 1, 1, 6]} /><meshStandardMaterial color="#8a9891" /></Instances>
    {maps.map((c, i) => <Instances key={i} headlineSafe name={`road-sign-${i}`} items={signs.filter((_, j) => j % 2 === i)}><planeGeometry args={[0.7, 0.7]} /><meshStandardMaterial side={2}><canvasTexture attach="map" args={[c]} /></meshStandardMaterial></Instances>)}
  </group>
}
