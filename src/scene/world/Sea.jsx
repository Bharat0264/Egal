import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, BufferGeometry, Float32BufferAttribute, CanvasTexture } from 'three'
import { createRibbon } from '../Road'
import { frame } from './layout'
import Instances from './Instances'
import {waterNormalTextures} from './textures'
import {terrainSurface} from './layout'

let depthMap
function shorelineDepth(){if(depthMap)return depthMap;const c=document.createElement('canvas');c.width=128;c.height=256;const ctx=c.getContext('2d'),data=ctx.createImageData(128,256);for(let y=0;y<256;y++)for(let x=0;x<128;x++){const distance=terrainSurface.sample(-40+x/127*520,-680+(1-y/255)*1100).lateral;const value=Math.min(255,Math.max(0,(distance-10.5)/75*255));data.data.set([value,value,value,255],(y*128+x)*4)}ctx.putImageData(data,0,0);return depthMap=new CanvasTexture(c)}
export default function Sea({ low, reducedMotion, state }) {
  const seaMaterial = useRef(), foamMaterial = useRef()
  const normalMaps=useMemo(waterNormalTextures,[]),depth=useMemo(shorelineDepth,[])
  const uniforms = useMemo(() => ({ normalA:{value:normalMaps[0]},normalB:{value:normalMaps[1]},shoreDepth:{value:depth},shallow:{value:new Color('#19ada9')},deep:{value:new Color('#06446f')}, time: { value: 0 }, detail: { value: low ? 0 : 1 }, water: { value: new Color('#278b99') }, horizon: { value: new Color() }, sunDirection: { value: state.sunDirection }, fogDensity: { value: .0038 }, fogFar: { value: 300 } }), [state, low])
  useFrame(({ clock, scene }) => {
    for (let i=0;i<2;i++) {
      const material=i===0?seaMaterial.current:foamMaterial.current
      const current = material.uniforms
      current.time.value = reducedMotion ? 0 : clock.elapsedTime
      current.detail.value = low ? 0 : 1
      current.water.value.copy(state.water); current.horizon.value.copy(state.horizon)
      current.sunDirection.value.copy(state.sunDirection)
      current.fogDensity.value=scene.fog.density;current.fogFar.value=300
    }
  })
  const shore = useMemo(() => createRibbon(2.1, [{ start: 0, end: 1, segments: 400 }], 10.1, -2.12), [])
  return <group name="sea-and-shore">
    <mesh position={[220, -2.25, -130]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[520, 1100, low ? 8 : 40, low ? 12 : 60]} />
      <shaderMaterial ref={seaMaterial} uniforms={uniforms} toneMapped={false} vertexShader={`
        uniform float time; varying vec3 vWorld; varying float vDepth;
        void main(){ vec3 p=position; p.z += sin(p.x*.13+time*.6)*.07+cos(p.y*.19+time*.4)*.045;
          vec4 world=modelMatrix*vec4(p,1.); vWorld=world.xyz; vec4 mv=viewMatrix*world; vDepth=-mv.z; gl_Position=projectionMatrix*mv; }
      `} fragmentShader={`
        uniform sampler2D normalA;uniform sampler2D normalB;uniform sampler2D shoreDepth;uniform vec3 shallow;uniform vec3 deep;uniform float time; uniform float detail; uniform vec3 water; uniform vec3 horizon; uniform vec3 sunDirection; uniform float fogDensity; uniform float fogFar;
        varying vec3 vWorld; varying float vDepth;
        void main(){
          vec2 uv=vWorld.xz*.075+vec2(time*.008,-time*.011);
          vec2 flow=texture2D(normalA,uv).rg*2.-1.;if(detail>.5)flow+=texture2D(normalB,vWorld.xz*.12+vec2(-time*.006,time*.009)).rg*2.-1.;
          vec3 n=normalize(vec3(flow.x*.25,1.,flow.y*.25));vec3 view=normalize(cameraPosition-vWorld);
          float a=.5+flow.x*.2,b=.5+flow.y*.2;
          float glint=pow(max(dot(reflect(-normalize(sunDirection),n),view),0.),75.);
          vec2 sunAxis=normalize(sunDirection.xz), viewAxis=normalize(vWorld.xz-cameraPosition.xz);
          float streak=pow(max(dot(sunAxis,viewAxis),0.),65.)*(.82+.18*sin(uv.x*.7+uv.y*.9))*exp(-abs(view.y-sunDirection.y)*3.5);
          float ripple=(a+b-1.)*.06; float fresnel=pow(1.-max(dot(n,view),0.),3.);
          float coast=texture2D(shoreDepth,vec2((vWorld.x+40.)/520.,(vWorld.z+680.)/1100.)).r;vec3 depthColor=mix(shallow,mix(deep,water,.3),smoothstep(0.,.8,coast));
          vec3 c=mix(depthColor+vec3(ripple),horizon,fresnel*.28)+vec3(1.,.65,.24)*(glint*.55+streak*.34);
          c=mix(c,horizon,(1.-exp(-fogDensity*fogDensity*vDepth*vDepth))*smoothstep(35.,110.,vDepth)); gl_FragColor=vec4(c,1.);
          #include <colorspace_fragment>
        }
      `} />
    </mesh>
    <mesh geometry={shore}><shaderMaterial ref={foamMaterial} transparent depthWrite={false} uniforms={uniforms} vertexShader={`varying vec2 vUv; varying float depth; void main(){vUv=uv; vec4 p=modelViewMatrix*vec4(position,1.);depth=-p.z;gl_Position=projectionMatrix*p;}`} fragmentShader={`
      uniform float time; uniform float fogFar; varying vec2 vUv; varying float depth;
      void main(){float wave=sin(vUv.y*3.-time*.7)*.045+sin(vUv.y*11.+time)*.016;float ribbon=1.-smoothstep(.015,.09,abs(vUv.x-2.525-wave));float alpha=ribbon*(.5+.15*sin(vUv.y*23.-time))*(1.-smoothstep(50.,fogFar,depth));gl_FragColor=vec4(.89,.96,.9,alpha);}
    `} /></mesh>
    <Sailboats time={uniforms.time}/>
  </group>
}

function Sailboats({time}) {
  const bob=useMemo(()=>shader=>{shader.uniforms.boatTime=time;shader.vertexShader='uniform float boatTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\ntransformed.y+=sin(boatTime*.75+instanceMatrix[3].x*.17+instanceMatrix[3].z*.05)*.07/max(length(instanceMatrix[1].xyz),.01);`)},[time])
  const data = useMemo(() => [0.12, 0.34, 0.55, 0.73].map((u, i) => {
    const f = frame(u, 30 + i % 2 * 26, -2.05)
    return { position: f.p.toArray(), rotation: [0, i * 1.2, 0], scale: 0.7 + i * 0.15 }
  }), [])
  const sail = useMemo(() => {
    const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute([0, 0.3, -1, 0, 3.6, 0, 0, 0.3, 0.95], 3)); g.computeVertexNormals(); return g
  }, [])
  return <group>
    <Instances name="boat-hulls" items={data.map(s => ({ ...s, scale: [s.scale * 0.48, s.scale * 0.22, s.scale * 1.5] }))}><sphereGeometry args={[1, 6, 3]} /><meshStandardMaterial onBeforeCompile={bob} color="#e3d2ad" roughness={0.7} /></Instances>
    <Instances name="boat-sails" items={data} geometry={sail}><meshStandardMaterial onBeforeCompile={bob} color="#fff4db" side={2} /></Instances>
    <Instances name="boat-masts" items={data.map(s => ({ ...s, position: [s.position[0], s.position[1] + 1.7 * s.scale, s.position[2]], scale: [0.025, 3.5 * s.scale, 0.025] }))}><cylinderGeometry args={[1, 1, 1, 5]} /><meshStandardMaterial onBeforeCompile={bob} color="#6a6250" /></Instances>
  </group>
}
