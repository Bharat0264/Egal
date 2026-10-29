import {useEffect,useState} from 'react'
import {brand} from '../data/brand'
import BrandLogo from './BrandLogo'
import {track} from '../lib/analytics'
export default function Loader({onStart,onSkip,onIntent,ready=false,progress=0}){
 const[staticReveal,setStatic]=useState(true)
 useEffect(()=>{setStatic(matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse), (max-width:767px)').matches||navigator.hardwareConcurrency<=4||(navigator.deviceMemory&&navigator.deviceMemory<=4))},[])
 const value=ready?100:Math.min(progress,99)
 return <main id="main-content" tabIndex={-1} className="loader cinematic-opening" data-static={Boolean(staticReveal)}>
  <div className="opening-curtain" aria-hidden="true"/><div className="opening-copy">
   <span className="eyebrow">A NEW JOURNEY AWAITS</span><div className="opening-logo"><BrandLogo/></div><p className="sr-only">{brand.tagline}</p>
   <div className="loading-track" role="progressbar" aria-label="Loading scene" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}><div style={{width:`${value}%`}}/></div>
   <span className="loading-label" role="status">{Math.round(value)}% · {ready?'Ready when you are':'Preparing your journey'}</span>
   <button className="primary start" onPointerEnter={onIntent} onFocus={onIntent} onClick={onStart}>START <span aria-hidden="true">↗</span></button>
   <button className="skip-intro" onClick={onSkip}>Skip introduction <span aria-hidden="true">→</span></button>
   <a className="simple-view-link" href="/simple" onClick={()=>track('simple_view_click')}>Simple view — no 3D</a>
   <p className="sound-hint">Turn sound on for the best experience</p>
  </div>
 </main>
}
