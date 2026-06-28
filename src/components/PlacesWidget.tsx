'use client'
import { useEffect, useState } from 'react'

interface Place { id: number; name: string; lat: number; lng: number; type: string; address?: string; distance?: string }

const TYPES = [
  { id: 'pharmacy', label: '약국', emoji: '💊' },
  { id: 'hospital', label: '병원', emoji: '🏥' },
  { id: 'convenience', label: '편의점', emoji: '🏪' },
  { id: 'cafe', label: '카페', emoji: '☕' },
  { id: 'subway', label: '지하철', emoji: '🚇' },
  { id: 'bank', label: '은행', emoji: '🏦' },
]

export default function PlacesWidget({ lat, lng, onPlacesChange }: { lat: number; lng: number; onPlacesChange?: (places: Place[]) => void }) {
  const [type, setType] = useState('pharmacy')
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/places?lat=${lat}&lng=${lng}&type=${type}`)
      .then(r => r.json())
      .then(d => {
        const p = d.places || []
        setPlaces(p)
        onPlacesChange?.(p)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [lat, lng, type])

  const activeType = TYPES.find(t => t.id === type)

  return (
    <div>
      {/* 카테고리 버튼 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
        {TYPES.map(t => (
          <button key={t.id} onClick={() => setType(t.id)} style={{
            padding: '8px 4px', borderRadius: 10, fontSize: 11, border: 'none',
            cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s',
            background: type === t.id ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.07)',
            color: type === t.id ? '#93c5fd' : '#94a3b8',
            outline: type === t.id ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          }}>
            <span style={{ fontSize: 18 }}>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ height: 52, background: 'rgba(255,255,255,0.04)', borderRadius: 10 }} />
          ))}
        </div>
      ) : places.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{activeType?.emoji}</div>
          <p style={{ color: '#94a3b8', fontSize: 13 }}>주변 1km 내 {activeType?.label}이 없어요</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 2, letterSpacing: '0.05em' }}>
            {activeType?.emoji} 주변 {activeType?.label} {places.length}곳
          </p>
          {places.map((p, i) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.04)', borderRadius: 10,
              padding: '10px 12px', border: '1px solid rgba(255,255,255,0.05)',
              transition: 'background 0.15s',
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: 'rgba(59,130,246,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#60a5fa', fontWeight: 700, flexShrink: 0,
                border: '1px solid rgba(59,130,246,0.2)',
              }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: 'white', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                {p.address && <p style={{ fontSize: 10, color: '#64748b', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.address}</p>}
              </div>
              {p.distance && (
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>
                  {Number(p.distance) >= 1000 ? (Number(p.distance)/1000).toFixed(1)+'km' : p.distance+'m'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
