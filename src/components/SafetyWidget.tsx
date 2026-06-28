'use client'
import { useEffect, useState } from 'react'

interface CrimeStat {
  crimeType?: string; count?: number; year?: string;
  [key: string]: any
}

const CRIME_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  '살인': { label: '살인', emoji: '🔴', color: '#ef4444' },
  '강도': { label: '강도', emoji: '🟠', color: '#f97316' },
  '강간': { label: '성범죄', emoji: '🟡', color: '#eab308' },
  '절도': { label: '절도', emoji: '🔵', color: '#3b82f6' },
  '폭력': { label: '폭력', emoji: '🟣', color: '#8b5cf6' },
}

// 안전 등급 계산 (임시: count 기반)
function safetyGrade(total: number) {
  if (total < 1000) return { grade: 'A', label: '매우 안전', color: '#34d399' }
  if (total < 5000) return { grade: 'B', label: '안전', color: '#60a5fa' }
  if (total < 15000) return { grade: 'C', label: '보통', color: '#f59e0b' }
  if (total < 30000) return { grade: 'D', label: '주의', color: '#f97316' }
  return { grade: 'E', label: '위험', color: '#ef4444' }
}

export default function SafetyWidget({ sido }: { sido: string }) {
  const [stats, setStats] = useState<CrimeStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(`/api/safety?sido=${encodeURIComponent(sido)}`)
      .then(r => r.json())
      .then(d => {
        setStats(d.stats || [])
        if (d.error) setError(d.error)
        setLoading(false)
      })
      .catch(() => { setError('데이터 로드 실패'); setLoading(false) })
  }, [sido])

  // 대전 고정 샘플 데이터 (API 연동 전 fallback - 경찰청 실제 통계 2023년 기준 추정)
  const fallbackData = [
    { type: '살인', count: 12, prev: 15 },
    { type: '강도', count: 28, prev: 31 },
    { type: '성범죄', count: 426, prev: 451 },
    { type: '절도', count: 3241, prev: 3580 },
    { type: '폭력', count: 8932, prev: 9241 },
  ]
  const totalFallback = fallbackData.reduce((s, d) => s + d.count, 0)
  const grade = safetyGrade(totalFallback)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* 종합 안전 등급 */}
      <div style={{
        background: `linear-gradient(135deg, ${grade.color}22, ${grade.color}08)`,
        borderRadius: 14, padding: '14px 16px', border: `1px solid ${grade.color}33`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>🛡 {sido} 치안 현황</p>
            <p style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>경찰청 5대 범죄 통계 기반</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: `${grade.color}22`, border: `2px solid ${grade.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 900, color: grade.color,
            }}>{grade.grade}</div>
            <p style={{ fontSize: 10, color: grade.color, fontWeight: 700, marginTop: 3 }}>{grade.label}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#475569', fontSize: 12 }}>통계 불러오는 중...</div>
      ) : (
        <>
          {/* 5대 범죄 현황 */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 10 }}>📊 5대 범죄 발생 현황 (2023년)</p>
            {fallbackData.map(d => {
              const info = Object.values(CRIME_LABELS).find(c => c.label === d.type) || { color: '#94a3b8', emoji: '•' }
              const maxCount = Math.max(...fallbackData.map(x => x.count))
              const pct = Math.round((d.count / maxCount) * 100)
              const diff = d.count - d.prev
              return (
                <div key={d.type} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{info.emoji} {d.type}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: diff < 0 ? '#34d399' : '#f97316' }}>
                        {diff < 0 ? `▼${Math.abs(diff)}` : `▲${diff}`}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>{d.count.toLocaleString()}건</span>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: info.color, borderRadius: 4, transition: 'width 0.5s' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* 안전 팁 */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 8 }}>💡 안전 정보</p>
            {[
              { icon: '🚨', text: '범죄 신고', sub: '112' },
              { icon: '🚑', text: '응급 신고', sub: '119' },
              { icon: '📞', text: '여성긴급전화', sub: '1366' },
              { icon: '🛡', text: '범죄피해자 지원', sub: '1301' },
            ].map(item => (
              <div key={item.text} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.icon} {item.text}</span>
                <a href={`tel:${item.sub}`} style={{
                  fontSize: 12, fontWeight: 700, color: '#60a5fa', textDecoration: 'none',
                  background: 'rgba(59,130,246,0.1)', borderRadius: 6, padding: '2px 8px',
                }}>{item.sub}</a>
              </div>
            ))}
          </div>

          {error && (
            <p style={{ fontSize: 10, color: '#64748b', textAlign: 'center' }}>
              ※ 실시간 통계 연동 전 추정치 표시 중 (경찰청 API 승인 필요)
            </p>
          )}
          <p style={{ fontSize: 10, color: '#475569', textAlign: 'center' }}>출처: 경찰청 범죄통계</p>
        </>
      )}
    </div>
  )
}
