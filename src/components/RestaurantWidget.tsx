'use client'
import { useEffect, useState } from 'react'

interface Place { id: string; name: string; category: string; address: string; distance: number; phone: string; url: string }

const FOOD_EMOJI: Record<string, string> = {
  '한식': '🍚', '중식': '🍜', '일식': '🍣', '양식': '🍝', '분식': '🥡', '치킨': '🍗',
  '피자': '🍕', '햄버거': '🍔', '카페': '☕', '베이커리': '🥐', '술집': '🍺', '고기': '🥩',
}

function getFoodEmoji(category: string) {
  for (const [k, v] of Object.entries(FOOD_EMOJI)) {
    if (category.includes(k)) return v
  }
  return '🍽'
}

export default function RestaurantWidget({ lat, lng }: { lat: number; lng: number }) {
  const [tab, setTab] = useState<'restaurant' | 'cafe'>('restaurant')
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/restaurants?lat=${lat}&lng=${lng}&type=${tab}`)
      .then(r => r.json())
      .then(d => { setPlaces(d.places || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [lat, lng, tab])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* 탭 */}
      <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4 }}>
        {(['restaurant', 'cafe'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '7px 0', borderRadius: 7, fontSize: 12, fontWeight: 700,
            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            background: tab === t ? 'rgba(245,158,11,0.2)' : 'transparent',
            color: tab === t ? '#fbbf24' : '#94a3b8',
          }}>
            {t === 'restaurant' ? '🍽 음식점' : '☕ 카페'}
          </button>
        ))}
      </div>

      <div style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(234,88,12,0.05))',
        borderRadius: 12, padding: '10px 14px', border: '1px solid rgba(245,158,11,0.15)',
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>
          {tab === 'restaurant' ? '🍽 주변 음식점' : '☕ 주변 카페'}
        </p>
        <p style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>500m 이내 · 거리순 · 카카오맵 기반</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...Array(5)].map((_, i) => <div key={i} style={{ height: 62, background: 'rgba(255,255,255,0.04)', borderRadius: 12 }} />)}
        </div>
      ) : places.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#475569', fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🔍</div>주변에 {tab === 'restaurant' ? '음식점' : '카페'}이 없어요
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {places.map(p => (
            <div key={p.id} style={{
              background: 'rgba(255,255,255,0.04)', borderRadius: 12,
              padding: '10px 13px', border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, marginRight: 8 }}>
                  <span style={{ fontSize: 13 }}>{getFoodEmoji(p.category)}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'white', marginLeft: 5 }}>{p.name}</span>
                  <span style={{ fontSize: 10, color: '#64748b', marginLeft: 6 }}>{p.category}</span>
                </div>
                <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600, flexShrink: 0 }}>{p.distance}m</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
                <p style={{ fontSize: 11, color: '#64748b' }}>{p.address}</p>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {p.phone && (
                    <a href={`tel:${p.phone}`} style={{
                      fontSize: 10, color: '#34d399', textDecoration: 'none',
                      background: 'rgba(52,211,153,0.1)', borderRadius: 5, padding: '2px 6px',
                    }}>📞</a>
                  )}
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noreferrer" style={{
                      fontSize: 10, color: '#f59e0b', textDecoration: 'none',
                      background: 'rgba(245,158,11,0.1)', borderRadius: 5, padding: '2px 6px',
                    }}>지도보기</a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
