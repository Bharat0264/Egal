import {renderToString} from 'react-dom/server'
import RoutePage from './pages/RoutePage'
import SimplePage from './pages/SimplePage'
import {SelectionProvider} from './state/SelectionContext'
import {brand} from './data/brand'
import {faq} from './data/faq'
import {pageMeta} from './lib/pageMeta'
export const routes=['/','/simple','/privacy','/terms','/cancellation']
export const site=pageMeta('/').site
export function render(path){return renderToString(<RoutePage path={path}/>)}
export function noScript(){return renderToString(<SelectionProvider><SimplePage noScript/></SelectionProvider>)}
export function metadata(path){
 const {title,description}=pageMeta(path)
 const business={'@context':'https://schema.org','@type':'AutoRental',name:brand.name,url:site,telephone:brand.phone,address:{'@type':'PostalAddress',streetAddress:brand.address},openingHours:brand.openingHours,priceRange:brand.priceRange}
 const jsonld=[business];if(path==='/simple')jsonld.push({'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(item=>({'@type':'Question',name:item.question,acceptedAnswer:{'@type':'Answer',text:item.answer}}))})
 return{title,description,canonical:site+(path==='/'?'/':path),jsonld}
}
