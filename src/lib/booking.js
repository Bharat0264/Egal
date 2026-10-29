import {brand} from '../data/brand'
import {cars} from '../data/cars'
import {bookingCopy} from '../data/booking'
import {track} from './analytics'
export {localToday,validateBooking,bookingEstimate} from './booking-rules.js'
import {validateBooking,bookingEstimate} from './booking-rules.js'
export function whatsappUrl(data){
 const car=cars.find(car=>car.id===data.carId),estimate=bookingEstimate(data)
 const text=[`${brand.name} booking request`,`Pick-up: ${data.pickup}`,`Drop-off: ${data.dropoff}`,`Location: ${data.location.trim()}`,`Car: ${car?.name||car?.category}`,`Colour: ${data.color}`,`Service: ${data.service}`,`Phone: +91 ${data.phone}`,data.email&&`Email: ${data.email}`,estimate&&`Estimated: ${estimate.days} days x ₹${estimate.rate} = ₹${estimate.total}`,'Final price, deposit and taxes confirmed by the team.'].filter(Boolean).join('\n')
 return `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(text)}`
}
function draft(data,fallback=false){
 const url=whatsappUrl(data);track('whatsapp_click',{source:fallback?'fallback':'button'})
 // Async failure may be blocked by popup policies; the confirmation always has a real link.
 window.open(url,'_blank','noopener,noreferrer')
 return{channel:'whatsapp',url,fallback}
}
export async function submitBooking(data,{whatsappOnly=false}={}){
 if(Object.keys(validateBooking(data)).length)throw new Error(bookingCopy.errors.spam)
 if(whatsappOnly)return draft(data)
 const payload={pickup:data.pickup,dropoff:data.dropoff,location:data.location.trim(),carId:data.carId,color:data.color,service:data.service,phone:data.phone,email:data.email||'',website:data.website||''}
 try{
  const response=await fetch(import.meta.env?.VITE_BOOKING_ENDPOINT||'/api/booking',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)})
  const result=await response.json()
  if(!response.ok||result.ok!==true)throw new Error('Booking unavailable')
  track('form_submit_success',{channel:'endpoint'});return{channel:'endpoint'}
 }catch{return draft(data,true)}
}
