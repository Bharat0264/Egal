import{useEffect,useRef,useState}from'react'
import{Howl,Howler}from'howler'

export default function SoundToggle({started=false,scrollRef}){
 const[enabled,setEnabled]=useState(false),preference=useRef(false),begun=useRef(started),tracks=useRef([])
 const play=()=>{
  if(!begun.current||!preference.current||document.hidden)return
  if(!tracks.current.length)for(const[type,file]of Object.entries(__EGAL_ASSETS__.audio||{}))if(file){
   const item={type,id:null,failed:false,volume:type==='engine'?.035:.09}
   item.howl=new Howl({src:[`${import.meta.env.BASE_URL}audio/${file}`],loop:true,volume:0,onloaderror:()=>{item.failed=true},onplayerror:()=>{item.howl.once('unlock',()=>{if(preference.current&&!document.hidden)item.howl.play(item.id)})}});tracks.current.push(item)
  }
  if(!tracks.current.length)return
  Howler.mute(false)
  for(const item of tracks.current)if(!item.failed&&!item.howl.playing(item.id??undefined)){item.id=item.howl.play(item.id??undefined);item.howl.fade(0,item.volume,650,item.id)}
 }
 const pause=()=>{for(const item of tracks.current){item.howl.once('fade',()=>{if(!preference.current||document.hidden)item.howl.pause()});item.howl.fade(item.howl.volume(item.id),0,250,item.id)}}
 useEffect(()=>{
  try{preference.current=sessionStorage.getItem('egal-sound')==='on';setEnabled(preference.current)}catch{}
  const start=()=>{begun.current=true;play()},visibility=()=>{if(document.hidden){if(tracks.current.length)Howler.mute(true);for(const item of tracks.current)item.howl.pause()}else play()}
  window.addEventListener('egal-start',start);document.addEventListener('visibilitychange',visibility)
  return()=>{window.removeEventListener('egal-start',start);document.removeEventListener('visibilitychange',visibility);if(tracks.current.length)Howler.mute(true);for(const item of tracks.current)item.howl.unload()}
 },[])
 useEffect(()=>{begun.current=started;if(started&&enabled)play();let previous=0
  const tick=time=>{if(!enabled||!started||document.hidden||time-previous<.15)return;previous=time;const speed=Math.min(1,(scrollRef?.current?.delta||0)*30);for(const item of tracks.current)if(item.type==='engine'&&!item.failed){item.howl.rate(.9+speed*.25,item.id);item.howl.volume(.025+speed*.035,item.id)}}
  let cancelled=false,gsap;if(enabled&&started&&__EGAL_ASSETS__.audio?.engine)import('gsap').then(module=>{if(!cancelled){gsap=module.default;gsap.ticker.add(tick)}}).catch(()=>{});return()=>{cancelled=true;gsap?.ticker.remove(tick)}
 },[started,enabled,scrollRef])
 const toggle=()=>{preference.current=!preference.current;setEnabled(preference.current);try{sessionStorage.setItem('egal-sound',preference.current?'on':'off')}catch{}if(preference.current)play();else pause()}
 return <button className="sound-toggle" aria-label={enabled?'Mute sound':'Unmute sound'} aria-pressed={enabled} onClick={toggle}>{enabled?'Sound on':'Sound off'} <span aria-hidden="true">{enabled?'◉':'○'}</span></button>
}
