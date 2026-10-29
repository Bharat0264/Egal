import { Scene } from 'three'

// Compile the upcoming lighting/material combination without changing the live
// hierarchy or rendering hidden props. Only use the nonblocking driver path.
export function warmScene(gl,scene,camera,root){
 if(!gl.extensions.has('KHR_parallel_shader_compile'))return()=>{}
 let cancelled=false
 const run=()=>{
  if(cancelled||document.hidden)return
  const visible=root.visible,warm=new Scene()
  warm.environment=scene.environment;warm.environmentIntensity=scene.environmentIntensity
  warm.environmentRotation.copy(scene.environmentRotation);warm.fog=scene.fog
  root.visible=true
  warm.children=scene.children.filter(object=>object.visible)
  let promise
  try{promise=gl.compileAsync(warm,camera)}
  catch{root.userData.shaderWarmup='unavailable'}
  finally{root.visible=visible}
  promise?.then(()=>{if(!cancelled)root.userData.shaderWarmup='ready'}).catch(()=>{if(!cancelled)root.userData.shaderWarmup='unavailable'})
 }
 const idle=typeof requestIdleCallback==='function'
 const handle=idle?requestIdleCallback(run):setTimeout(run,200)
 return()=>{cancelled=true;if(idle)cancelIdleCallback(handle);else clearTimeout(handle)}
}
