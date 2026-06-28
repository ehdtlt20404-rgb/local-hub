'use client'
import { useEffect, useState } from 'react'

interface DustItem { stationName: string; pm10Value: string; pm25Value: string; pm10Grade: string; pm25Grade: string }

const GRADE: Record<string, { label: string; color: string; bg: string; bar: string }> = {
  '1': { label: '좋음', color: '#60a5fa', bg: 'rgba(59,130,246,0.15)', bar: '#3b82f6' },
  '2': { label: '보통', color: '#34d399', bg: 'rgba(52,211,153,0.15)', bar: '#10b981' },
  '3': { label: '나쁨', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', bar: '#f59e0b' },
  '4': { label: '매우나쁨', color: '#f87171', bg: 'rgba(248,113,113,0.15)', bar: '#ef4444' },
}

export default function DustWidget({ sido }: { sido: string }) {
  const [items, setItems] = useState<DustItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/dust?sido=${encodeURIComponent(sido)}`)
      .then(r => r.json())
      .then(d => { setItems(d.items || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [sido])

  const avg10 = items.length ? Math.round(items.reduce((s, i) => s + Number(i.pm10Value || 0), 0) / items.length) : null
  const avg25 = items.length ? Math.round(items.reduce((s, i) => s + Number(i.pm25Value || 0), 0) / items.length) : null
  const grade = avg10 == null ? null : avg10 <= 30 ? '1' : avg10 <= 80 ? '2' : avg10 <= 150 ? '3' : '4'
  const g = grade ? GRADE[grade] : null

  if (loading) return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.06)', height: 160 }}>
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* PM10 카드 */}
      <div style={{
        background: g ? g.bg : 'rgba(255,255,255,0.04)',
        borderRadius: 16, padding: 18,
        border: `1px solid ${g ? g.color + '40' : 'rgba(255,255,255,0.06)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>미세먼지 PM10</p>
            <p style={{ fontSize: 40, fontWeight: 800, color: g?.color || '#475569', lineHeight: 1, marginBottom: 4 }}>
              {avg10 ?? '--'}
            </p>
            <p style={{ fontSize: 12, color: '#475569' }}>㎍/㎥ · {sido} 평균</p>
          </div>
          {g && (
            <div style={{ background: g.color + '20', borderRadius: 20, padding: '4px 12px', border: `1px solid ${g.color}40` }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: g.color }}>{g.label}</span>
            </div>
          )}
        </div>
        {/* 게이지바 */}
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(((avg10 || 0) / 200) * 100, 100)}%`, height: '100%', background: g?.bar || '#475569', borderRadius: 4, transition: 'width 0.8s ease' }} />
        </div>
      </div>

      {/* PM2.5 카드 */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 3, letterSpacing: '0.05em' }}>초미세먼지 PM2.5</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>{avg25 ?? '--'} <span style={{ fontSize: 11, color: '#475569', fontWeight: 400 }}>㎍/㎥</span></p>
        </div>
        <div style={{ fontSize: 28 }}>{avg25 == null ? '💨' : avg25 <= 15 ? '😊' : avg25 <= 35 ? '😐' : avg25 <= 75 ? '😷' : '🚨'}</div>
      </div>
    </div>
  )
}
