'use client'
import { useEffect, useState } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'

interface BusStop { id: string; name: string; address: string; lat: number; lng: number; distance: number; isDaejeon?: boolean }
interface Arrival { routeNo: string; routeTp: string; destination: string; arrTime: string; arrivalSec: number; busNum: string; remainSeat: string; lowBus: boolean }

function arrivalLabel(arrival: Arrival) {
  const sec = arrival.arrivalSec
  if (!sec || sec <= 0) return arrival.arrTime ? `${arrival.arrTime}분` : '곧 도착'
  if (sec < 60) return '곧 도착'
  const min = Math.floor(sec / 60)
  if (min <= 1) return '1분 이내'
  return `${min}분 후`
}

function arrivalColor(arrival: Arrival) {
  const sec = arrival.arrivalSec
  if (!sec || sec < 120) return '#34d399'
  if (sec < 300) return '#f59e0b'
  return '#94a3b8'
}

export default function BusWidget({ lat, lng }: { lat: number; lng: number }) {
  const [stops, setStops] = useState<BusStop[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<BusStop | null>(null)
  const [arrivals, setArrivals] = useState<Arrival[]>([])
  const [arrLoading, setArrLoading] = useState(false)
  const [arrError, setArrError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(0)

  useEffect(() => {
    setLoading(true)
    setSelected(null)
    fetch(`/api/bus?op=nearby&lat=${lat}&lng=${lng}`)
      .then(r => r.json())
      .then(d => { setStops(d.stops || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [lat, lng])

  function fetchArrivals(stop: BusStop) {
    setSelected(stop)
    setArrLoading(true)
    setArrError('')
    const cleanName = stop.name.replace(/\(.*?\)/g, '').trim()
    const params = stop.isDaejeon && stop.id
      ? `stationId=${stop.id}&stationNm=${encodeURIComponent(cleanName)}`
      : `stationNm=${encodeURIComponent(cleanName)}`
    fetch(`/api/bus?op=arrivals&${params}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setArrError(d.error)
        setArrivals(d.arrivals || [])
        setLastRefresh(Date.now())
        setArrLoading(false)
      })
      .catch(() => setArrLoading(false))
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[...Array(4)].map((_, i) => <div key={i} style={{ height: 64, background: 'rgba(255,255,255,0.04)', borderRadius: 12 }} />)}
    </div>
  )

  if (selected) return (
    <div>
      <button onClick={() => setSelected(null)} style={{
        display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 12px',
        color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 12,
      }}>
        <ArrowLeft size={13} /> 정류장 목록
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>🚌 {selected.name}</p>
          <p style={{ fontSize: 11, color: '#64748b' }}>{selected.address}</p>
        </div>
        <button onClick={() => fetchArrivals(selected)} style={{
          background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#60a5fa',
          display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
        }}>
          <RefreshCw size={11} />새로고침
        </button>
      </div>

      {arrLoading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#475569' }}>도착 정보 불러오는 중...</div>
      ) : arrError ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#ef4444', fontSize: 12 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>⚠️</div>{arrError}
          <p style={{ color: '#475569', marginTop: 4, fontSize: 11 }}>대전 지역만 실시간 정보가 지원돼요</p>
        </div>
      ) : arrivals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#475569', fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🕐</div>도착 예정 버스가 없어요
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {arrivals.map((a, i) => {
            const color = arrivalColor(a)
            return (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: 12,
                padding: '10px 13px', border: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    background: `${color}22`, color, borderRadius: 8,
                    padding: '4px 9px', fontSize: 13, fontWeight: 800, minWidth: 44, textAlign: 'center',
                  }}>{a.routeNo}</div>
                  <div>
                    <p style={{ fontSize: 12, color: 'white', fontWeight: 600 }}>→ {a.destination || '종점'}</p>
                    <p style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                      {a.lowBus ? '🦽 저상 · ' : ''}{a.busNum}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color }}>{arrivalLabel(a)}</p>
                  {a.remainSeat && <p style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>잔여 {a.remainSeat}석</p>}
                </div>
              </div>
            )
          })}
          {lastRefresh > 0 && <p style={{ fontSize: 10, color: '#64748b', textAlign: 'center' }}>
            {new Date(lastRefresh).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} 기준
          </p>}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.06))',
        borderRadius: 12, padding: '10px 14px', border: '1px solid rgba(59,130,246,0.15)',
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>🚌 주변 버스 정류장</p>
        <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>600m 이내 · 정류장 클릭 시 실시간 도착 정보</p>
        <p style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>※ 도착 정보는 대전 지역만 지원</p>
      </div>

      {stops.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#475569', fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🔍</div>주변 정류장이 없어요
        </div>
      ) : stops.map(stop => (
        <div key={stop.id} onClick={() => fetchArrivals(stop)} style={{
          background: 'rgba(255,255,255,0.04)', borderRadius: 12,
          padding: '11px 13px', border: '1px solid rgba(255,255,255,0.07)',
          cursor: 'pointer', transition: 'background 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
        >
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>🚏 {stop.name}</p>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{stop.address}</p>
          </div>
          <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{stop.distance}m</span>
        </div>
      ))}
    </div>
  )
}
