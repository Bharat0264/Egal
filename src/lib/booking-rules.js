import {cars,carColors} from '../data/cars.js'
import {bookingCopy} from '../data/booking.js'
import {services} from '../data/services.js'

export function localToday(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now)
 const value=type=>parts.find(part=>part.type===type).value
 return `${value('year')}-${value('month')}-${value('day')}`
}
export function dateValue(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return NaN
 const date=new Date(`${value}T00:00:00Z`)
 return Number.isFinite(+date)&&date.toISOString().slice(0,10)===value?+date:NaN
}
export function validateBooking(data,today=localToday()){
 const errors={},copy=bookingCopy.errors,pickup=dateValue(data.pickup),dropoff=dateValue(data.dropoff)
 if(!Number.isFinite(pickup)||pickup<dateValue(today))errors.pickup=copy.pickup
 if(!Number.isFinite(dropoff)||!Number.isFinite(pickup)||dropoff<=pickup)errors.dropoff=copy.dropoff
 if(typeof data.location!=='string'||!data.location.trim()||data.location.length>200)errors.location=copy.location
 if(!cars.some(car=>car.id===data.carId))errors.carId=copy.car
 if(typeof data.phone!=='string'||!/^[6-9]\d{9}$/.test(data.phone))errors.phone=copy.phone
 if(data.email&&(typeof data.email!=='string'||data.email.length>254||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(data.email)))errors.email='Enter a valid email address or leave it blank.'
 if(data.service&&!services.some(service=>service.id===data.service))errors.service='Choose a valid service.'
 if(data.color&&!carColors.includes(data.color))errors.color='Choose a listed car colour.'
 if(data.website)errors.form=copy.spam
 return errors
}
export function bookingEstimate(data){
 const car=cars.find(car=>car.id===data.carId),days=(dateValue(data.dropoff)-dateValue(data.pickup))/86400000
 return car&&Number.isInteger(days)&&days>0?{days,rate:car.price,total:days*car.price}:null
}
export const sanitiseText=value=>String(value??'').replace(/[<>\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim()
