import {useMemo,useRef,useEffect} from 'react'
import {useFrame} from '@react-three/fiber'
import {BoxGeometry,CylinderGeometry,Float32BufferAttribute,BufferGeometry,Matrix4,Object3D,Vector3,Color} from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {roadCurve,getJourneyProgress} from '../Road'
import {landmarks} from '../../data/landmarks'
import {frame,writeFrame,landHeight,groundHeightAt,random,reserved} from './layout'
import {roadsideMarkerTexture,kilometreTexture,windowTexture} from './textures'
import Instances from './Instances'

function Traffic({low}){
 const ref=useRef(),dummy=useMemo(()=>new Object3D(),[]),f=useMemo(()=>({p:new Vector3(),tangent:new Vector3(),right:new Vector3()}),[]),length=roadCurve.getLength(),time=useRef(0)
 const geometry=useMemo(()=>{
  const parts=[]
  const add=(g,x,y,z,sx,sy,sz,color,rotate=0)=>{g.rotateZ(rotate);g.applyMatrix4(new Matrix4().makeScale(sx,sy,sz));g.translate(x,y,z);const c=new Color(color),colors=[];for(let i=0;i<g.attributes.position.count;i++)colors.push(c.r,c.g,c.b);g.setAttribute('color',new Float32BufferAttribute(colors,3));parts.push(g.toNonIndexed());g.dispose()}
  add(new BoxGeometry(),0,.56,0,1.25,.43,2.85,'#e8e3d3');add(new BoxGeometry(),0,.92,-.12,1.05,.48,1.4,'#263d47')
  for(const x of[-.58,.58])for(const z of[-.86,.86])add(new CylinderGeometry(1,1,1,8),x,.25,z,.13,.25,.25,'#172020',Math.PI/2)
  for(const x of[-.4,.4]){add(new BoxGeometry(),x,.58,1.44,.26,.12,.03,'#fff1b5');add(new BoxGeometry(),x,.58,-1.44,.24,.1,.03,'#cb543b')}
  const g=mergeGeometries(parts);for(const p of parts)p.dispose();return g
 },[])
 useEffect(()=>{const colors=['#9daabd','#e2c3a2','#b8c6b0','#93b4bd'];for(let i=0;i<(low?2:4);i++)ref.current.setColorAt(i,new Color(colors[i]));ref.current.instanceColor.needsUpdate=true;return()=>geometry.dispose()},[geometry,low])
 useFrame((_,delta)=>{
  time.current+=Math.min(delta,.1)
  for(let i=0;i<(low?2:4);i++){
   const u=((.12+i*.23-time.current*2.4/length)%1+1)%1;writeFrame(u,1.72,0,f)
   dummy.position.copy(f.p);dummy.rotation.set(0,Math.atan2(f.tangent.x,f.tangent.z)+Math.PI,0);dummy.scale.setScalar(1);dummy.updateMatrix();ref.current.setMatrixAt(i,dummy.matrix)
  }ref.current.instanceMatrix.needsUpdate=true
 })
 return <instancedMesh ref={ref} name="oncoming-traffic" geometry={geometry} args={[null,null,low?2:4]} frustumCulled={false}><meshStandardMaterial vertexColors roughness={.5} metalness={.12}/></instancedMesh>
}
export default function RoadLife({low,state}){
 const windows=useMemo(windowTexture,[]),marker=useMemo(roadsideMarkerTexture,[]),km=useMemo(kilometreTexture,[]),townMaterial=useRef()
 const data=useMemo(()=>{
  const posts=[],stones=[],poles=[],crossarms=[],insulators=[],wires=[],buildings=[],roofs=[],r=random(765),length=roadCurve.getLength(),linePoles=[],clearance=u=>reserved(u,5.8)||Math.abs(u-getJourneyProgress(landmarks.tollGate.t))*length<18
  for(let d=8;d<length;d+=12){const u=d/length;if(reserved(u,-3.5))continue;const f=frame(u,-3.5,landHeight(u,-3.5)+.38);posts.push({position:f.p.toArray(),rotation:[0,f.yaw,0],scale:[.1,.75,.09]})}
  for(let d=38;d<length;d+=65){const u=d/length;if(reserved(u,-4))continue;const f=frame(u,-4,landHeight(u,-4)+.3);stones.push({position:f.p.toArray(),rotation:[0,f.yaw,0],scale:[.38,.6,.25]})}
  for(let d=5;d<length;d+=45){const u=d/length;if(clearance(u))continue;const f=frame(u,5.8,landHeight(u,5.8)),top=f.p.clone().add(new Vector3(0,6.4,0));poles.push({position:[f.p.x,f.p.y+3.2,f.p.z],scale:[.085,6.4,.085]});crossarms.push({position:top.toArray(),rotation:[0,f.yaw,0],scale:[2,.09,.09]});for(const side of[-.8,0,.8]){const p=top.clone().addScaledVector(f.right,side);insulators.push({position:[p.x,p.y+.1,p.z],scale:[.06,.2,.06]})}linePoles.push({top,right:f.right,u})}
  for(let i=1;i<linePoles.length;i++)if(![0,.25,.5,.75,1].some(t=>clearance(linePoles[i-1].u+(linePoles[i].u-linePoles[i-1].u)*t)))for(const side of[-.8,0,.8])for(let step=0;step<8;step++)for(const k of[step,step+1]){const t=k/8,a=linePoles[i-1],b=linePoles[i],p=a.top.clone().addScaledVector(a.right,side).lerp(b.top.clone().addScaledVector(b.right,side),t);p.y+=.16-Math.sin(t*Math.PI)*.65;wires.push(p.x,p.y,p.z)}
  const origin=frame(.58,-85).p
  for(let i=0;i<(low?8:16);i++){const x=origin.x+(i%4-1.5)*5,z=origin.z+Math.floor(i/4)*6,y=groundHeightAt(x,z),height=2+r()*2;buildings.push({position:[x,y+height/2,z],scale:[3.5,height,3.7],color:['#b9b19a','#a8b6a8','#c5b293'][i%3]});roofs.push({position:[x,y+height+.5,z],rotation:[0,Math.PI/4,0],scale:[2.9,1.3,3.1]})}
  const wire=new BufferGeometry();wire.setAttribute('position',new Float32BufferAttribute(wires,3));return{posts,stones,poles,crossarms,insulators,wire,buildings,roofs}
 },[low])
 useEffect(()=>()=>data.wire.dispose(),[data])
 useFrame(()=>{townMaterial.current.emissiveIntensity=.04+state.night*1.5})
 return <group name="coastal-road-life" userData={{curveWindow:true}}>
  <Instances name="reflector-posts" items={data.posts}><boxGeometry/><meshStandardMaterial map={marker} roughness={.8}/></Instances>
  <Instances name="kilometre-stones" items={data.stones}><boxGeometry/><meshStandardMaterial map={km} roughness={1}/></Instances>
  <Instances headlineSafe name="timber-power-poles" items={data.poles}><cylinderGeometry args={[.75,1,1,7]}/><meshStandardMaterial color="#756447" roughness={1}/></Instances>
  <Instances headlineSafe name="power-crossarms" items={data.crossarms}><boxGeometry/><meshStandardMaterial color="#615b48"/></Instances>
  <Instances headlineSafe name="power-insulators" items={data.insulators}><cylinderGeometry args={[1,1,1,6]}/><meshStandardMaterial color="#9eaaa0" roughness={.4}/></Instances>
  <lineSegments name="sagging-power-wires" geometry={data.wire}><lineBasicMaterial color="#383e36" transparent opacity={.55}/></lineSegments>
  <Instances name="distant-town-windows" items={data.buildings}><boxGeometry/><meshStandardMaterial ref={townMaterial} map={windows} emissiveMap={windows} emissive="#ffc784" roughness={.9}/></Instances>
  <Instances name="distant-town-roofs" items={data.roofs}><coneGeometry args={[1,1,4]}/><meshStandardMaterial color="#786a58" roughness={1}/></Instances>
  <Traffic low={low}/>
 </group>
}
