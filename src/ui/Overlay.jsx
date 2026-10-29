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
  const panels = useRef([]), progress = useRef(), root = useRef(), hint = useRef(),more=useRef(),previousValues=useRef([])
  useEffect(() => {
    if (!started) return
    let cancelled=false,gsap,context
    let previousOffset=-1
    const tick = () => {
      const offset = scrollRef.current?.offset ?? 0
      if(offset===previousOffset)return
      previousOffset=offset
      if (progress.current) progress.current.style.transform = `scaleX(${offset})`
      if(hint.current){const visibility=offset>.97?'hidden':'visible';if(hint.current.style.visibility!==visibility){hint.current.style.visibility=visibility;hint.current.setAttribute('aria-hidden',String(offset>.97))}}
      sections.forEach((section, i) => {
        const opacity=Math.round(textOpacity(offset,section.id)*1000)/1000, active=opacity>0,panel=panels.current[i]
        if(panel&&opacity!==previousValues.current[i]){const entering=active&&!previousValues.current[i];panel.style.setProperty('--scene-opacity',opacity);panel.style.visibility=active?'visible':'hidden';panel.setAttribute('aria-hidden',String(!active));panel.inert=!active;if(!active)for(const animation of panel.getAnimations())animation.cancel();else if(entering&&!matchMedia('(prefers-reduced-motion: reduce)').matches)panel.animate([{opacity:0},{opacity}],{duration:160});previousValues.current[i]=opacity}
      })
      if(more.current){const visible=offset<.14||offset>=.8;if(more.current.hidden!==!visible)more.current.hidden=!visible;if(!visible){const details=more.current.querySelector('details');if(details?.open)details.open=false}}
    }
    import('gsap').then(module=>{if(cancelled)return;gsap=module.default;tick();context=gsap.context(()=>gsap.fromTo(root.current,{autoAlpha:0},{autoAlpha:1,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:.7}),root);gsap.ticker.add(tick)}).catch(()=>{if(!cancelled)location.replace('/simple?reason=scene')})
    return () => {cancelled=true;gsap?.ticker.remove(tick);context?.revert()}
  }, [scrollRef,started])
  return <div ref={root} data-started={started} className="overlay" style={{ visibility: started ? 'visible' : 'hidden',opacity:0 }}><header><a className="brand" href="#" onClick={(event) => { event.preventDefault(); scrollRef.current?.el.scrollTo({ top: 0, behavior:'instant' }) }}><BrandLogo compact/></a><span className="header-note">SELF-DRIVE / CHAUFFEUR / OUTSTATION</span></header><main id="journey-content" tabIndex={-1}>{sections.map((section, i) => <section key={section.id} ref={(node) => { panels.current[i] = node }} className="section-copy" aria-label={section.id}><p className="eyebrow">EGAL JOURNEYS / 0{i + 1}</p><h2 className="section-title">{section.title}</h2><div className="accent" />{section.id === 'hero' && <p>A little freedom. A new horizon.<br />Your next chapter starts here.</p>}{started && section.id === 'fleet' && <FleetPanel />}{started && section.id === 'services' && <ServicesPanel />}{started && section.id === 'booking' && <BookingForm />}{started && section.id === 'contact' && <ContactCard />}</section>)}</main><footer ref={hint}><span>SCROLL TO EXPLORE ↓</span></footer><div ref={more}><SiteFooter menu/></div><div className="journey-progress" ref={progress} /><button className="primary book" onClick={onBook}>Book Now <span aria-hidden="true">↗</span></button></div>
}
