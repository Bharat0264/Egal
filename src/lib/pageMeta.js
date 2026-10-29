import {brand} from '../data/brand'
import {legal} from '../data/legal'
export function pageMeta(path){
 const parsed=new URL(brand.url)
 if(!['https:','http:'].includes(parsed.protocol))throw new Error('VITE_SITE_URL must be an HTTP(S) site origin.')
 const site=parsed.origin
 const title=path==='/'?`${brand.name} | ${brand.tagline}`:path==='/simple'?`${brand.name} car rental | Simple view`:`${legal[path.slice(1)]?.title||'Egal'} | ${brand.name}`
 const description=path==='/'?'Explore Egal car rentals: self-drive, chauffeur and outstation journeys. Choose your ride and discover your next horizon.':path==='/simple'?'Browse Egal car categories, seats, fuel and starting prices. Explore services, request a booking and find contact details without a 3D experience.':legal[path.slice(1)]?.description||brand.tagline
 return{title,description,canonical:site+(path==='/'?'/':path),site}
}
