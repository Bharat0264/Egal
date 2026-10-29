import { useMemo } from 'react'
import { BufferGeometry, Float32BufferAttribute, Color } from 'three'
import { terrainSurface } from './layout'
import { createRibbon, ROAD_WIDTH } from '../Road'
import { gravelTexture, terrainTextures } from './textures'

export default function Terrain() {
  const gravel = useMemo(gravelTexture, [])
  const surface=useMemo(terrainTextures,[])
  const geometry = useMemo(() => {
    const positions = [], colors = [], indices = [], uvs=[], rows = 184, columns = 116
    const grass = new Color('#8c9c73'), hill = new Color('#566f5d'), sand = new Color('#c5b99a'), cliff = new Color('#858c78')
    for (let i = 0; i <= rows; i++) for (let j = 0; j <= columns; j++) {
      const x=-180+j/columns*290,z=110-i/rows*460,{height,lateral}=terrainSurface.sample(x,z)
      positions.push(x,height,z);uvs.push(x/5,z/5)
      const color = lateral > 6 ? sand.clone().lerp(cliff, (Math.sin(x*.14+z*.18) + 1) * 0.2) : grass.clone().lerp(hill, Math.min(Math.max(height, 0) / 12, 0.65))
      colors.push(color.r, color.g, color.b)
      if (i < rows && j < columns) { const a = i * (columns + 1) + j; indices.push(a, a + 1, a + columns + 1, a + 1, a + columns + 2, a + columns + 1) }
    }
    const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(positions, 3)); g.setAttribute('uv',new Float32BufferAttribute(uvs,2));g.setAttribute('color', new Float32BufferAttribute(colors, 3)); g.setIndex(indices); g.computeVertexNormals(); return g
  }, [])
  const shoulders = useMemo(() => [-1, 1].map(side => createRibbon(0.75, [{ start: 0, end: 1, segments: 400 }], side * (ROAD_WIDTH / 2 + 0.375), -0.016)), [])
  return <group name="coastal-terrain">
    <mesh name="continuous-ground" geometry={geometry}><meshStandardMaterial {...surface} vertexColors roughness={1} /></mesh>
    {shoulders.map((g, i) => <mesh key={i} geometry={g}><meshStandardMaterial map={gravel} roughness={1} /></mesh>)}
  </group>
}
