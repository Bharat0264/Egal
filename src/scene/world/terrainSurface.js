import {MathUtils} from 'three'

// A world-space heightfield cannot fold over at a tight road bend, unlike a
// 175-metre-wide curve ribbon. The same sampler grounds vegetation and rocks.
export function createTerrainSurface(curve,reserves=[],steps=240){
 const points=Array.from({length:steps+1},(_,i)=>curve.getPointAt(i/steps))
 const segments=points.slice(0,-1).map((a,i)=>{const b=points[i+1],dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;return{a,dx,dz,length,rx:-dz/Math.sqrt(length),rz:dx/Math.sqrt(length),i}})
 function sample(x,z){
  let best=Infinity,closest,along=0,px=0,pz=0
  for(const s of segments){const t=MathUtils.clamp(((x-s.a.x)*s.dx+(z-s.a.z)*s.dz)/s.length,0,1),cx=s.a.x+s.dx*t,cz=s.a.z+s.dz*t,d=(x-cx)**2+(z-cz)**2;if(d<best){best=d;closest=s;along=t;px=cx;pz=cz}}
  const lateral=(x-px)*closest.rx+(z-pz)*closest.rz,u=(closest.i+along)/steps
  const rise=MathUtils.smootherstep(-lateral,5,34),waves=3.1+1.35*Math.sin(x*.032+z*.024)+.8*Math.cos(z*.041-x*.018)
  let height=lateral>3.5?MathUtils.lerp(-.08,-4.4,MathUtils.smootherstep(lateral,3.5,17)):-.08+rise*waves+MathUtils.smootherstep(-lateral,65,180)*(12+5*Math.sin(z*.014))
  for(const r of reserves){const dx=x-r.x,dz=z-r.z,localX=dx*r.rx+dz*r.rz,localZ=dx*r.fx+dz*r.fz,outX=Math.max(r.minX-localX,0,localX-r.maxX),outZ=Math.max(r.minZ-localZ,0,localZ-r.maxZ),blend=1-MathUtils.smootherstep(Math.hypot(outX,outZ),0,r.feather||6);height=MathUtils.lerp(height,-.08,blend)}
  return{height,lateral,u}
 }
 return{sample,height:(x,z)=>sample(x,z).height}
}
