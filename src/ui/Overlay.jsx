import { useEffect, useRef } from 'react'
import { sections } from '../data/sections'
import { textOpacity } from '../scene/showcase/sceneWindows'
import FleetPanel from './FleetPanel'
import ServicesPanel from './ServicesPanel'
import BookingForm from './BookingForm'
import ContactCard from './ContactCard'
import BrandLogo from './BrandLogo'
import SiteFooter from './SiteFooter'
export default function Overlay({ scrollRef, started, onBook }) {
  const panels = useRef([]), progress = useRef(), root = useRef(), hint = useRef()
  useEffect(() => {
    if (!started) return
    let cancelled=false,gsap,context
    let previousOffset=-1
    const tick = () => {
      const offset = scrollRef.current?.offset ?? 0
      if(offset===previousOffset)return
      previousOffset=offset
      if (progress.current) progress.current.style.transform = `scaleX(${offset})`
      if(hint.current){hint.current.style.visibility=offset>.97?'hidden':'visible';hint.current.setAttribute('aria-hidden',String(offset>.97))}
      sections.forEach((section, i) => {
        const opacity=textOpacity(offset,section.id), active=opacity>0
        if (panels.current[i]) { panels.current[i].style.opacity = opacity; panels.current[i].style.visibility = active ? 'visible' : 'hidden'; panels.current[i].setAttribute('aria-hidden', String(!active)); panels.current[i].inert = !active }
      })
    }
    import('gsap').then(module=>{if(cancelled)return;gsap=module.default;tick();context=gsap.context(()=>gsap.fromTo(root.current,{autoAlpha:0},{autoAlpha:1,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:.7}),root);gsap.ticker.add(tick)}).catch(()=>{if(!cancelled)location.replace('/simple?reason=scene')})
    return () => {cancelled=true;gsap?.ticker.remove(tick);context?.revert()}
  }, [scrollRef,started])
  return <div ref={root} data-started={started} className="overlay" style={{ visibility: started ? 'visible' : 'hidden',opacity:0 }}><header><a className="brand" href="#" onClick={(event) => { event.preventDefault(); scrollRef.current?.el.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth' }) }}><BrandLogo compact/></a><span className="header-note">SELF-DRIVE / CHAUFFEUR / OUTSTATION</span></header><main id="journey-content" tabIndex={-1}>{sections.map((section, i) => <section key={section.id} ref={(node) => { panels.current[i] = node }} className="section-copy" aria-label={section.id}><p className="eyebrow">EGAL JOURNEYS / 0{i + 1}</p><h2 className="section-title">{section.title}</h2><div className="accent" />{section.id === 'hero' && <p>A little freedom. A new horizon.<br />Your next chapter starts here.</p>}{started && section.id === 'fleet' && <FleetPanel />}{started && section.id === 'services' && <ServicesPanel />}{started && section.id === 'booking' && <BookingForm />}{started && section.id === 'contact' && <ContactCard />}</section>)}</main><footer ref={hint}><span>SCROLL TO EXPLORE ↓</span></footer><SiteFooter/><div className="journey-progress" ref={progress} /><button className="primary book" onClick={onBook}>Book Now <span aria-hidden="true">↗</span></button></div>
}
