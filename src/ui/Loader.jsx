import { useProgress } from '@react-three/drei'
import { brand } from '../data/brand'
export default function Loader({ onStart }) {
  const { progress, active, total } = useProgress()
  const ready = !active && (total === 0 || progress >= 100)
  const value = ready ? 100 : progress
  return <div className="loader"><span className="eyebrow">A NEW JOURNEY AWAITS</span><h1 className="wordmark"><span>E</span>gal</h1><p>{brand.tagline}</p><div className="loading-track" role="progressbar" aria-label="Loading scene" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}><div style={{ width: `${value}%` }} /></div><span className="loading-label">{Math.round(value)}% · {ready ? 'Ready when you are' : 'Preparing your journey'}</span>{ready && <button className="primary start" onClick={onStart}>START <span aria-hidden="true">↗</span></button>}<p className="sound-hint">Turn sound on for the best experience</p></div>
}
