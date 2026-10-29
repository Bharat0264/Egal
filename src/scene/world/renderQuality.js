export function qualityProfile({ coarse=false, cores=8, memory=8, dpr=1 }={}) {
  const level=cores<=4||memory<=4?'performance':coarse?'balanced':'high'
  return {level,max:1.75,initial:1.25,min:1}
}
