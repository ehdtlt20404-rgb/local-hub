'use client'
import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'

interface BusStop {
  id: number; name: string; lat: number; lng: number; distance: number; ref: string
}

function dist(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
}

export default function BusWidget({ lat, lng }: { lat: number; lng: number }) {
  const [stops, setStops] = useState<BusStop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')

    const query = `[out:json][timeout:15];node["highway"="bus_stop"](around:700,${lat},${lng});out body;`
    fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
      .then(r => {
        if (!r.ok) throw new Error(`Overpass ${r.status}`)
        return r.json()
      })
      .then(data => {
        const els = (data.elements || []) as any[]
        const result: BusStop[] = els
          .map(el => ({
            id: el.id, name: el.tags?.name || el.tags?.['name:ko'] || '버스정류장',
            lat: el.lat, lng: el.lon, ref: el.tags?.ref || '',
            distance: dist(lat, lng, el.lat, el.lon),
          }))
          .filter(s => s.distance <= 700)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 12)
        setStops(result)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [lat, lng])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.06))',
        borderRadius: 12, padding: '10px 14px', border: '1px solid rgba(59,130,246,0.15)',
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>🚌 주변 버스 정류장</p>
        <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>700m 이내 · 클릭하면 대전 버스 정보시스템에서 실시간 도착 정보 확인</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ height: 58, borderRadius: 12, background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
          ))}
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#ef4444', fontSize: 12 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>⚠️</div>
          정류장 데이터를 불러올 수 없어요
          <span style={{ fontSize: 10, color: '#475569', display: 'block', marginTop: 4 }}>{error}</span>
        </div>
      ) : stops.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#475569', fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🔍</div>
          700m 내 등록된 정류장이 없어요
        </div>
      ) : stops.map(stop => (
        <a
          key={stop.id}
          href={`https://bus.daejeon.go.kr/busstop/busstopSearch.do?searchKeyword=${encodeURIComponent(stop.name)}`}
          target="_blank" rel="noreferrer"
          style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 12,
            padding: '11px 13px', border: '1px solid rgba(255,255,255,0.07)',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', transition: 'all 0.15s', textDecoration: 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
        >
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>
              🚏 {stop.name}
              {stop.ref && <span style={{ fontSize: 10, color: '#64748b', marginLeft: 6 }}>({stop.ref}번)</span>}
            </p>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>대전 버스 정보시스템에서 실시간 도착 확인</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>{stop.distance}m</span>
            <ExternalLink size={12} color="#475569" />
          </div>
        </a>
      ))}
    </div>
  )
}
