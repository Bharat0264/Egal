import { services, serviceCopy } from '../data/services'
import { useSelection } from '../state/SelectionContext'
export default function ServicesPanel() {
  const { serviceId,setServiceId,bookService }=useSelection(), service=services.find(s=>s.id===serviceId)
  return <>
    <p className="service-hint">{serviceCopy.hint}</p>
    <nav className="service-choices" aria-label="Journey services">{services.map(s=><button key={s.id} aria-pressed={s.id===serviceId} onClick={()=>setServiceId(s.id===serviceId?null:s.id)}>{s.title}</button>)}</nav>
    {service && <aside className={`scene-card service-info ${service.id==='outstation'?'is-left':''}`} aria-label={`${service.title} details`}><button className="card-close" aria-label={serviceCopy.close} onClick={()=>setServiceId(null)}>×</button><h2>{service.title}</h2><p>{service.subtitle}</p><ul>{service.bullets.map(b=><li key={b}>{b}</li>)}</ul><button className="primary scene-book" onClick={bookService}>{serviceCopy.book} ↗</button></aside>}
  </>
}
