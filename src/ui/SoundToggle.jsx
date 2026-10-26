import { useEffect, useState } from 'react'
import { Howler } from 'howler'
export default function SoundToggle() {
  const [muted, setMuted] = useState(true)
  useEffect(() => { Howler.mute(muted) }, [muted])
  return <button className="sound-toggle" aria-label={muted ? 'Unmute sound' : 'Mute sound'} aria-pressed={!muted} onClick={() => setMuted(!muted)}>{muted ? 'Sound off' : 'Sound on'} <span aria-hidden="true">{muted ? '○' : '◉'}</span></button>
}
