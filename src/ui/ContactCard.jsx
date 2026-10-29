import { brand } from '../data/brand'
import { contactCopy as copy } from '../data/booking'
import { useSelection } from '../state/SelectionContext'
import SocialIcon from './SocialIcon'
import {track} from '../lib/analytics'
function SocialLink({type,url}){const Tag=url?'a':'span';return <Tag className={`social-${type}`} {...(url?{href:url,target:'_blank',rel:'noopener noreferrer'}:{role:'img','aria-disabled':true})} aria-label={`${type}${url?'':` ${copy.missing}`}`} title={url?type:`${type}: ${copy.missing}`}><SocialIcon type={type}/></Tag>}
export default function ContactCard() {
  const {backToStart}=useSelection()
  const hasAddress=!brand.address.includes('TO BE FILLED'), hasPhone=/^\+?\d{10,15}$/.test(brand.phone)
  return <>
    <div className="contact-copy-pill"><p className="contact-subtitle">{copy.subtitle}</p><p className="contact-farewell">{copy.farewell}</p></div>
    <aside className="scene-card contact-card" aria-label="Contact Egal">
      <dl><div><dt><span aria-hidden="true">⌖</span>{copy.location}</dt><dd>{hasAddress?<a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(brand.address)}`} target="_blank" rel="noopener noreferrer">{brand.address} ↗</a>:brand.address}</dd></div>
      <div><dt><span aria-hidden="true">☎</span>{copy.call}</dt><dd>{hasPhone?<a onClick={()=>track("call_click")} href={`tel:${brand.phone}`}>{brand.phone}</a>:`${brand.phone} ${copy.missing}`}</dd></div>
      <div><dt><span aria-hidden="true">◷</span>{copy.hours}</dt><dd>{brand.hours}</dd></div></dl>
      <h2 className="follow-title">{copy.follow}</h2><nav className="social-links" aria-label="Follow Egal">{Object.entries(brand.socials).map(([type,url])=><SocialLink key={type} type={type} url={url}/>)}</nav>
      <button className="back-to-start" onClick={backToStart}>← {copy.back}</button>
    </aside>
  </>
}
