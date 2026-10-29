import {useMemo,useEffect} from 'react'
import {BufferGeometry,Float32BufferAttribute,Color} from 'three'
import {groundHeightAt} from './layout'

export default function CoastalBackdrop({low}){
 const ridges=useMemo(()=>Array.from({length:3},(_,layer)=>{
  const positions=[],colors=[],indices=[],base=new Color(['#647e79','#6f8494','#9094ad'][layer]),peak=new Color('#bac2c2')
  const rows=low?32:64,columns=low?6:10
  for(let i=0;i<=rows;i++)for(let side=0;side<=columns;side++){
   const z=180-i/rows*640,x=-180-side/columns*155-layer*115
   const crest=Math.pow(Math.abs(Math.sin(z*.018+layer*2.1)+.3*Math.sin(z*.043)),1.25)
   const height=groundHeightAt(x,z)+(side/columns)*(16+crest*(20+layer*9))
   positions.push(x,height,z)
   const tint=base.clone().lerp(peak,Math.min(.55,Math.max(height,0)/150));colors.push(tint.r,tint.g,tint.b)
   if(i<rows&&side<columns){const n=i*(columns+1)+side;indices.push(n,n+columns+1,n+1,n+1,n+columns+1,n+columns+2)}
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('color',new Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry
 }),[low])
 useEffect(()=>()=>ridges.forEach(g=>g.dispose()),[ridges])
 return <group name="coastal-mountain-layers">{ridges.map((geometry,i)=><mesh key={i} geometry={geometry}><meshStandardMaterial vertexColors roughness={1} color={['#b2c0b6','#bbc2d0','#c4c3d8'][i]}/></mesh>)}</group>
}
