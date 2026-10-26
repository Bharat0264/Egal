import { useMemo } from 'react'
import { BufferGeometry, Float32BufferAttribute, CatmullRomCurve3, Vector3 } from 'three'
export const roadCurve = new CatmullRomCurve3([
  new Vector3(0, 0, 0), new Vector3(-8, 0, -24), new Vector3(8, 0, -50),
  new Vector3(-8, 0, -78), new Vector3(0, 0, -108),
])
export default function Road() {
  const geometry = useMemo(() => {
    const positions = [], indices = []
    for (let i = 0; i <= 160; i++) {
      const t = i / 160, point = roadCurve.getPointAt(t), tangent = roadCurve.getTangentAt(t)
      const side = new Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(3.2)
      positions.push(point.x + side.x, 0, point.z + side.z, point.x - side.x, 0, point.z - side.z)
      if (i < 160) { const n = i * 2; indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3) }
    }
    const mesh = new BufferGeometry()
    mesh.setAttribute('position', new Float32BufferAttribute(positions, 3)); mesh.setIndex(indices); mesh.computeVertexNormals()
    return mesh
  }, [])
  return <group><mesh geometry={geometry}><meshStandardMaterial color="#343c50" /></mesh>{Array.from({ length: 65 }, (_, i) => {
    const t = i / 64, p = roadCurve.getPointAt(t), d = roadCurve.getTangentAt(t)
    return <mesh key={i} position={[p.x, 0.015, p.z]} rotation={[0, Math.atan2(d.x, d.z), 0]}><boxGeometry args={[0.08, 0.02, 0.7]} /><meshBasicMaterial color="#ffe3a2" /></mesh>
  })}</group>
}
