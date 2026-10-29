import {useMemo,useEffect} from 'react'
import {BufferGeometry,Float32BufferAttribute,Color} from 'three'
import {groundHeightAt} from './layout'

export default function CoastalBackdrop({low}){
 const ridges=useMemo(()=>Array.from({length:1},()=>{
  const positions=[],colors=[],indices=[],base=new Color('#77877b'),peak=new Color('#b6b8a8')
  const rows=low?46:92,columns=low?12:24
  for(let i=0;i<=rows;i++)for(let side=0;side<=columns;side++){
   const z=110-i/rows*460,x=-540+side/columns*360,height=groundHeightAt(x,z)
   positions.push(x,height,z)
   const tint=base.clone().lerp(peak,Math.max(height,0)/65);colors.push(tint.r,tint.g,tint.b)
   if(i<rows&&side<columns){const n=i*(columns+1)+side;indices.push(n,n+1,n+columns+1,n+1,n+columns+2,n+columns+1)}
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('color',new Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals()
  return geometry
 }),[low])
 useEffect(()=>()=>ridges.forEach(g=>g.dispose()),[ridges])
 return <group name="coastal-mountain-layers">{ridges.map((geometry,i)=><mesh key={i} geometry={geometry}><meshStandardMaterial vertexColors roughness={1}/></mesh>)}</group>
}
