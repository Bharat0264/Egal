import {MathUtils} from 'three'

// Car-local camera coordinates: lateral, height, distance behind, look-ahead.
// Existing fleet/services/booking/destination compositions take precedence.
export function drivingShot(offset,mobile,reduced,out=[0,0,0,0]){
 if(reduced){out[0]=mobile?.25:1.5;out[1]=mobile?2.5:2.4;out[2]=mobile?10.5:8.6;out[3]=6;return out}
 const hero=1-MathUtils.smoothstep(offset,0,.10)
 const detail=MathUtils.smoothstep(offset,.08,.105)*(1-MathUtils.smoothstep(offset,.115,.14))
 out[0]=MathUtils.lerp(.3,mobile?1.25:3.0,hero)+detail*(mobile?.2:.8);out[1]=MathUtils.lerp(mobile?2.4:2.1,mobile?3:2.6,hero)-detail*.15;out[2]=MathUtils.lerp(mobile?10:7.5,mobile?11.4:9.8,hero)-detail*(mobile?.2:.9);out[3]=MathUtils.lerp(7,2.2,hero);return out
}
