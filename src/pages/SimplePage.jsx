import {brand} from '../data/brand'
import {cars,formatPrice} from '../data/cars'
import {services} from '../data/services'
import {faq} from '../data/faq'
import {sections} from '../data/sections'
import {contactCopy} from '../data/booking'
import {useSelectionActions} from '../state/SelectionContext'
import BookingForm from '../ui/BookingForm'
import BrandLogo from '../ui/BrandLogo'
import SiteFooter from '../ui/SiteFooter'
import {track} from '../lib/analytics'
import {useEffect} from 'react'

export default function SimplePage({noScript=false}){
 const actions=useSelectionActions()
 useEffect(()=>{const seen=new Set(),observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting&&!seen.has(entry.target.id)){seen.add(entry.target.id);track('scene_reached',{scene:entry.target.id})}},{threshold:.2});for(const id of ['fleet','services','booking','contact']){const el=document.getElementById(id);if(el)observer.observe(el)}return()=>observer.disconnect()},[])
 const book=(car,index)=>{if(car){actions.selectCar(index);actions.bookCar()}document.getElementById('booking')?.scrollIntoView({behavior:'auto'})}
 return <div className="simple-page">
  <a className="skip-link" href="#main-content">Skip to content</a>
  <header className="simple-header"><a href="/" aria-label="Egal home"><BrandLogo compact/></a><nav aria-label="Main navigation"><a href="#fleet">Fleet</a><a href="#services">Services</a><a href="#booking">Book Now</a><a href="#contact">Contact</a><a href="/">3D journey</a></nav></header>
  <main id="main-content" tabIndex={-1}>
   <section className="simple-hero"><p className="eyebrow">EGAL JOURNEYS / 01</p><h1>{sections[0].title}</h1><p>A little freedom. A new horizon.<br/>Your next chapter starts here.</p><a className="primary" href="#booking">Book Now ↗</a>{noScript&&<p className="setup-note">JavaScript is off. Browse all details here; enable JavaScript to validate and submit the booking form.</p>}</section>
   <section id="fleet"><h2>{sections[1].title}</h2><div className="simple-grid">{cars.map((car,index)=><article className="simple-tile" key={car.id}><h3>{car.name||car.category}</h3>{car.name&&<p>{car.category}</p>}<dl><div><dt>Seats</dt><dd>{car.seats}</dd></div><div><dt>Fuel</dt><dd>{car.fuel}</dd></div><div><dt>Price</dt><dd>{formatPrice(car.price)} <small>per day</small></dd></div></dl><button className="primary" onClick={()=>book(car,index)}>Book this car ↗</button></article>)}</div></section>
   <section id="services"><h2>{sections[2].title}</h2><div className="simple-grid">{services.map(service=><article className="simple-tile" key={service.id}><h3>{service.title}</h3><p>{service.subtitle}</p><ul>{service.bullets.map(bullet=><li key={bullet}>{bullet}</li>)}</ul><button className="primary" onClick={()=>{actions.setServiceId(service.id);actions.bookService();book()}}>Book now ↗</button></article>)}</div></section>
   <section id="booking"><h2>{sections[3].title}</h2><BookingForm simple/></section>
   <section id="contact"><h2>{sections[4].title}</h2><p>{contactCopy.subtitle}</p><dl className="simple-contact"><div><dt>{contactCopy.location}</dt><dd>{brand.address.includes('TO BE FILLED')?brand.address:<a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(brand.address)}`}>{brand.address}</a>}</dd></div><div><dt>{contactCopy.call}</dt><dd>{/^\+?\d{10,15}$/.test(brand.phone)?<a onClick={()=>track('call_click')} href={`tel:${brand.phone}`}>{brand.phone}</a>:brand.phone+' [TO BE FILLED]'}</dd></div><div><dt>{contactCopy.hours}</dt><dd>{brand.hours}</dd></div></dl><p>{contactCopy.farewell}</p></section>
   {!noScript&&<section id="faq"><h2>Frequently asked questions</h2>{faq.map(item=><details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>}
  </main><footer><SiteFooter/><p>© {brand.name}</p></footer>
 </div>
}
