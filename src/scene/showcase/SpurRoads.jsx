import { useMemo } from 'react'
import { CatmullRomCurve3, DoubleSide, Float32BufferAttribute, MathUtils, Vector3 } from 'three'
import { createRibbon, roadCurve, ROAD_WIDTH } from '../Road'
import { servicesFrame, servicesAnchorU } from './layout'
import { asphaltTextures } from '../world/textures'
import Instances from '../world/Instances'

const WIDTH = 4.2
function local(point) { return point.sub(servicesFrame.p).applyAxisAngle(new Vector3(0,1,0),-servicesFrame.yaw) }
function buildSpurs(compact) {
  const mainLength = roadCurve.getLength(), anchor = servicesAnchorU
  const main = Array.from({length:401},(_,i)=>local(roadCurve.getPointAt(i/400)))
  const distanceToMain = p => Math.sqrt(main.reduce((distance,point)=>Math.min(distance,(p.x-point.x)**2+(p.z-point.z)**2),Infinity))
  const kerbs = [], arrows = [], roads = [], edges = []
  for(const side of [-1,1]) {
    const start = local(roadCurve.getPointAt(anchor+4/mainLength))
    const follow = local(roadCurve.getPointAt(anchor+7/mainLength))
    const tangent = roadCurve.getTangentAt(anchor+7/mainLength).applyAxisAngle(new Vector3(0,1,0),-servicesFrame.yaw)
    const curve = new CatmullRomCurve3([start,follow,follow.clone().addScaledVector(tangent,3).add(new Vector3(side*3,0,0)),new Vector3(side*(compact?6.5:10),0,15),new Vector3(side*(compact?9:14),0,21)])
    curve.arcLengthDivisions=1200
    const elevation=side<0?.006:.007
    const road=createRibbon(WIDTH,[{start:0,end:1,segments:200}],0,elevation,curve)
    const alpha=[]
    for(let i=0;i<=200;i++)for(let j=0;j<2;j++)alpha.push(1,1,1,MathUtils.smoothstep(i/200,0,.23))
    road.setAttribute('color',new Float32BufferAttribute(alpha,4));roads.push(road)
    const length=curve.getLength()
    for(const edgeSide of [-1,1]) {
      const offset=edgeSide*(WIDTH/2-.04),ranges=[]
      let first=null
      for(let i=0;i<=200;i++) {
        const u=i/200,p=curve.getPointAt(u),t=curve.getTangentAt(u),right=new Vector3(-t.z,0,t.x).normalize()
        p.addScaledVector(right,offset)
        const outside=distanceToMain(p)>ROAD_WIDTH/2+.08
        if(outside&&first===null)first=u
        if(first!==null&&(!outside||i===200)){const end=outside?u:(i-1)/200;if(end>first)ranges.push({start:first,end,segments:Math.max(2,Math.ceil((end-first)*200))});first=null}
      }
      if(ranges.length)edges.push(createRibbon(.045,ranges,offset,elevation+.012,curve))
      for(let d=0;d<length;d+=.8) {
        const u=d/length,p=curve.getPointAt(u),t=curve.getTangentAt(u),right=new Vector3(-t.z,0,t.x).normalize()
        p.addScaledVector(right,edgeSide*(WIDTH/2+.07));p.y=.065
        if(distanceToMain(p)>ROAD_WIDTH/2+.22)kerbs.push({position:p.toArray(),rotation:[0,Math.atan2(t.x,t.z),0],scale:[.14,.12,.81]})
      }
    }
    const p=curve.getPointAt(.58),t=curve.getTangentAt(.58);arrows.push({position:[p.x,.085,p.z],rotation:[Math.PI/2,0,-Math.atan2(t.x,t.z)]})
  }
  return {roads,edges,kerbs,arrows}
}
export default function SpurRoads({ compact }) {
  const data=useMemo(()=>buildSpurs(compact),[compact]),textures=useMemo(asphaltTextures,[])
  const arrow=useMemo(()=>new Float32Array([-.18,-1,0,.18,-1,0,.18,.3,0,-.18,-1,0,.18,.3,0,-.18,.3,0,-.65,.3,0,.65,.3,0,0,1.1,0]),[])
  return <group name="service-spur-roads">
    {data.roads.map((geometry,i)=><mesh key={i} name={`spur-asphalt-${i}`} geometry={geometry}><meshStandardMaterial {...textures} vertexColors transparent depthWrite={false} roughness={.95} /></mesh>)}
    {data.edges.map((geometry,i)=><mesh key={i} name={`spur-edge-${i}`} geometry={geometry}><meshBasicMaterial color="#fff1d6" /></mesh>)}
    <Instances name="spur-kerbs" items={data.kerbs}><boxGeometry /><meshStandardMaterial color="#c9c0a9" roughness={1} /></Instances>
    <Instances name="fork-direction-arrows" items={data.arrows}><bufferGeometry><bufferAttribute attach="attributes-position" args={[arrow,3]} /></bufferGeometry><meshBasicMaterial color="#ffce7b" toneMapped={false} side={DoubleSide} /></Instances>
  </group>
}
