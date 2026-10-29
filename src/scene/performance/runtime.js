export const performanceRuntime={warming:true,ready:false,active:true,dprTarget:1.25,progress:0,epoch:0,windowU:0,windowRevision:0,shaderMaterials:new Map(),programsAtStart:0}
export const sceneOrder=['hero','fleet','services','booking','contact']
export function sceneIndex(offset){return offset<.14?0:offset<.4?1:offset<.6?2:offset<.8?3:4}
export function keepWarmMaterial(material){
 if(!performanceRuntime.warming||performanceRuntime.shaderMaterials.has(material))return
 const dispose=material.dispose.bind(material)
 performanceRuntime.shaderMaterials.set(material,dispose)
 material.dispose=()=>{} // A small shared shader catalogue owns this reference.
}
export function releaseWarmMaterials(){for(const[m,dispose]of performanceRuntime.shaderMaterials){m.dispose=dispose;dispose()}performanceRuntime.shaderMaterials.clear()}
