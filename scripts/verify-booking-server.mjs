import assert from 'node:assert/strict'
import {createBookingHandler} from '../api/booking.js'
import {safeAnalyticsProps} from '../src/lib/analytics.js'
const good={pickup:'2099-06-01',dropoff:'2099-06-04',location:'Airport',carId:'premium-suv',phone:'9876543210',color:'#ffffff',service:'self-drive',email:'customer@example.invalid',website:'',estimate:{total:1}}
const env={RESEND_API_KEY:'test-only-key',BOOKING_TO_EMAIL:'owner@example.invalid',BOOKING_FROM_EMAIL:'Egal <booking@example.invalid>'}
const sent=[]
const handler=options=>createBookingHandler({env,limits:new Map(),fetchImpl:async(url,options)=>{sent.push({url,...options});return{ok:true}},...options})
async function request(fn,body=good,options={}){let result;const headers={};await fn({method:'POST',headers:{'content-type':'application/json',host:'localhost','x-vercel-forwarded-for':'127.0.0.1',...options.headers},body,...Object.fromEntries(Object.entries(options).filter(([key])=>key!=='headers'))},{setHeader:(k,v)=>headers[k]=v,set statusCode(value){this.status=value},end(value){result={status:this.status,body:JSON.parse(value),headers}}});return result}
assert.equal((await request(handler())).status,200);assert.equal(sent.length,2)
assert.match(JSON.parse(sent[0].body).text,/3 days x INR 4299 = INR 12897/)
assert.equal(JSON.parse(sent[0].body).reply_to,good.email);assert.notEqual(sent[0].headers['Idempotency-Key'],sent[1].headers['Idempotency-Key'])
for(const patch of[{pickup:'2020-01-01'},{pickup:'2099-02-30'},{dropoff:good.pickup},{dropoff:'2099-05-01'},{location:''},{location:'x'.repeat(201)},{phone:'1234567890'},{phone:'98765'},{carId:'bad'},{email:'not-an-email'},{email:'a@b.invalid\r\nbcc:x@y.invalid'},{website:'bot'},{service:'bad'},{color:'#123456'}])assert.equal((await request(handler(),{...good,...patch})).status,400)
assert.equal((await request(handler(),null)).status,400);assert.equal((await request(handler(),'bad json')).status,400)
assert.equal((await request(handler(),good,{method:'GET'})).status,405)
assert.equal((await request(handler(),good,{headers:{'content-type':'text/plain'}})).status,415)
assert.equal((await request(handler(),good,{headers:{'content-length':'8193'}})).status,413)
assert.equal((await request(handler(),{...good,extra:'x'.repeat(9000)})).status,413)
assert.equal((await request(handler(),good,{headers:{origin:'https://evil.invalid'}})).status,403)
assert.equal((await request(handler({env:{}}))).status,503)
assert.equal((await request(handler({fetchImpl:async()=>({ok:false})}))).status,502)
let calls=0;const replyFailure=await request(handler({fetchImpl:async()=>({ok:++calls===1})}));assert.equal(replyFailure.status,200);assert.equal(replyFailure.body.replySent,false)
const encoded=new URLSearchParams({...good,email:'',estimate:''}).toString();assert.equal((await request(handler(),encoded,{headers:{'content-type':'application/x-www-form-urlencoded'}})).status,200)
const limited=handler();for(let i=0;i<5;i++)assert.equal((await request(limited)).status,200);const limit=await request(limited);assert.equal(limit.status,429);assert.ok(+limit.headers['Retry-After']>0)
await request(handler(),{...good,location:'<b> Airport </b>\r\nNext line'});assert.ok(!JSON.parse(sent.at(-2).body).text.includes('<b>'))
assert.deepEqual(safeAnalyticsProps({car:'suv',colour:2,email:'private',phone:'9876543210',location:'secret',scene:'booking',view:'simple'}),{scene:'booking',car:'suv',view:'simple',colour:2})
console.log('PASS shared/server validation, estimates, size/type/origin limits, rate limits, sanitisation, mocked email/autoreply, failure handling, idempotency and analytics PII allowlist. No real email was sent.')
