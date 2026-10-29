import {IcosahedronGeometry,Vector3,Euler,Color,Float32BufferAttribute} from 'three'
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js'

export function coastalRockGeometry(detail=1){
 let geometry=new IcosahedronGeometry(1,detail);const position=geometry.attributes.position
 for(let i=0;i<position.count;i++){
  const x=position.getX(i),y=position.getY(i),z=position.getZ(i),shape=1+.13*Math.sin(x*4+z*3)*Math.cos(y*5-z*2)+.07*Math.sin(z*7+x*2)
  position.setXYZ(i,x*shape,Math.max(-.72,y*shape),z*shape)
 }
 // Coincident seam vertices receive identical deformation; no random cracks.
 geometry.deleteAttribute('normal');geometry.deleteAttribute('uv');const source=geometry;geometry=mergeVertices(source,.00001);source.dispose();geometry.computeVertexNormals()
 const vertices=geometry.attributes.position,normals=geometry.attributes.normal,colors=[],stone=new Color('#8b8b7c'),moss=new Color('#617949'),tint=new Color(),uv=[]
 for(let i=0;i<vertices.count;i++){const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i),growth=Math.max(0,normals.getY(i))*.45*(.6+.4*Math.sin(x*7+z*5));tint.copy(stone).lerp(moss,growth);colors.push(tint.r,tint.g,tint.b);uv.push(Math.atan2(z,x)/(Math.PI*2)+.5,Math.acos(Math.max(-1,Math.min(1,y/Math.hypot(x,y,z))))/Math.PI)}
 geometry.setAttribute('color',new Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));geometry.computeBoundingBox();return geometry
}

export function rockBottom(geometry,scale,rotation){
 const p=new Vector3(),size=new Vector3(...scale),euler=new Euler(...rotation),vertices=geometry.attributes.position
 let bottom=Infinity
 for(let i=0;i<vertices.count;i++){p.fromBufferAttribute(vertices,i).multiply(size).applyEuler(euler);bottom=Math.min(bottom,p.y)}
 return bottom
}
