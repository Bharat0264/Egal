import { useEffect, useRef, useState } from 'react'
import { cars, formatPrice } from '../data/cars'
import { brand } from '../data/brand'
import { bookingCopy as copy } from '../data/booking'
import { bookingEstimate, localToday, submitBooking, validateBooking } from '../lib/booking'
import { useSelection } from '../state/SelectionContext'
import {track} from '../lib/analytics'

function useKeyboardViewport() {
  useEffect(() => {
    let previousHeight=0
    const update = () => {
      const viewport=window.visualViewport
      const height=viewport?.height||window.innerHeight
      document.documentElement.style.setProperty('--usable-height', `${viewport?.height || window.innerHeight}px`)
      document.documentElement.style.setProperty('--keyboard-inset', `${Math.max(0,window.innerHeight-(viewport?.height || window.innerHeight)-(viewport?.offsetTop || 0))}px`)
      if(previousHeight&&previousHeight!==height){const active=document.activeElement;if(active?.matches('input,select')&&active.closest('.booking-card'))requestAnimationFrame(()=>active.scrollIntoView({block:'nearest',inline:'nearest'}))}
      previousHeight=height
    }
    update(); window.visualViewport?.addEventListener('resize', update); window.visualViewport?.addEventListener('scroll', update)
    return () => { window.visualViewport?.removeEventListener('resize', update); window.visualViewport?.removeEventListener('scroll', update); document.documentElement.style.removeProperty('--keyboard-inset'); document.documentElement.style.removeProperty('--usable-height') }
  }, [])
}
export default function BookingForm({simple=false}) {
  const { selectedCar, selectedService, colors, bookingStatus, bookingResult, completeBooking, resetVersion } = useSelection()
  const [values,setValues] = useState({pickup:'',dropoff:'',location:'',carId:selectedCar?.id || '',phone:'',email:'',website:''})
  const [errors,setErrors] = useState({}), [busy,setBusy] = useState(false)
  const[today,setToday]=useState('')
  useEffect(()=>setToday(localToday()),[])
  const form = useRef(), confirmation = useRef(), submission = useRef(0)
  const begun=useRef(false)
  useKeyboardViewport()
  useEffect(() => { if(selectedCar)setValues(old=>({...old,carId:selectedCar.id})) },[selectedCar])
  useEffect(() => {
    submission.current++
    setValues({pickup:'',dropoff:'',location:'',carId:'',phone:'',email:'',website:''});setErrors({});setBusy(false)
  },[resetVersion])
  useEffect(() => { if(bookingStatus==='success')confirmation.current?.focus() },[bookingStatus])
  const index = cars.findIndex(car=>car.id===values.carId), car = cars[index]
  const color = selectedCar?.id===values.carId ? selectedCar.color : colors[index]
  const estimate = bookingEstimate(values)
  const change = event => {
    const {name,value}=event.target
    setValues(old=>({...old,[name]:value}));setErrors(old=>({...old,[name]:undefined,form:undefined}))
  }
  async function send(event, whatsappOnly=false) {
    event.preventDefault()
    if(busy)return
    const data={...values,color:color || '#ffffff',service:selectedService}, next=validateBooking(data)
    setErrors(next)
    if(Object.keys(next).length){for(const field of Object.keys(next))track('form_error',{field});requestAnimationFrame(()=>form.current?.querySelector('[aria-invalid="true"]')?.focus());return}
    setBusy(true)
    const version=++submission.current
    try {
      const result=await submitBooking(data,{whatsappOnly})
      if(version===submission.current)completeBooking(result)
    } catch { if(version===submission.current)setErrors({form:copy.retry}) }
    finally { if(version===submission.current)setBusy(false) }
  }
  const field=(name,label,input)=><div className={`booking-field ${name==='location'?'field-wide':''}`}><label htmlFor={`booking-${name}`}>{label}</label>{input}<span id={`error-${name}`} className="field-error">{errors[name]}</span></div>
  const attrs=name=>({id:`booking-${name}`,name,value:values[name],onChange:change,required:true,'aria-invalid':Boolean(errors[name]),'aria-describedby':`error-${name}`})
  if(bookingStatus==='success')return <aside ref={confirmation} tabIndex={-1} className={`scene-card booking-card booking-success${simple?" simple-booking":""}`} aria-label="Booking confirmation" role="status" aria-live="polite"><span className="success-mark" aria-hidden="true">✓</span><h2>{bookingResult?.channel==="whatsapp"?"Your WhatsApp draft is ready.":copy.success}</h2>{bookingResult?.fallback&&<p className="fallback-message">Email booking is unavailable. Your request has not reached Egal yet. Please send the WhatsApp draft below.</p>}{bookingResult?.channel==='whatsapp' && <><p>{copy.whatsappSuccess}</p>{!/^[1-9]\d{9,14}$/.test(brand.whatsapp)&&<p className="setup-note">{copy.whatsappMissing}</p>}<a className="whatsapp-button" onClick={()=>track("whatsapp_click",{source:"link"})} href={bookingResult.url} target="_blank" rel="noopener noreferrer">{copy.draftLink} ↗</a></>}</aside>
  return <form ref={form} method="post" action="/api/booking" className={`scene-card booking-card${simple?' simple-booking':''}`} aria-label={copy.title} onSubmit={send} onFocusCapture={()=>{if(!begun.current){begun.current=true;track('form_started',{view:simple?'simple':'3d'})}}} noValidate>
    <div className="booking-body"><h2>{copy.title}</h2><p className="booking-intro">{copy.subtitle}</p>
    <div className="booking-fields">
      {field('pickup',copy.pickup,<input {...attrs('pickup')} type="date" min={today||undefined} />)}
      {field('dropoff',copy.dropoff,<input {...attrs('dropoff')} type="date" min={values.pickup||today||undefined} />)}
      {field('location',copy.location,<input {...attrs('location')} type="text" maxLength={200} autoComplete="street-address" placeholder={copy.locationPlaceholder} />)}
      {field('carId',copy.car,<div className="booking-car-select">{car && <span className="chosen-color" aria-label={`Chosen colour ${color}`} style={{background:color}} />}<select {...attrs('carId')}><option value="">{copy.chooseCar}</option>{cars.map(car=><option key={car.id} value={car.id}>{car.name || car.category} · {formatPrice(car.price)}/day</option>)}</select></div>)}
      {field('phone',copy.phone,<div className="phone-input"><span>+91</span><input {...attrs('phone')} type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="9876543210" /></div>)}
      {field('email','Email (optional)',<input {...attrs('email')} required={false} type="email" autoComplete="email" maxLength={254} />)}
    </div>
    <div className="honeypot" aria-hidden="true"><label htmlFor="booking-website">Website</label><input id="booking-website" name="website" value={values.website} onChange={change} tabIndex={-1} autoComplete="off" /></div>
    <p className="booking-estimate" aria-live="polite">{estimate && <>Estimated: {estimate.days} days × {formatPrice(estimate.rate)} = <strong>{formatPrice(estimate.total)}</strong> <small>({copy.estimateNote})</small></>}</p>
    {selectedService==='self-drive' && <p className="booking-note">{copy.licence}</p>}
    <p className="booking-consent">{copy.consent} <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/cancellation">Cancellation</a></p>
    <div className="booking-errors" role="status" aria-live="polite">{errors.form || (Object.values(errors).some(Boolean) ? Object.values(errors).filter(Boolean).join(' ') : '')}</div>
    </div><div className="booking-actions"><button className="booking-submit" aria-label={busy?copy.pending:copy.submit} disabled={busy} type="submit">{busy?copy.pending:copy.submit} →</button>
    <button className="whatsapp-button" aria-label={copy.whatsapp} disabled={busy} type="button" onClick={event=>send(event,true)}>{copy.whatsapp} ↗</button>
    </div>
  </form>
}
