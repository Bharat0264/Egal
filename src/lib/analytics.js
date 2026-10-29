const events=new Set(['start_click','scene_reached','car_selected','colour_changed','book_this_car','form_started','form_error','form_submit_success','whatsapp_click','call_click','simple_view_click'])
const allowed={scene:['fleet','services','booking','contact'],car:['hatchback','sedan','suv','premium-suv','luxury-suv'],field:['pickup','dropoff','location','carId','phone','email','form','color','service'],channel:['endpoint','whatsapp'],source:['button','fallback','link'],view:['simple','3d']}
let configured=false,provider='',queue=[]
export function safeAnalyticsProps(props={}){const result={};for(const[key,values]of Object.entries(allowed))if(values.includes(props[key]))result[key]=props[key];if(Number.isInteger(props.colour)&&props.colour>=0&&props.colour<5)result.colour=props.colour;return result}
const routes=new Set(['/','/simple','/privacy','/terms','/cancellation'])
const cleanUrl=value=>{if(!value)return '';try{const url=new URL(value,location.origin),path=url.pathname.replace(/\/$/,'')||'/';return url.origin+(url.origin===location.origin&&routes.has(path)?path:'/')}catch{return''}}
function send(event,props){
 if(provider==='umami'&&window.umami){window.umami.track(event,props);return true}
 if(provider==='plausible'&&window.plausible){window.plausible(event,{props,url:cleanUrl(location.href),u:cleanUrl(location.href)});return true}
 return false
}
export function track(event,props={}){
 if(typeof window==='undefined'||!import.meta.env.VITE_ANALYTICS_ID||!events.has(event))return
 const safe=safeAnalyticsProps(props)
 if(!send(event,safe)&&queue.length<40)queue.push([event,safe])
}
export function initAnalytics(){
 if(configured||typeof window==='undefined'||!import.meta.env.VITE_ANALYTICS_ID||navigator.doNotTrack==='1')return
 const id=import.meta.env.VITE_ANALYTICS_ID,url=import.meta.env.VITE_ANALYTICS_SCRIPT_URL
 provider=import.meta.env.VITE_ANALYTICS_PROVIDER||'umami'
 if(!['umami','plausible'].includes(provider)||!url)return
 let parsed;try{parsed=new URL(url);if(parsed.protocol!=='https:')return}catch{return}
 configured=true
 const script=document.createElement('script');script.src=parsed.href;script.defer=true;script.dataset.autoTrack='false';script.dataset.autoPageview='false'
 if(provider==='umami'){
  script.dataset.websiteId=id
  window.egalAnalyticsBeforeSend=(_type,payload)=>({...payload,url:cleanUrl(payload.url||location.href),referrer:cleanUrl(payload.referrer||''),...(payload.data?{data:safeAnalyticsProps(payload.data)}:{})})
  script.dataset.beforeSend='egalAnalyticsBeforeSend'
 }else{
  script.dataset.domain=id
  const pending=function(){(pending.q ||= []).push(arguments)}
  pending.init=options=>{pending.o=options}
  window.plausible=pending
  pending.init({autoCapturePageviews:false,outboundLinks:false,fileDownloads:false,formSubmissions:false,transformRequest:payload=>({...payload,u:cleanUrl(payload.u||location.href),r:cleanUrl(payload.r||''),...(payload.p?{p:safeAnalyticsProps(payload.p)}:{})})})
 }
 script.onload=()=>{if(provider==='umami')window.umami?.track({website:id,url:cleanUrl(location.href),referrer:cleanUrl(document.referrer),title:document.title});else window.plausible?.('pageview',{url:cleanUrl(location.href),u:cleanUrl(location.href)});for(const[event,props]of queue)send(event,props);queue=[]}
 script.onerror=()=>{queue=[]}
 document.head.appendChild(script)
}
