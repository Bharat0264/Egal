import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useScroll } from '@react-three/drei'
import { Quaternion } from 'three'
import { brand } from '../data/brand'
import {getHeroCarModel} from '../data/cars'
import PlaceholderCar from './PlaceholderCar'
import useCarMotion from './useCarMotion'
import { prepareCarModel } from './carModel'
import { SoftCarShadow, TailGlow } from './CarEffects'
import { sceneBlend } from './showcase/layout'

const MODEL_URL = getHeroCarModel()
const FALLBACK_SIZE = { x: 1.2, y: 0.98, z: 1.95 }
const FALLBACK_TAILS = [{ x: -0.36, y: 0.51, z: -0.984 }, { x: 0.36, y: 0.51, z: -0.984 }]

// Vite injects existence flags at startup/build time. No missing-file requests.
if (__EGAL_ASSETS__.model) useGLTF.preload(MODEL_URL, false, true)

class AssetBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function LoadedCar({ color, motion, onReady, low }) {
  const { scene } = useGLTF(MODEL_URL, false, true)
  const model = useMemo(() => prepareCarModel(scene,{transmission:!low}), [scene,low])
  const turn = useMemo(() => new Quaternion(), [])

  useEffect(() => {
    model.paintMaterials.forEach((material, index) => {
      if (color == null) material.color.copy(model.paintColors[index])
      else material.color.set(color)
    })
  }, [color, model])
  useEffect(() => { onReady(model.size) }, [model, onReady])
  useEffect(() => () => model.dispose(), [model])

  useFrame(() => {
    const { distance, steer, brake } = motion.current
    model.wheels.forEach((wheel) => {
      wheel.spin.quaternion.copy(wheel.spinRotation).multiply(turn.setFromAxisAngle(wheel.spinAxis, distance / wheel.radius))
      if (wheel.steer) wheel.steer.quaternion.copy(wheel.steerRotation).multiply(turn.setFromAxisAngle(wheel.steerAxis, steer))
    })
    model.tailMaterials.forEach((material, index) => {
      material.emissiveIntensity = model.tailIntensities[index] * (1 + brake * 0.35)
    })
  })

  return (
    <>
      <primitive object={model.root} dispose={null} />
      <TailGlow positions={model.tailPositions} motion={motion} />
    </>
  )
}

export default function Car({ color, onReady, low }) {
  const anchor = useRef(), suspension = useRef()
  const scroll = useScroll()
  const fadeMaterials = useMemo(() => new WeakMap(), [])
  const previousOpacity=useRef(-1)
  useFrame(() => {
    const opacity = 1 - sceneBlend(scroll.offset, 'fleet')
    anchor.current.visible = opacity > .001
    if(opacity===previousOpacity.current)return
    previousOpacity.current=opacity
    anchor.current.traverse(object => {
      if (!object.isMesh) return
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!fadeMaterials.has(material)) fadeMaterials.set(material, { opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite })
        const original = fadeMaterials.get(material)
        const transparent = original.transparent || opacity < .999
        if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true }
        material.opacity = original.opacity * opacity
        material.depthWrite = opacity < .999 ? false : original.depthWrite
      }
    })
  })
  const motion = useCarMotion(anchor, suspension)
  const [size, setSize] = useState(FALLBACK_SIZE)
  const handleModelReady = useCallback((modelSize) => { setSize(modelSize); onReady?.() }, [onReady])
  const fallbackColor = color ?? brand.colors.cream
  const fallback = <PlaceholderCar color={fallbackColor} motion={motion} onReady={onReady} />

  return (
    <group ref={anchor} name="car">
      <SoftCarShadow width={size.x} length={size.z} />
      <group ref={suspension} name="car-suspension">
        {__EGAL_ASSETS__.model ? (
          <AssetBoundary fallback={fallback}>
            <Suspense fallback={<PlaceholderCar color={fallbackColor} motion={motion} />}>
              <LoadedCar color={color} motion={motion} onReady={handleModelReady} low={low} />
            </Suspense>
          </AssetBoundary>
        ) : <>{fallback}<TailGlow positions={FALLBACK_TAILS} motion={motion} /></>}
      </group>
    </group>
  )
}
