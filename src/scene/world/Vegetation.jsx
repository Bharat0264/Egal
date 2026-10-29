import {useMemo} from 'react'
import {useFrame} from '@react-three/fiber'
import {BufferGeometry,Float32BufferAttribute,CanvasTexture,SRGBColorSpace} from 'three'
import Instances from './Instances'
import {frame,landHeight,random,reserved} from './layout'

export function useWind(low=false,canopy=false,billboard=false){
 const uniforms=useMemo(()=>({time:{value:0},strength:{value:low?.025:.055},canopy:{value:canopy?1:0}}),[low,canopy])
 useFrame((_,delta)=>{uniforms.time.value+=Math.min(delta,.1)})
 return useMemo(()=>shader=>{
  shader.uniforms.plantTime=uniforms.time;shader.uniforms.plantStrength=uniforms.strength;shader.uniforms.plantCanopy=uniforms.canopy
  shader.vertexShader='uniform float plantTime;uniform float plantStrength;uniform float plantCanopy;\n'+shader.vertexShader
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 float plantPhase=0.;
 #ifdef USE_INSTANCING
 plantPhase=instanceMatrix[3].x*.17+instanceMatrix[3].z*.11;
 #endif
 float plantAnchor=mix(max(position.y,0.),length(position.xz),plantCanopy);
 transformed.x+=sin(plantTime*.85+plantPhase)*plantAnchor*plantStrength;
 transformed.z+=cos(plantTime*.63+plantPhase)*plantAnchor*plantStrength*.4;`)
  if(billboard)shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);vec2 extent=vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));vec4 mvPosition=center+vec4(transformed.xy*extent,0.,0.);gl_Position=projectionMatrix*mvPosition;`)
 },[uniforms,billboard])
}
let palmMap
function palmTexture(){
 if(palmMap)return palmMap
 const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d')
 ctx.strokeStyle='#776043';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(62,122);ctx.quadraticCurveTo(69,74,61,36);ctx.stroke()
 for(let i=0;i<11;i++){const a=i/11*Math.PI*2;ctx.strokeStyle=i%2?'#4e793c':'#345c37';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(61,36);ctx.quadraticCurveTo(61+Math.cos(a)*29,21+Math.sin(a)*8,61+Math.cos(a)*49,38+Math.sin(a)*21);ctx.stroke()}
 palmMap=new CanvasTexture(c);palmMap.colorSpace=SRGBColorSpace;return palmMap
}
export function PalmImpostors({crowns,low}){
 const map=useMemo(palmTexture,[]),wind=useWind(low,true,true)
 const items=useMemo(()=>crowns.map(p=>{const h=p.scale;return{position:[p.position[0],p.position[1]-h*.4,p.position[2]],scale:[h*1.3,h*1.3,1],color:p.color}}),[crowns])
 return <Instances headlineSafe name="distant-palm-impostors" near={60} items={items}><planeGeometry/><meshBasicMaterial map={map} onBeforeCompile={wind} alphaTest={.35} side={2} color="#ffffff"/></Instances>
}
export default function RoadsideGrowth({low}){
 const wind=useWind(low),data=useMemo(()=>{
  const r=random(935),grass=[],flowers=[]
  for(let i=0;i<(low?350:700);i++){
   const u=r(),lateral=-3.7-Math.pow(r(),2.4)*10;if(reserved(u,lateral))continue
   const f=frame(u,lateral,landHeight(u,lateral)),item={position:f.p.toArray(),rotation:[0,r()*6.28,0],scale:.35+r()*.65,color:['#68873c','#849448','#547a3d','#a3a15e'][i%4]};grass.push(item)
   if(i%9===0)flowers.push({...item,scale:.24+r()*.2,color:['#e9c78b','#f0e2b7','#d9a28f'][Math.floor(i/9)%3]})
  }return{grass,flowers}
 },[low])
 const blade=useMemo(()=>{const p=[];for(let i=0;i<5;i++){const a=i*2.4,x=Math.cos(a),z=Math.sin(a),bx=x*.13,bz=z*.13,w=.025,mx=bx+x*.04,mz=bz+z*.04,tx=bx+x*.17,tz=bz+z*.17,h=.65+i*.045;p.push(bx-x*w,0,bz-z*w,bx+x*w,0,bz+z*w,mx+x*w*.6,h*.55,mz+z*w*.6,bx-x*w,0,bz-z*w,mx+x*w*.6,h*.55,mz+z*w*.6,mx-x*w*.6,h*.55,mz-z*w*.6,mx-x*w*.6,h*.55,mz-z*w*.6,mx+x*w*.6,h*.55,mz+z*w*.6,tx,h,tz)}const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(p,3));g.computeVertexNormals();return g},[])
 const flower=useMemo(()=>{const p=[-.025,0,0,.025,0,0,0,.8,0];for(let i=0;i<5;i++){const a=i*6.28/5,b=a+1.25;p.push(0,.8,0,Math.cos(a)*.23,.8+Math.sin(a)*.23,.02,Math.cos(b)*.23,.8+Math.sin(b)*.23,.02)}const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(p,3));g.computeVertexNormals();return g},[])
 return <><Instances name="roadside-grass-tufts" far={60} items={data.grass} geometry={blade}><meshStandardMaterial onBeforeCompile={wind} side={2} roughness={1}/></Instances><Instances name="small-coastal-flowers" far={45} items={data.flowers} geometry={flower}><meshStandardMaterial onBeforeCompile={wind} side={2} roughness={1}/></Instances></>
}
