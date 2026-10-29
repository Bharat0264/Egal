import { mkdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { Document, NodeIO } from '@gltf-transform/core'
import {
  BoxGeometry, BufferGeometry, CylinderGeometry, ExtrudeGeometry,
  Float32BufferAttribute, LatheGeometry, Quaternion, Shape, TorusGeometry, Vector2, Vector3,
} from 'three'

// Metres, +Z forward, +Y up. Change dimensions and the normalized side-profile
// points to generate another body style without replacing the modelling code.
export const sedan = {
  length: 4.2, width: 1.8, height: 1.4, wheelbase: 2.54,
  wheelRadius: 0.32, tireWidth: 0.2, archClearance: 0.055,
  bevel: 0.018, bodyHalfWidth: 0.82, roofTaper: 0.22,
  profile: {
    rearLower: [-0.488, 0.25], rearCorner: [-0.49, 0.44],
    bootEnd: [-0.46, 0.545], bootTop: [-0.28, 0.595],
    roofRear: [-0.17, 0.95], roofFront: [0.105, 0.985],
    windscreenBase: [0.25, 0.625], bonnetEnd: [0.445, 0.55],
    noseUpper: [0.485, 0.47], noseMiddle: [0.492, 0.36], noseLower: [0.48, 0.25],
  },
}

const document = new Document()
const buffer = document.createBuffer('EgalGeometry')
const scene = document.createScene('Egal Sedan')
const materials = {
  BodyPaint: document.createMaterial('BodyPaint').setBaseColorFactor([1, 1, 1, 1]).setMetallicFactor(0.6).setRoughnessFactor(0.3),
  Glass: document.createMaterial('Glass').setBaseColorFactor([0.025, 0.05, 0.08, 0.87]).setRoughnessFactor(0.05).setMetallicFactor(0.1).setAlphaMode('BLEND').setDoubleSided(true),
  Tire: document.createMaterial('Tire').setBaseColorFactor([0.009, 0.012, 0.017, 1]).setMetallicFactor(0).setRoughnessFactor(0.9),
  Rim: document.createMaterial('Rim').setBaseColorFactor([0.63, 0.68, 0.72, 1]).setMetallicFactor(0.9).setRoughnessFactor(0.24),
  Headlight: document.createMaterial('Headlight').setBaseColorFactor([1, 0.91, 0.7, 1]).setEmissiveFactor([1, 0.8, 0.45]).setRoughnessFactor(0.2),
  Taillight: document.createMaterial('Taillight').setBaseColorFactor([0.6, 0.008, 0.004, 1]).setEmissiveFactor([1, 0.018, 0.009]).setRoughnessFactor(0.25),
  Trim: document.createMaterial('Trim').setBaseColorFactor([0.025, 0.033, 0.042, 1]).setMetallicFactor(0).setRoughnessFactor(0.7),
}
let triangleCount = 0
const extents = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }

function primitive(geometry, material) {
  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals()
  const result = document.createPrimitive().setMaterial(material)
  for (const [attribute, semantic] of [['position', 'POSITION'], ['normal', 'NORMAL']]) {
    const data = geometry.getAttribute(attribute)
    result.setAttribute(semantic, document.createAccessor().setType('VEC3').setBuffer(buffer).setArray(new Float32Array(data.array)))
  }
  if (geometry.index) {
    const data = geometry.index.array
    result.setIndices(document.createAccessor().setType('SCALAR').setBuffer(buffer).setArray(new Uint16Array(data)))
  }
  triangleCount += (geometry.index?.count ?? geometry.getAttribute('position').count) / 3
  geometry.dispose()
  return result
}

function meshNode(name, parts, translation = [0, 0, 0], parent = scene) {
  const mesh = document.createMesh(name)
  parts.forEach(([geometry, material]) => mesh.addPrimitive(primitive(geometry, material)))
  const node = document.createNode(name).setMesh(mesh).setTranslation(translation)
  parent.addChild(node)
  return node
}

function box(width, height, depth, position = [0, 0, 0]) {
  return new BoxGeometry(width, height, depth).translate(...position)
}

function beveledBox(width, height, depth, radius = 0.018) {
  const r = Math.min(radius, width / 4, height / 4, depth / 4)
  const shape = new Shape()
  shape.moveTo(-width / 2 + r, -height / 2 + r)
  shape.lineTo(width / 2 - r, -height / 2 + r)
  shape.lineTo(width / 2 - r, height / 2 - r)
  shape.lineTo(-width / 2 + r, height / 2 - r)
  shape.closePath()
  return new ExtrudeGeometry(shape, { depth: depth - r * 2, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 2, steps: 1, curveSegments: 2 }).translate(0, 0, -depth / 2 + r)
}

function quad(points) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute([...points[0], ...points[1], ...points[2], ...points[0], ...points[2], ...points[3]], 3))
  geometry.computeVertexNormals()
  return geometry
}

function line(a, b, radius = 0.007) {
  const start = new Vector3(...a), end = new Vector3(...b)
  const direction = end.clone().sub(start)
  const geometry = new CylinderGeometry(radius, radius, direction.length(), 5)
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize()))
  geometry.translate(...start.add(end).multiplyScalar(0.5).toArray())
  return geometry
}
function sideWidth(y, z, config = sedan) {
  const roof = Math.max(0, (y - 0.76) / (config.height - 0.76))
  const tip = Math.max(0, (Math.abs(z) - config.length * 0.4) / (config.length * 0.1))
  return config.bodyHalfWidth * (1 - config.roofTaper * roof) * (1 - 0.035 * tip)
}

function bodyGeometry(config) {
  const shape = new Shape()
  const points = Object.values(config.profile).map(([z, y]) => [z * config.length, y * config.height])
  shape.moveTo(...points[0])
  points.slice(1).forEach((point) => shape.lineTo(...point))
  const archRadius = config.wheelRadius + config.archClearance
  const archY = config.wheelRadius + 0.015
  // Clockwise upper semicircles remove material from the lower side outline.
  for (const wheelZ of [config.wheelbase / 2, -config.wheelbase / 2]) {
    shape.lineTo(wheelZ + archRadius, archY)
    for (let step = 1; step <= 12; step++) {
      const angle = step * Math.PI / 12
      shape.lineTo(wheelZ + Math.cos(angle) * archRadius, archY + Math.sin(angle) * archRadius)
    }
  }
  shape.lineTo(...points[0])
  shape.closePath()
  const depth = config.bodyHalfWidth * 2 - config.bevel * 2
  const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: config.bevel, bevelSize: config.bevel, bevelSegments: 2, steps: 1, curveSegments: 3 })
  const source = geometry.getAttribute('position')
  const positions = []
  // Extrusion Z becomes car X, profile X becomes car Z. This reflection needs
  // reversed triangle winding; taper the upper body independently of wheelbase.
  for (let i = 0; i < source.count; i += 3) {
    for (const j of [0, 2, 1]) {
      const z = source.getX(i + j), y = source.getY(i + j)
      const x = (source.getZ(i + j) - depth / 2) * sideWidth(y, z, config) / config.bodyHalfWidth
      positions.push(x, y, z)
    }
  }
  geometry.dispose()
  const result = new BufferGeometry()
  result.setAttribute('position', new Float32BufferAttribute(positions, 3))
  result.computeVertexNormals()
  return result
}

// Body shell contains the full side silhouette, including cabin slopes and arches.
meshNode('Body', [[bodyGeometry(sedan), materials.BodyPaint]])

const glassParts = []
for (const side of [-1, 1]) {
  const window = (profile) => quad(profile.map(([z, y]) => [side * (sideWidth(y, z) + 0.009), y, z]))
  glassParts.push([window([[-0.08, 0.88], [0.93, 0.88], [0.39, 1.31], [-0.08, 1.31]]), materials.Glass])
  glassParts.push([window([[-1.07, 0.88], [-0.15, 0.88], [-0.15, 1.31], [-0.66, 1.28]]), materials.Glass])
}
// Windscreen and rear glass sit just outside the sloped shell, inset from its edges.
glassParts.push([quad([[-0.67, 0.973, 0.98], [0.67, 0.973, 0.98], [0.59, 1.370, 0.50], [-0.59, 1.370, 0.50]]), materials.Glass])
glassParts.push([quad([[0.67, 0.983, -1.075], [-0.67, 0.983, -1.075], [-0.59, 1.305, -0.775], [0.59, 1.305, -0.775]]), materials.Glass])
meshNode('Cabin', glassParts)

function wheelParts(side) {
  const r = sedan.wheelRadius, w = sedan.tireWidth
  const profile = [[0.19, -w / 2], [r - 0.045, -w / 2], [r - 0.01, -w * 0.35], [r, -w * 0.17], [r, w * 0.17], [r - 0.01, w * 0.35], [r - 0.045, w / 2], [0.19, w / 2], [0.19, -w / 2]].map((point) => new Vector2(...point))
  const tire = new LatheGeometry(profile, 24).rotateZ(-Math.PI / 2)
  const outside = side * (w / 2 + 0.002)
  const backing = new CylinderGeometry(0.225, 0.225, w * 0.92, 24).rotateZ(Math.PI / 2)
  const ring = new TorusGeometry(0.217, 0.018, 6, 24).rotateY(Math.PI / 2).translate(outside, 0, 0)
  const hub = new CylinderGeometry(0.065, 0.065, 0.022, 16).rotateZ(Math.PI / 2).translate(outside, 0, 0)
  const parts = [[tire, materials.Tire], [backing, materials.Tire], [ring, materials.Rim], [hub, materials.Rim]]
  for (let i = 0; i < 5; i++) {
    const spoke = beveledBox(0.022, 0.16, 0.035, 0.006).translate(outside, 0.13, 0).rotateX(i * Math.PI * 2 / 5)
    parts.push([spoke, materials.Rim])
  }
  return parts
}

for (const [suffix, side, front] of [['FL', -1, true], ['FR', 1, true], ['RL', -1, false], ['RR', 1, false]]) {
  const hub = [side * (sedan.width - sedan.tireWidth) / 2, sedan.wheelRadius, (front ? 1 : -1) * sedan.wheelbase / 2]
  if (front) {
    const pivot = document.createNode(`SteerPivot_${suffix}`).setTranslation(hub)
    scene.addChild(pivot)
    meshNode(`Wheel_${suffix}`, wheelParts(side), [0, 0, 0], pivot)
  } else meshNode(`Wheel_${suffix}`, wheelParts(side), hub)
}

for (const [suffix, side] of [['L', -1], ['R', 1]]) {
  meshNode(`Headlight_${suffix}`, [[beveledBox(0.39, 0.10, 0.055, 0.012), materials.Headlight]], [side * 0.53, 0.625, 2.068])
  meshNode(`Taillight_${suffix}`, [[beveledBox(0.39, 0.105, 0.055, 0.012), materials.Taillight]], [side * 0.53, 0.645, -2.068])
}
meshNode('Grille', [[beveledBox(0.88, 0.14, 0.035, 0.015), materials.Trim]], [0, 0.48, 2.078])
meshNode('Bumper_Front', [[beveledBox(1.48, 0.09, 0.13, 0.018), materials.Trim]], [0, 0.355, 2.015])
meshNode('Bumper_Rear', [[beveledBox(1.48, 0.09, 0.13, 0.018), materials.Trim]], [0, 0.355, -2.015])

const details = [], paintedDetails = [], mirrorGlass = []
for (const side of [-1, 1]) {
  for (const z of [-0.76, -0.1, 0.82]) {
    details.push([line([side * (sideWidth(0.37, z) + 0.006), 0.37, z], [side * (sideWidth(0.82, z) + 0.009), 0.82, z], 0.005), materials.Trim])
  }
  // Door handles and low skirt are deliberately generic, without brand cues.
  for (const z of [-0.5, 0.46]) details.push([beveledBox(0.025, 0.025, 0.14, 0.005).translate(side * 0.826, 0.775, z), materials.Trim])
  details.push([beveledBox(0.045, 0.055, 1.67, 0.01).translate(side * 0.81, 0.29, 0), materials.Trim])
  details.push([line([side * 0.745, 0.855, 0.78], [side * 0.83, 0.9, 0.72], 0.022), materials.Trim])
  paintedDetails.push([beveledBox(0.14, 0.105, 0.19, 0.018).translate(side * 0.83, 0.925, 0.71), materials.BodyPaint])
  mirrorGlass.push([box(0.105, 0.067, 0.007, [side * 0.83, 0.925, 0.612]), materials.Glass])
  paintedDetails.push([line([side * 0.615, 1.359, -0.65], [side * 0.615, 1.397, 0.39], 0.012), materials.BodyPaint])
}
meshNode('DoorLines_Handles_Skirts', details)
meshNode('Mirrors_RoofEdges', paintedDetails)
meshNode('MirrorGlass', mirrorGlass)

// Validate world-space vertex bounds, hierarchy, and the budget before writing.
for (const node of document.getRoot().listNodes()) {
  const mesh = node.getMesh()
  if (!mesh) continue
  const world = node.getWorldMatrix()
  for (const part of mesh.listPrimitives()) {
    const values = part.getAttribute('POSITION').getArray()
    for (let i = 0; i < values.length; i += 3) {
      const x = values[i], y = values[i + 1], z = values[i + 2]
      const p = [world[0] * x + world[4] * y + world[8] * z + world[12], world[1] * x + world[5] * y + world[9] * z + world[13], world[2] * x + world[6] * y + world[10] * z + world[14]]
      p.forEach((value, axis) => { extents.min[axis] = Math.min(extents.min[axis], value); extents.max[axis] = Math.max(extents.max[axis], value) })
    }
  }
}
if (triangleCount > 8000) throw new Error(`Triangle budget exceeded: ${triangleCount}`)
if (Math.abs(extents.min[1]) > 0.00001) throw new Error(`Wheels do not meet ground: ${extents.min[1]}`)
const destination = fileURLToPath(new URL('../public/models/car.glb', import.meta.url))
await mkdir(fileURLToPath(new URL('../public/models/', import.meta.url)), { recursive: true })
await new NodeIO().write(destination, document)
const file = await stat(destination)
console.log(JSON.stringify({
  file: destination,
  triangles: triangleCount,
  bytes: file.size,
  kilobytes: Number((file.size / 1024).toFixed(2)),
  dimensions: extents.max.map((max, axis) => Number((max - extents.min[axis]).toFixed(4))),
  bounds: extents,
  nodes: document.getRoot().listNodes().map((node) => node.getName()),
  materials: document.getRoot().listMaterials().map((material) => material.getName()),
}, null, 2))
