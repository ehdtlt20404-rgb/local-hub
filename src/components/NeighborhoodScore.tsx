'use client'
import { useEffect, useState } from 'react'

interface Props { lat: number; lng: number; sido: string; nx: number; ny: number }

interface ScoreData {
  dust: { pm10: number; pm25: number } | null
  places: number
  buses: number
  realestate: number // 거래 건수
}

function dustScore(pm10: number) {
  if (pm10 <= 30) return 30
  if (pm10 <= 50) return 24
  if (pm10 <= 80) return 14
  if (pm10 <= 150) return 6
  return 0
}

function placesScore(count: number) {
  return Math.min(30, Math.round((count / 20) * 30))
}

function busScore(count: number) {
  return Math.min(20, Math.round((count / 10) * 20))
}

function realestateScore(count: number) {
  return Math.min(20, Math.round((count / 30) * 20))
}

function grade(score: number) {
  if (score >= 85) return { label: 'S', color: '#f59e0b' }
  if (score >= 70) return { label: 'A', color: '#34d399' }
  if (score >= 55) return { label: 'B', color: '#60a5fa' }
  if (score >= 40) return { label: 'C', color: '#a78bfa' }
  return { label: 'D', color: '#f87171' }
}

export default function NeighborhoodScore({ lat, lng, sido, nx, ny }: Props) {
  const [data, setData] = useState<ScoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([
      fetch(`/api/dust?sido=${encodeURIComponent(sido)}`).then(r => r.json()).catch(() => null),
      fetch(`/api/places?lat=${lat}&lng=${lng}&type=pharmacy`).then(r => r.json()).catch(() => ({ places: [] })),
      fetch(`/api/places?lat=${lat}&lng=${lng}&type=hospital`).then(r => r.json()).catch(() => ({ places: [] })),
      fetch(`/api/realestate?sido=${encodeURIComponent(sido)}&lat=${lat}&lng=${lng}&quick=true`).then(r => r.json()).catch(() => ({ items: [] })),
    ]).then(([dustData, placesData, busData, reData]) => {
      const dustItems = dustData?.items || []
      const valid10 = dustItems.map((i: any) => Number(i.pm10Value)).filter((n: number) => !isNaN(n) && n > 0)
      const valid25 = dustItems.map((i: any) => Number(i.pm25Value)).filter((n: number) => !isNaN(n) && n > 0)
      const avg10 = valid10.length ? Math.round(valid10.reduce((s: number, n: number) => s + n, 0) / valid10.length) : null
      const avg25 = valid25.length ? Math.round(valid25.reduce((s: number, n: number) => s + n, 0) / valid25.length) : 0
      setData({
        dust: avg10 != null ? { pm10: avg10, pm25: avg25 } : null,
        places: (placesData?.places?.length || 0) * 3,
        buses: busData?.places?.length || 0,
        realestate: reData?.items?.length || 0,
      })
      setLoading(false)
    })
  }, [open, lat, lng, sido])

  const scores = data ? {
    env: data.dust ? dustScore(data.dust.pm10) : 15,
    life: placesScore(data.places),
    transport: busScore(data.buses),
    realestate: realestateScore(data.realestate),
  } : null

  const total = scores ? scores.env + scores.life + scores.transport + scores.realestate : 0
  const g = grade(total)

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, marginTop: 4 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
          background: open ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.04)',
          color: open ? '#fbbf24' : '#64748b', fontSize: 11, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span>🏆 동네 종합 점수</span>
        {!loading && scores && open && (
          <span style={{ fontSize: 13, color: g.color, fontWeight: 900 }}>{total}점 {g.label}등급</span>
        )}
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ marginTop: 8, background: 'rgba(234,179,8,0.05)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(234,179,8,0.12)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '16px 0', color: '#475569', fontSize: 12 }}>점수 계산 중...</div>
          ) : scores ? (
            <>
              {/* 총점 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 42, fontWeight: 900, color: g.color, lineHeight: 1 }}>{total}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>/ 100점</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: g.color, lineHeight: 1 }}>{g.label}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>등급</div>
                </div>
              </div>

              {/* 항목별 */}
              {[
                { label: '🌿 환경·공기', score: scores.env, max: 30 },
                { label: '🏪 생활편의', score: scores.life, max: 30 },
                { label: '🏥 의료', score: scores.transport, max: 20 },
                { label: '🏘 부동산활성도', score: scores.realestate, max: 20 },
              ].map(item => (
                <div key={item.label} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{item.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'white' }}>{item.score}/{item.max}</span>
                  </div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                    <div style={{ height: '100%', borderRadius: 3, width: `${(item.score / item.max) * 100}%`, background: `linear-gradient(90deg, ${g.color}99, ${g.color})`, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              ))}

              <p style={{ fontSize: 9, color: '#334155', marginTop: 8, textAlign: 'center' }}>
                미세먼지·편의시설·교통·거래활성도 기반 자체 산정 점수
              </p>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
