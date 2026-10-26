import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { sections } from '../data/sections'
import FleetPanel from './FleetPanel'
import BookingForm from './BookingForm'
import ContactCard from './ContactCard'
export default function Overlay({ scrollRef, started, onBook }) {
  const panels = useRef([]), progress = useRef(), root = useRef()
  useEffect(() => {
    if (!started) return
    const context = gsap.context(() => gsap.fromTo(root.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7 }), root)
    return () => context.revert()
  }, [started])
  useEffect(() => {
    const tick = () => {
      const offset = scrollRef.current?.offset ?? 0
      if (progress.current) progress.current.style.transform = `scaleX(${offset})`
      sections.forEach((section, i) => {
        const [start, end] = section.range, active = offset >= start && (offset < end || i === sections.length - 1)
        const local = (offset - start) / (end - start)
        const opacity = active ? Math.min(1, i === 0 ? 1 : local / 0.12, i === sections.length - 1 ? 1 : (1 - local) / 0.12) : 0
        if (panels.current[i]) { panels.current[i].style.opacity = opacity; panels.current[i].style.visibility = active ? 'visible' : 'hidden'; panels.current[i].setAttribute('aria-hidden', String(!active)) }
      })
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [scrollRef])
  return <div ref={root} className="overlay" style={{ visibility: started ? 'visible' : 'hidden' }}><header><a className="brand" href="#" onClick={(event) => { event.preventDefault(); scrollRef.current?.el.scrollTo({ top: 0, behavior: 'smooth' }) }}><span>E</span>gal</a><span className="header-note">SELF-DRIVE / CHAUFFEUR / OUTSTATION</span></header><main>{sections.map((section, i) => <section key={section.id} ref={(node) => { panels.current[i] = node }} className="section-copy" aria-label={section.id}><p className="eyebrow">EGAL JOURNEYS / 0{i + 1}</p><h1>{section.title}</h1><div className="accent" />{section.id === 'hero' && <p>A little freedom. A new horizon.<br />Your next chapter starts here.</p>}{section.id === 'fleet' && <FleetPanel />}{section.id === 'services' && <p>Self-Drive · Chauffeur · Outstation</p>}{section.id === 'booking' && <BookingForm />}{section.id === 'contact' && <ContactCard />}</section>)}</main><footer><span>SCROLL TO EXPLORE ↓</span><span>COAST TO CITY · FOUNDATION PREVIEW</span></footer><div className="journey-progress" ref={progress} /><button className="primary book" onClick={onBook}>Book Now ↗</button></div>
}
