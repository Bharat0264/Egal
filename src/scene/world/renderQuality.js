export function qualityProfile({ coarse=false, cores=8, memory=8, dpr=1 }={}) {
  const level=cores<=4||memory<=4?'performance':coarse?'balanced':'high'
  const cap={high:1.75,balanced:1.35,performance:1}[level]
  return {level,max:Math.min(dpr,cap),min:Math.min(dpr,1)}
}

// Ignore isolated compilation stalls; require two sustained slow windows to
// lower resolution and six fast windows to recover. Never change prop counts.
export function createQualityController(profile) {
  let total=0,count=0,slow=0,fast=0,target=profile.max
  return {
    get target(){return target},
    sample(delta){
      if(delta<=0||delta>.25)return target
      total+=delta;count++
      if(total<3)return target
      const average=total/count;total=0;count=0
      slow=average>1/32?slow+1:0;fast=average<1/55?fast+1:0
      if(slow>=2){target=Math.max(profile.min,target-.15);slow=0;fast=0}
      else if(fast>=6){target=Math.min(profile.max,target+.1);fast=0}
      return target
    },
    reset(){total=0;count=0;slow=0;fast=0},
  }
}
