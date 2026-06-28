'use client'
import { useEffect, useState } from 'react'
import { Calendar, MapPin, ExternalLink } from 'lucide-react'

interface Event {
  title: string
  addr1: string
  eventstartdate: string
  eventenddate: string
  firstimage: string
  contentid: string
}

const AREA_CODES: Record<string, string> = {
  '서울': '1', '인천': '2', '대전': '3', '대구': '4', '광주': '5',
  '부산': '6', '울산': '7', '세종': '8', '경기': '31', '강원': '32',
  '충북': '33', '충남': '34', '경북': '35', '경남': '36', '전북': '37',
  '전남': '38', '제주': '39',
}

function formatDate(d: string) {
  if (!d || d.length < 8) return d
  return `${d.slice(0,4)}.${d.slice(4,6)}.${d.slice(6,8)}`
}

export default function EventsWidget({ sido }: { sido: string }) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  const areaCode = AREA_CODES[sido] || '1'

  useEffect(() => {
    setLoading(true)
    fetch(`/api/events?areaCode=${areaCode}`)
      .then(r => r.json())
      .then(d => { setEvents(d.events || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [areaCode])

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ height: 72, background: '#f1f5f9', borderRadius: 10 }} />
      ))}
    </div>
  )

  if (events.length === 0) return (
    <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 13 }}>
      현재 진행 중인 행사가 없어요
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4, letterSpacing: '0.05em' }}>
        {sido} 지역 행사 · 축제
      </p>
      {events.map((ev, i) => (
        <div key={ev.contentid || i} style={{
          background: '#f8fafc', borderRadius: 10, overflow: 'hidden',
          border: '1px solid #f1f5f9', display: 'flex', gap: 0
        }}>
          {ev.firstimage ? (
            <img src={ev.firstimage} alt={ev.title} style={{ width: 72, height: 72, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 72, height: 72, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 24 }}>
              🎪
            </div>
          )}
          <div style={{ padding: '8px 10px', flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {ev.title}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>
              <Calendar size={10} />
              {formatDate(ev.eventstartdate)} ~ {formatDate(ev.eventenddate)}
            </div>
            {ev.addr1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8' }}>
                <MapPin size={10} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.addr1}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
