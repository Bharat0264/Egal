import { Canvas } from '@react-three/fiber'
import { ScrollControls } from '@react-three/drei'
import CameraRig from './CameraRig'
import Road from './Road'
import Car from './Car'
export default function World({ onScrollReady }) {
  return <Canvas dpr={[1, 2]} camera={{ position: [0, 5, 8], fov: 55 }}><color attach="background" args={['#b9dce8']} /><fog attach="fog" args={['#b9dce8', 25, 110]} /><ambientLight intensity={1.5} /><directionalLight position={[10, 15, 5]} intensity={2.5} color="#ffdfaa" /><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, -50]}><planeGeometry args={[300, 300]} /><meshStandardMaterial color="#64aebc" /></mesh><ScrollControls pages={6} damping={0.2}><Road /><Car /><CameraRig onScrollReady={onScrollReady} /></ScrollControls></Canvas>
}
