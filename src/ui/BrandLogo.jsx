import {useState} from 'react'
import {brand} from '../data/brand'
export default function BrandLogo({compact=false}){
 const[failed,setFailed]=useState(false)
 return failed?<span className="brand-wordmark"><span>E</span>gal</span>:<span className={`brand-logo${compact?' brand-logo--compact':''}`}><img src={`${import.meta.env.BASE_URL}${brand.logo}`} width="2172" height="724" alt="Egal" draggable="false" fetchPriority={compact?'auto':'high'} onError={()=>setFailed(true)}/></span>
}
