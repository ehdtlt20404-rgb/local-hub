'use client'
import { useEffect, useState } from 'react'
import { Droplets, Wind, CloudRain } from 'lucide-react'

interface WeatherData { temp: string; humidity: string; rain: string; wind: string; sky: string }

const SKY_INFO: Record<string, { emoji: string; label: string }> = {
  '0': { emoji: '☀️', label: '맑음' }, '1': { emoji: '☀️', label: '맑음' },
  '2': { emoji: '🌤', label: '구름조금' }, '3': { emoji: '⛅', label: '구름많음' },
  '4': { emoji: '🌧', label: '비' }, '5': { emoji: '❄️', label: '눈' },
}

export default function WeatherWidget({ nx, ny }: { nx: number; ny: number }) {
  const [data, setData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/weather?nx=${nx}&ny=${ny}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [nx, ny])

  if (loading) return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.06)', height: 140 }}>
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      </div>
    </div>
  )

  if (!data || data.error) return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
      날씨 정보를 불러올 수 없어요
    </div>
  )

  const sky = SKY_INFO[data.sky] || SKY_INFO['1']

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(139,92,246,0.1) 100%)',
      borderRadius: 16, padding: 18, border: '1px solid rgba(59,130,246,0.25)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>현재 날씨</p>
          <p style={{ fontSize: 40, fontWeight: 800, color: 'white', lineHeight: 1, marginBottom: 4 }}>{data.temp}°</p>
          <p style={{ fontSize: 13, color: '#94a3b8' }}>{sky.label}</p>
        </div>
        <div style={{ fontSize: 48, lineHeight: 1, marginTop: 4 }}>{sky.emoji}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { icon: <Droplets size={11} />, label: '습도', value: data.humidity !== '--' ? `${data.humidity}%` : '--', color: '#60a5fa' },
          { icon: <Wind size={11} />, label: '풍속', value: data.wind !== '--' ? `${data.wind}m/s` : '--', color: '#a78bfa' },
          { icon: <CloudRain size={11} />, label: '강수', value: `${data.rain ?? 0}mm`, color: '#34d399' },
        ].map(item => (
          <div key={item.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: item.color, marginBottom: 4 }}>
              {item.icon}
              <span style={{ fontSize: 10, fontWeight: 600 }}>{item.label}</span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
