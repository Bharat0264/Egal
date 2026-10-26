import { useCallback, useRef, useState } from 'react'
import World from './scene/World'
import Loader from './ui/Loader'
import Overlay from './ui/Overlay'
import SoundToggle from './ui/SoundToggle'
export default function App() {
  const [started, setStarted] = useState(false), scrollRef = useRef(null)
  const captureScroll = useCallback((scroll) => { scrollRef.current = scroll }, [])
  const book = () => { const el = scrollRef.current?.el; if (el) el.scrollTo({ top: (el.scrollHeight - el.clientHeight) * 0.69, behavior: 'smooth' }) }
  return <><World onScrollReady={captureScroll} /><Overlay scrollRef={scrollRef} started={started} onBook={book} />{!started && <Loader onStart={() => setStarted(true)} />}<SoundToggle />{!started && <button className="primary book" onClick={() => { setStarted(true); book() }}>Book Now ↗</button>}</>
}
