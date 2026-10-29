import {Text} from '@react-three/drei'
import {configureTextBuilder} from 'troika-three-text'
const key=Symbol.for('egal.text.configuration')
if(!globalThis[key]){configureTextBuilder({textureWidth:1024,sdfGlyphSize:32});globalThis[key]=true}
export default function DeferredText({stage,...props}){return <Text {...props}/>}
