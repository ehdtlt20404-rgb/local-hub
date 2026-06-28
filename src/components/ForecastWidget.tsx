'use client'
import { useEffect, useState } from 'react'

interface ForecastDay { date: string; tempMax: string; tempMin: string; sky: string; pty: string; pop: string }

function weatherIcon(sky: string, pty: string) {
  if (pty !== '0') {
    if (pty === '1' || pty === '4') return '🌧'
    if (pty === '2') return '🌨'
    if (pty === '3') return '❄️'
  }
  if (sky === '1') return '☀️'
  if (sky === '3') return '⛅'
  return '☁️'
}

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return { day: days[d.getDay()], date: `${d.getMonth()+1}/${d.getDate()}` }
}

export default function ForecastWidget({ nx, ny }: { nx: number; ny: number }) {
  const [forecast, setForecast] = useState<ForecastDay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/forecast?nx=${nx}&ny=${ny}`)
      .then(r => r.json())
      .then(d => { setForecast(d.forecast || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [nx, ny])

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ height: 48, background: 'rgba(255,255,255,0.04)', borderRadius: 10 }} />
      ))}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>5일 예보</p>
      {forecast.map((day, i) => {
        const { day: dayName, date } = formatDate(day.date)
        const isToday = i === 0
        return (
          <div key={day.date} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: isToday ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)',
            borderRadius: 11, padding: '10px 14px',
            border: isToday ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{ width: 36, flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: isToday ? '#60a5fa' : '#94a3b8' }}>
                {isToday ? '오늘' : dayName}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>{date}</div>
            </div>
            <div style={{ fontSize: 20, flexShrink: 0 }}>{weatherIcon(day.sky, day.pty)}</div>
            <div style={{ flex: 1, fontSize: 11, color: '#94a3b8' }}>
              {day.pop !== '0' && `💧 ${day.pop}%`}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>{day.tempMax}°</span>
              <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>{day.tempMin}°</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
