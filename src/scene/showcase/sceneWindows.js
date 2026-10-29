const smoothstep=(value,min,max)=>{const t=Math.max(0,Math.min(1,(value-min)/(max-min)));return t*t*(3-2*t)}
export const SCENE_WINDOWS={fleet:[.14,.40],services:[.40,.60],booking:[.60,.80],contact:[.80,1]}
const TEXT_WINDOWS={hero:[0,.14],...SCENE_WINDOWS}
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
export function textOpacity(offset,id){offset=Math.round(offset*1000)/1000;const range=TEXT_WINDOWS[id];if(!range||offset<range[0]||(id!=='contact'&&offset>=range[1]))return 0;return id==='contact'?1:1-smoothstep(offset,range[1]-.02,range[1])}
