import {IcosahedronGeometry,Vector3,Euler} from 'three'

export function coastalRockGeometry(detail=1){
 const geometry=new IcosahedronGeometry(1,detail),position=geometry.attributes.position
 for(let i=0;i<position.count;i++){
  const x=position.getX(i),y=position.getY(i),z=position.getZ(i),shape=1+.13*Math.sin(x*4+z*3)*Math.cos(y*5-z*2)+.07*Math.sin(z*7+x*2)
  position.setXYZ(i,x*shape,Math.max(-.72,y*shape),z*shape)
 }
 // Coincident seam vertices receive identical deformation; no random cracks.
 geometry.computeVertexNormals();geometry.computeBoundingBox();return geometry
}

export function rockBottom(geometry,scale,rotation){
 const p=new Vector3(),size=new Vector3(...scale),euler=new Euler(...rotation),vertices=geometry.attributes.position
 let bottom=Infinity
 for(let i=0;i<vertices.count;i++){p.fromBufferAttribute(vertices,i).multiply(size).applyEuler(euler);bottom=Math.min(bottom,p.y)}
 return bottom
}
