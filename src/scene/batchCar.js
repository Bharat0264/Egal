import { Float32BufferAttribute, Group, Matrix4, Mesh } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Bake only rigid parts into material batches. Wheel/steering pivots stay live,
// source assets remain untouched, and named source nodes remain addressable.
export function batchCar(model, wheelRoots) {
  const buckets = new Map(), inverse = new Matrix4(), transform = new Matrix4()
  const originals = []
  model.updateWorldMatrix(true, true)
  model.traverse(mesh => {
    if (!mesh.isMesh || mesh.isSkinnedMesh || mesh.morphTargetInfluences) return
    let parent = mesh, rig = model
    while (parent && parent !== model) {
      if (wheelRoots.includes(parent)) { rig = parent; break }
      parent = parent.parent
    }
    inverse.copy(rig.matrixWorld).invert(); transform.multiplyMatrices(inverse, mesh.matrixWorld)
    let geometry = mesh.geometry.clone()
    // Meshopt uses quantized normalized attributes; decode before baking matrices.
    for (const [name, attr] of Object.entries(geometry.attributes)) {
      const values = new Float32Array(attr.count * attr.itemSize)
      for (let i = 0; i < attr.count; i++) for (let c = 0; c < attr.itemSize; c++) values[i * attr.itemSize + c] = attr.getComponent(i, c)
      geometry.setAttribute(name, new Float32BufferAttribute(values, attr.itemSize))
    }
    if(!geometry.attributes.normal)geometry.computeVertexNormals()
    if(!geometry.attributes.uv)geometry.setAttribute('uv',new Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2))
    geometry.applyMatrix4(transform)
    if (geometry.index) { const indexed = geometry; geometry = indexed.toNonIndexed(); indexed.dispose() }
    const add = (material, part) => {
      if (!buckets.has(rig)) buckets.set(rig, new Map())
      const materials = buckets.get(rig)
      if (!materials.has(material)) materials.set(material, [])
      materials.get(material).push(part)
    }
    if (Array.isArray(mesh.material)) {
      for (const group of geometry.groups) {
        const part = geometry.clone()
        for (const [name, attr] of Object.entries(geometry.attributes)) part.setAttribute(name, new Float32BufferAttribute(attr.array.slice(group.start * attr.itemSize, (group.start + group.count) * attr.itemSize), attr.itemSize))
        part.clearGroups(); add(mesh.material[group.materialIndex], part)
      }
      geometry.dispose()
    } else add(mesh.material, geometry)
    originals.push(mesh)
  })
  const owned = []
  for (const [rig, materials] of buckets) for (const [material, geometries] of materials) {
    const geometry = mergeGeometries(geometries)
    geometries.forEach(g => g.dispose())
    if (!geometry) throw new Error('Incompatible car batch attributes')
    owned.push(geometry)
    const mesh = new Mesh(geometry, material); mesh.name = `batch-${rig.name}-${material.name}`
    rig.add(mesh)
  }
  // Promote source meshes to named transform groups: invisible/empty meshes
  // still cost render-list work, and hiding parents also hides the live rig.
  const replacements=new Map()
  for(const mesh of originals){
    const group=new Group()
    group.name=mesh.name;group.position.copy(mesh.position);group.quaternion.copy(mesh.quaternion);group.scale.copy(mesh.scale)
    group.userData={...mesh.userData}
    for(const child of [...mesh.children])group.add(child)
    mesh.parent.add(group);mesh.removeFromParent();replacements.set(mesh,group)
  }
  return {replacements,dispose:()=>owned.forEach(geometry=>geometry.dispose())}
}
