import {useMemo,useEffect} from 'react'
import {BufferGeometry,Float32BufferAttribute,MathUtils} from 'three'
import {terrainSurface} from './layout'
import {createRibbon,ROAD_WIDTH} from '../Road'
import {gravelTexture,terrainTextures,terrainBiomeAtlas} from './textures'

export default function Terrain(){
 const gravel=useMemo(gravelTexture,[]),detail=useMemo(terrainTextures,[]),atlas=useMemo(terrainBiomeAtlas,[])
 const geometry=useMemo(()=>{
  const positions=[],uvs=[],indices=[],weights=[],wet=[],rows=184,columns=116
  for(let i=0;i<=rows;i++)for(let j=0;j<=columns;j++){
   const x=-180+j/columns*290,z=110-i/rows*460,{height,lateral}=terrainSurface.sample(x,z)
   positions.push(x,height,z);uvs.push(x/3,z/3);wet.push(MathUtils.smoothstep(-height,.8,2.25)*MathUtils.smoothstep(lateral,6,9))
   weights.push(lateral)
   if(i<rows&&j<columns){const a=i*(columns+1)+j;indices.push(a,a+1,a+columns+1,a+1,a+columns+2,a+columns+1)}
  }
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setAttribute('uv',new Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals()
  const normals=g.attributes.normal,biomes=[],colors=[]
  for(let i=0;i<weights.length;i++){
   const x=positions[i*3],y=positions[i*3+1],z=positions[i*3+2],slope=1-Math.abs(normals.getY(i)),sand=MathUtils.smoothstep(weights[i],5.8,8),dirt=Math.min(.85,slope*2.5)*(1-sand),dry=(.2+.22*Math.sin(x*.025+z*.013))*(1-sand-dirt),grass=Math.max(0,1-sand-dirt-dry)
   biomes.push(grass,dry,dirt,sand)
   let curvature=0,count=0;for(const offset of[-1,1,-(columns+1),columns+1])if(i+offset>=0&&i+offset<weights.length){curvature+=positions[(i+offset)*3+1]-y;count++}
   const ao=1-Math.min(.18,Math.max(0,curvature/Math.max(count,1))*.09)-slope*.08,variation=.94+.06*Math.sin(x*.19+z*.1),light=ao*variation*(1-wet[i]*.3)
   colors.push(light,light,light)
  }
  g.setAttribute('biome',new Float32BufferAttribute(biomes,4));g.setAttribute('wetness',new Float32BufferAttribute(wet,1));g.setAttribute('color',new Float32BufferAttribute(colors,3));return g
 },[])
 const shade=useMemo(()=>shader=>{
  shader.vertexShader='attribute vec4 biome;attribute float wetness;varying vec4 vBiome;varying float vWet;\n'+shader.vertexShader
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBiome=biome;vWet=wetness;')
  shader.fragmentShader='varying vec4 vBiome;varying float vWet;\n'+shader.fragmentShader
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec2 tile=fract(vMapUv)*.44+.03;vec2 dx=dFdx(vMapUv)*.44,dy=dFdy(vMapUv)*.44;
 vec4 terrainColor=textureGrad(map,tile,dx,dy)*vBiome.x+textureGrad(map,tile+vec2(.5,0.),dx,dy)*vBiome.y+textureGrad(map,tile+vec2(0.,.5),dx,dy)*vBiome.z+textureGrad(map,tile+vec2(.5,.5),dx,dy)*vBiome.w;
 diffuseColor*=terrainColor;`)
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.33,vWet);')
 },[])
 const shoulders=useMemo(()=>[-1,1].map(side=>createRibbon(.75,[{start:0,end:1,segments:400}],side*(ROAD_WIDTH/2+.375),-.016)),[])
 useEffect(()=>()=>{geometry.dispose();for(const g of shoulders)g.dispose()},[geometry,shoulders])
 return <group name="coastal-terrain"><mesh name="continuous-ground" geometry={geometry}><meshStandardMaterial map={atlas} normalMap={detail.normalMap} onBeforeCompile={shade} vertexColors roughness={.97}/></mesh>{shoulders.map((g,i)=><mesh key={i} geometry={g}><meshStandardMaterial map={gravel} roughness={1}/></mesh>)}</group>
}
