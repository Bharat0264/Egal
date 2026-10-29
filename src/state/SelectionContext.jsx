import { createContext, useContext, useRef, useSyncExternalStore } from 'react'
import { cars } from '../data/cars'
import { sections } from '../data/sections'
import { SCENE_WINDOWS } from '../scene/showcase/sceneWindows'
import {track} from '../lib/analytics'

const SelectionContext = createContext(null)
function createSelection() {
  let state = { fleetIndex: 0, colors: cars.map(c => c.color), selectedCar: null, serviceId: null, selectedService: 'self-drive', bookingStatus: 'idle', bookingResult: null, bookingAt: 0, resetVersion: 0 }
  const listeners = new Set()
  const scrollRef = { current: null }, htmlPortal = { current: null }
  const journeyMotion = { current: { gateDrive: 0 } }
  const interaction = { current: { yaw: 0, velocity: 0, dragging: false, lastInput: 0 } }
  const update = patch => {
    if (Object.keys(patch).every(key => Object.is(state[key],patch[key]))) return
    state = { ...state,...patch }; listeners.forEach(listener => listener())
  }
  const jump = offset => {
    const el = scrollRef.current?.el
    el?.scrollTo({ top: (el.scrollHeight - el.clientHeight) * offset, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth' })
  }
  const bookingOffset = Math.max(sections.find(s => s.id === 'booking').range[0],SCENE_WINDOWS.booking[0]+.02)
  const actions = {
    scrollRef, htmlPortal, interaction, journeyMotion, jump,
    selectCar(index) {
      track('car_selected',{car:cars[(index+cars.length)%cars.length].id})
      update({ fleetIndex: (index + cars.length) % cars.length })
      interaction.current.yaw = 0; interaction.current.velocity = 0
    },
    recolor(index,color) { track('colour_changed',{car:cars[index].id,colour:['#ffffff','#111111','#1e4fb8','#c0161b','#8a8d91'].indexOf(color)});update({ colors: state.colors.map((c,i) => i === index ? color : c) }) },
    setServiceId(serviceId) { update({serviceId}) },
    bookCar() { track('book_this_car',{car:cars[state.fleetIndex].id});update({ selectedCar: { ...cars[state.fleetIndex], color: state.colors[state.fleetIndex] }, serviceId: null }); jump(bookingOffset) },
    bookService() { update({selectedService:state.serviceId || 'self-drive',serviceId:null});jump(bookingOffset) },
    completeBooking(result) { update({bookingStatus:'success', bookingResult:result, bookingAt: scrollRef.current?.offset ?? .7}) },
    resetBooking() { update({bookingStatus:'idle',bookingResult:null}) },
    backToStart() {
      journeyMotion.current.gateDrive = 0
      interaction.current = {yaw:0,velocity:0,dragging:false,lastInput:0}
      update({fleetIndex:0,colors:cars.map(car=>car.color),selectedCar:null,serviceId:null,selectedService:'self-drive',bookingStatus:'idle',bookingResult:null,resetVersion:state.resetVersion+1})
      jump(0)
    },
  }
  return { actions, getSnapshot: () => state, subscribe(listener) { listeners.add(listener);return () => listeners.delete(listener) } }
}
export function SelectionProvider({ children }) {
  const store = useRef(null)
  if (!store.current) store.current = createSelection()
  // A stable context prevents context-bridge/Activity reconnects of the canvas.
  return <SelectionContext.Provider value={store.current}>{children}<div ref={store.current.actions.htmlPortal} className="scene-html-layer" /></SelectionContext.Provider>
}
export function useSelectionActions() { return useContext(SelectionContext).actions }
export function useSelection() {
  const store = useContext(SelectionContext)
  const state = useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot)
  return { ...store.actions,...state }
}
