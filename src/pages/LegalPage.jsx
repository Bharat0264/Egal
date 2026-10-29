import {brand} from '../data/brand'
import {legal} from '../data/legal'
import SiteFooter from '../ui/SiteFooter'
export default function LegalPage({page}){const content=legal[page];return <div className="simple-page legal-page"><a className="skip-link" href="#main-content">Skip to content</a><header className="simple-header"><a href="/">Egal</a><a href="/simple">Simple view</a></header><main id="main-content" tabIndex={-1}><h1>{content.title}</h1><p className="review-notice">PLACEHOLDER — must be reviewed before launch.</p>{content.sections.map(([title,text])=><section key={title}><h2>{title}</h2><p>{text}</p></section>)}<p>{brand.address} · {brand.phone}</p></main><footer><SiteFooter/></footer></div>}
