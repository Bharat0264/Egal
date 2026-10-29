import {createHash} from 'node:crypto'
import {validateBooking,bookingEstimate,sanitiseText} from '../src/lib/booking-rules.js'
import {cars} from '../src/data/cars.js'
import {brand} from '../src/data/brand.js'

const MAX_BODY=8192,WINDOW=15*60*1000
// Per-instance abuse guard; use the Vercel Firewall for a distributed limit.
const attempts=new Map()
export function createBookingHandler({fetchImpl=(...args)=>fetch(...args),env=process.env,now=Date.now,limits=attempts}={}){
 return async function booking(req,res){
  const respond=(status,body)=>{res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.statusCode=status;res.end(JSON.stringify(body))}
  if(req.method!=='POST'){res.setHeader('Allow','POST');return respond(405,{ok:false,error:'Use POST.'})}
  if(req.headers.origin){try{const origin=new URL(req.headers.origin),host=req.headers.host;if(origin.host!==host)return respond(403,{ok:false,error:'Origin not allowed.'})}catch{return respond(403,{ok:false,error:'Origin not allowed.'})}}
  const ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim()
  const key=createHash('sha256').update(ip).digest('hex'),time=now()
  for(const[id,value]of limits)if(value.until<=time)limits.delete(id)
  if(limits.size>=5000&&!limits.has(key))return respond(429,{ok:false,error:'Please try again later.'})
  const rate=limits.get(key)||{count:0,until:time+WINDOW};rate.count++;limits.set(key,rate)
  if(rate.count>5){res.setHeader('Retry-After',String(Math.ceil((rate.until-time)/1000)));return respond(429,{ok:false,error:'Too many requests. Please try again later.'})}
  const formEncoded=/^application\/x-www-form-urlencoded(?:;|$)/i.test(req.headers['content-type']||'')
  if(!formEncoded&&!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return respond(415,{ok:false,error:'Send JSON or a form.'})
  const parse=raw=>formEncoded?Object.fromEntries(new URLSearchParams(raw)):JSON.parse(raw)
  let data
  try{
   if(Number(req.headers['content-length']||0)>MAX_BODY)return respond(413,{ok:false,error:'Request too large.'})
   if(req.body!==undefined){const raw=Buffer.isBuffer(req.body)?req.body.toString():typeof req.body==='string'?req.body:JSON.stringify(req.body);if(Buffer.byteLength(raw)>MAX_BODY)return respond(413,{ok:false,error:'Request too large.'});data=typeof req.body==='object'&&!Buffer.isBuffer(req.body)?req.body:parse(raw)}
   else{let size=0,chunks=[];for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>MAX_BODY)return respond(413,{ok:false,error:'Request too large.'});chunks.push(Buffer.from(chunk))}data=parse(Buffer.concat(chunks).toString())}
  }catch{return respond(400,{ok:false,error:'Invalid JSON.'})}
  if(!data||Array.isArray(data)||typeof data!=='object')return respond(400,{ok:false,error:'Invalid request.'})
  const errors=validateBooking(data)
  if(Object.keys(errors).length)return respond(400,{ok:false,error:'Please check the form.',errors})
  const location=sanitiseText(data.location)
  if(!location)return respond(400,{ok:false,errors:{location:'Enter your pick-up location.'}})
  if(!env.RESEND_API_KEY||!env.BOOKING_TO_EMAIL||!env.BOOKING_FROM_EMAIL)return respond(503,{ok:false,error:'Email booking is not configured. Please use WhatsApp.'})
  const lead={pickup:data.pickup,dropoff:data.dropoff,location,carId:data.carId,phone:data.phone,email:data.email||'',color:data.color||'#ffffff',service:data.service||'self-drive'},estimate=bookingEstimate(lead),car=cars.find(car=>car.id===lead.carId)
  const text=[`${brand.name} booking request`,`Pick-up: ${lead.pickup}`,`Drop-off: ${lead.dropoff}`,`Location: ${lead.location}`,`Car: ${car.name||car.category}`,`Colour: ${lead.color}`,`Service: ${lead.service}`,`Phone: +91 ${lead.phone}`,lead.email&&`Email: ${lead.email}`,`Estimated: ${estimate.days} days x INR ${estimate.rate} = INR ${estimate.total}`,'Final price, deposit and taxes are confirmed by the team.'].filter(Boolean).join('\n')
  const id=createHash('sha256').update(JSON.stringify(lead)).digest('hex')
  const send=async(email,suffix)=>{
   const response=await fetchImpl('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`${id}-${suffix}`},body:JSON.stringify(email),signal:AbortSignal.timeout(12000)})
   if(!response.ok)throw new Error('Email service unavailable')
  }
  try{await send({from:env.BOOKING_FROM_EMAIL,to:[env.BOOKING_TO_EMAIL],...(lead.email?{reply_to:lead.email}:{}),subject:`${brand.name}: ${car.category} booking request`,text},'lead')}
  catch{return respond(502,{ok:false,error:'Email is temporarily unavailable. Please use WhatsApp.'})}
  let replySent=false
  if(lead.email){try{await send({from:env.BOOKING_FROM_EMAIL,to:[lead.email],subject:`${brand.name}: we received your request`,text:`We received your request and will confirm availability and final charges shortly. This is not a confirmed reservation.\n\n${text}`},'reply');replySent=true}catch{/* The lead succeeded: never invite a duplicate submission for reply failure. */}}
  return respond(200,{ok:true,replySent})
 }
}
export default createBookingHandler()
