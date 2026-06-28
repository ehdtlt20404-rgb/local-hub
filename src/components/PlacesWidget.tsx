'use client'
import { useEffect, useState } from 'react'
import { Phone, ExternalLink } from 'lucide-react'

interface Place {
  id: number; name: string; lat: number; lng: number
  type: string; address?: string; distance?: string; phone?: string; url?: string
}

const TYPES = [
  { id: 'pharmacy', label: '약국', emoji: '💊' },
  { id: 'hospital', label: '병원', emoji: '🏥' },
  { id: 'convenience', label: '편의점', emoji: '🏪' },
  { id: 'cafe', label: '카페', emoji: '☕' },
  { id: 'subway', label: '지하철', emoji: '🚇' },
  { id: 'bank', label: '은행', emoji: '🏦' },
]

function isLikelyOpen(name: string): 'open24' | 'unknown' {
  const n = name.toLowerCase()
  if (n.includes('24') || n.includes('이십사') || n.includes('야간') || n.includes('심야')) return 'open24'
  return 'unknown'
}

function getNowHour() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCHours()
}

function isNightTime() {
  const h = getNowHour()
  return h >= 22 || h < 9
}

export default function PlacesWidget({ lat, lng, onPlacesChange }: {
  lat: number; lng: number; onPlacesChange?: (places: Place[]) => void
}) {
  const [type, setType] = useState('pharmacy')
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(false)
  const nightMode = isNightTime()
  const activeType = TYPES.find(t => t.id === type)

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

  return (
    <div>
      {/* 야간 약국 안내 배너 */}
      {type === 'pharmacy' && nightMode && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.08))',
          border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10,
          padding: '8px 12px', marginBottom: 10, fontSize: 11, color: '#fca5a5',
        }}>
          🌙 야간 시간입니다. <b>24시 약국</b>을 확인하세요
        </div>
      )}

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
            <div key={i} style={{ height: 62, borderRadius: 10, background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
          ))}
        </div>
      ) : places.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{activeType?.emoji}</div>
          <p style={{ color: '#94a3b8', fontSize: 13 }}>주변 1km 내 {activeType?.label}이 없어요</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 2 }}>
            {activeType?.emoji} 주변 {activeType?.label} {places.length}곳
          </p>
          {places.map((p, i) => {
            const open24 = type === 'pharmacy' && isLikelyOpen(p.name) === 'open24'
            return (
              <div key={p.id} style={{
                background: open24 ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.04)',
                borderRadius: 10, padding: '10px 12px',
                border: open24 ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: open24 ? 'rgba(52,211,153,0.2)' : 'rgba(59,130,246,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: open24 ? '#34d399' : '#60a5fa', fontWeight: 700,
                    border: `1px solid ${open24 ? 'rgba(52,211,153,0.3)' : 'rgba(59,130,246,0.2)'}`,
                    marginTop: 1,
                  }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 13, color: 'white', fontWeight: 600 }}>{p.name}</p>
                      {open24 && (
                        <span style={{
                          fontSize: 9, fontWeight: 800, color: '#34d399',
                          background: 'rgba(52,211,153,0.15)', borderRadius: 4, padding: '1px 5px',
                        }}>24시간</span>
                      )}
                    </div>
                    {p.address && <p style={{ fontSize: 10, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.address}</p>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 5, alignItems: 'center' }}>
                      {p.phone && (
                        <a href={`tel:${p.phone}`} style={{
                          display: 'flex', alignItems: 'center', gap: 3,
                          fontSize: 10, color: '#60a5fa', textDecoration: 'none',
                          background: 'rgba(59,130,246,0.1)', borderRadius: 5, padding: '2px 7px',
                        }}>
                          <Phone size={9} />{p.phone}
                        </a>
                      )}
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noreferrer" style={{
                          display: 'flex', alignItems: 'center', gap: 3,
                          fontSize: 10, color: '#f59e0b', textDecoration: 'none',
                          background: 'rgba(245,158,11,0.1)', borderRadius: 5, padding: '2px 7px',
                        }}>
                          <ExternalLink size={9} />지도
                        </a>
                      )}
                    </div>
                  </div>
                  {p.distance && (
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>
                      {Number(p.distance) >= 1000 ? (Number(p.distance)/1000).toFixed(1)+'km' : p.distance+'m'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
