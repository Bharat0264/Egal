const smoothstep=(value,min,max)=>{const t=Math.max(0,Math.min(1,(value-min)/(max-min)));return t*t*(3-2*t)}
// Prop windows may crossfade; text windows are exclusive, with quiet road-only gaps.
export const SCENE_WINDOWS={fleet:[.14,.41],services:[.39,.58],booking:[.61,.79],contact:[.81,1]}
const TEXT_WINDOWS={hero:[0,.14],fleet:[.14,.40],services:[.40,.58],booking:[.61,.79],contact:[.81,1]}
export function windowOpacity(offset,id,windows=SCENE_WINDOWS) {
 const range=windows[id]
 if(!range)return 0
 const [start,end]=range
 if(offset<start||offset>end)return 0
 const enter=start===0?1:smoothstep(offset,start,start+.02)
 // The final destination persists at the endpoint instead of disappearing at 1.
 const leave=id==='contact'?1:1-smoothstep(offset,end-.02,end)
 const opacity=enter*leave
 return opacity<.0001?0:opacity
}
export const textOpacity=(offset,id)=>windowOpacity(offset,id,TEXT_WINDOWS)
