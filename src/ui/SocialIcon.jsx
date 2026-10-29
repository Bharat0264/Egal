const paths = {
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="18" cy="6" r=".6"/></>,
  youtube: <><rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3Z"/></>,
  facebook: <path d="M14 22V13h3l.5-4H14V7c0-1 .5-2 2-2h2V1h-3c-4 0-5 2-5 6v2H7v4h3v9"/>,
  linkedin: <><path d="M4 9v12M10 21V9h4v2c2-3 6-2 6 2v8M4 4v.1"/></>,
  x: <><path d="m3 3 18 18M21 3 3 21M3 3h5l13 18h-5Z"/></>,
}
export default function SocialIcon({type}) {return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>}
