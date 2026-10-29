import {hydrateRoot,createRoot} from 'react-dom/client'
import RoutePage from './pages/RoutePage'
import {initAnalytics} from './lib/analytics'
import './index.css'
import {pageMeta} from './lib/pageMeta'
const path=location.pathname.replace(/\/$/,'')||'/',root=document.getElementById('root'),page=<RoutePage path={path}/>
if(root.dataset.prerendered==='true')hydrateRoot(root,page);else createRoot(root).render(page)
const meta=pageMeta(path)
document.title=meta.title
for(const[name,value]of Object.entries({description:meta.description,'og:title':meta.title,'og:description':meta.description,'og:url':meta.canonical,'twitter:title':meta.title,'twitter:description':meta.description})){
 let el=document.head.querySelector(`meta[name="${name}"],meta[property="${name}"]`)
 if(!el){el=document.createElement('meta');el.setAttribute(name.startsWith('og:')?'property':'name',name);document.head.appendChild(el)}
 el.content=value
}
let canonical=document.querySelector('link[rel=canonical]')
if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}
canonical.href=meta.canonical
initAnalytics()
if(path==='/simple'&&new URLSearchParams(location.search).has('reason')){const note=document.createElement('p');note.className='fallback-notice';note.setAttribute('role','status');note.textContent='The 3D experience is unavailable on this device. You can use all booking and contact features here.';document.body.prepend(note)}
