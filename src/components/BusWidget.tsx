'use client'
import { useEffect, useState } from 'react'
import { ExternalLink, ArrowLeft, Clock, MapPin } from 'lucide-react'

interface BusStop {
  id: number; name: string; lat: number; lng: number; distance: number; ref: string
}

interface Arrival {
  routeNo: string; arrTime: number | null; arrPrevSttnCnt: number | null; vehicleNo: string
}

function dist(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
}

function formatArrTime(sec: number) {
  if (sec <= 60) return '곧 도착'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}분 후`
  return `${Math.floor(min/60)}시간 ${min%60}분 후`
}

function ArrivalPanel({ stop, onBack }: { stop: BusStop; onBack: () => void }) {
  const [arrivals, setArrivals] = useState<Arrival[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(`/api/bus-arrival?name=${encodeURIComponent(stop.name)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        setArrivals(d.arrivals || [])
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [stop.name])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8, padding: '7px 12px', color: '#94a3b8',
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
      }}>
        <ArrowLeft size={13} /> 정류장 목록
      </button>

      <div style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.06))',
        borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(59,130,246,0.15)',
      }}>
        <p style={{ fontSize: 14, fontWeight: 800, color: 'white' }}>🚏 {stop.name}</p>
        <p style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
          <MapPin size={9} style={{ display: 'inline', marginRight: 2 }} />
          {stop.distance}m · 실시간 버스 도착 정보
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: 58, borderRadius: 12, background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
          ))}
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#f87171', fontSize: 12 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>⚠️</div>
          {error}
          <p style={{ fontSize: 10, color: '#475569', marginTop: 6 }}>
            대전 버스 API 미지원 정류장이거나 운행 종료 시간일 수 있어요
          </p>
          <a
            href={`https://map.kakao.com/link/search/${encodeURIComponent(stop.name)}`}
            target="_blank" rel="noreferrer"
            style={{ fontSize: 11, color: '#f59e0b', textDecoration: 'none', display: 'inline-block', marginTop: 10, background: 'rgba(245,158,11,0.1)', borderRadius: 6, padding: '4px 10px' }}
          >
            카카오맵에서 확인 →
          </a>
        </div>
      ) : arrivals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#475569', fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🚌</div>
          곧 도착 예정 버스가 없어요
          <a
            href={`https://map.kakao.com/link/search/${encodeURIComponent(stop.name)}`}
            target="_blank" rel="noreferrer"
            style={{ fontSize: 11, color: '#f59e0b', textDecoration: 'none', display: 'block', marginTop: 10, background: 'rgba(245,158,11,0.1)', borderRadius: 6, padding: '4px 10px' }}
          >
            카카오맵에서 확인 →
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>
            🕐 {arrivals.length}개 노선 도착 예정
          </p>
          {arrivals.map((a, i) => {
            const isUrgent = (a.arrTime ?? 999) <= 180
            return (
              <div key={i} style={{
                background: isUrgent ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.04)',
                borderRadius: 12, padding: '11px 14px',
                border: isUrgent ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>{a.routeNo}번</p>
                  {a.arrPrevSttnCnt !== null && (
                    <p style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                      <MapPin size={8} style={{ display: 'inline', marginRight: 2 }} />
                      {a.arrPrevSttnCnt}개 정류장 전
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: isUrgent ? '#34d399' : '#60a5fa' }}>
                    <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
                    {a.arrTime !== null ? formatArrTime(a.arrTime) : '-'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function BusWidget({ lat, lng }: { lat: number; lng: number }) {
  const [stops, setStops] = useState<BusStop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<BusStop | null>(null)

  useEffect(() => {
    setLoading(true)
    setError('')
    setSelected(null)

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

  if (selected) return <ArrivalPanel stop={selected} onBack={() => setSelected(null)} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.06))',
        borderRadius: 12, padding: '10px 14px', border: '1px solid rgba(59,130,246,0.15)',
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>🚌 주변 버스 정류장</p>
        <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>700m 이내 · 클릭하면 실시간 도착 정보 확인</p>
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
        <button
          key={stop.id}
          onClick={() => setSelected(stop)}
          style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 12,
            padding: '11px 13px', border: '1px solid rgba(255,255,255,0.07)',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', transition: 'all 0.15s', width: '100%', textAlign: 'left',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
        >
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>
              🚏 {stop.name}
              {stop.ref && <span style={{ fontSize: 10, color: '#64748b', marginLeft: 6 }}>({stop.ref}번)</span>}
            </p>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>탭하면 실시간 도착 정보</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>{stop.distance}m</span>
            <ExternalLink size={12} color="#475569" />
          </div>
        </button>
      ))}
    </div>
  )
}
