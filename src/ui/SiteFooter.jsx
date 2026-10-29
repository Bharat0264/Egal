import {track} from '../lib/analytics'
export default function SiteFooter(){return <nav className="site-footer-links" aria-label="Website information"><a href="/simple" onClick={()=>track('simple_view_click')}>Simple view</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/cancellation">Cancellation</a></nav>}
