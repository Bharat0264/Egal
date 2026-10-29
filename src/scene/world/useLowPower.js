import { useEffect, useState } from 'react'

export default function useLowPower() {
  const detect = () => window.matchMedia('(max-width: 767px), (pointer: coarse)').matches || navigator.hardwareConcurrency <= 4 || (navigator.deviceMemory && navigator.deviceMemory <= 4)
  const [low, setLow] = useState(detect)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px), (pointer: coarse)')
    const update = () => setLow(detect()); query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return low
}
