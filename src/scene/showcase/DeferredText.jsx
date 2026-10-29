import {useRef,useState} from 'react'
import {useFrame} from '@react-three/fiber'
import {Text,useScroll} from '@react-three/drei'
import {SCENE_WINDOWS} from './sceneWindows'

// The local 3D font belongs to roadside signs, not the opening scene. Start
// its shared cached request ahead of the scene, and retain glyphs on return.
export default function DeferredText({stage,...props}){
 const scroll=useScroll(),[ready,setReady]=useState(false)
 const queued=useRef(false)
 useFrame(()=>{if(!queued.current&&scroll.offset>=SCENE_WINDOWS[stage][0]-.15){queued.current=true;setReady(true)}})
 return ready?<Text {...props}/>:null
}
