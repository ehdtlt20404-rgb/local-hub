import { useState, useEffect } from 'react'

export interface RecentPlace {
  name: string; lat: number; lng: number; sido: string; timestamp: number
}

export function useRecentPlaces() {
  const [places, setPlaces] = useState<RecentPlace[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('recent-places')
      if (stored) setPlaces(JSON.parse(stored))
    } catch {}
  }, [])

  function add(p: Omit<RecentPlace, 'timestamp'>) {
    setPlaces(prev => {
      const filtered = prev.filter(r => !(Math.abs(r.lat - p.lat) < 0.002 && Math.abs(r.lng - p.lng) < 0.002))
      const next = [{ ...p, timestamp: Date.now() }, ...filtered].slice(0, 8)
      try { localStorage.setItem('recent-places', JSON.stringify(next)) } catch {}
      return next
    })
  }

  function remove(timestamp: number) {
    setPlaces(prev => {
      const next = prev.filter(r => r.timestamp !== timestamp)
      try { localStorage.setItem('recent-places', JSON.stringify(next)) } catch {}
      return next
    })
  }

  function clear() {
    setPlaces([])
    try { localStorage.removeItem('recent-places') } catch {}
  }

  return { places, add, remove, clear }
}
