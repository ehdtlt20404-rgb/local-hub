'use client'
import { useEffect, useState } from 'react'
import { Calendar, ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TradeItem {
  dealType: string; propType: string; aptNm: string; aptDong: string
  dealAmount: string; excluUseAr: string; floor: string; buildYear: string
  dealYear: string; dealMonth: string; dealDay: string; umdNm: string
}

type DealTab = 'trade' | 'rent'
type PropType = 'apt' | 'villa' | 'house' | 'officetel'

const PROP_TYPES: { id: PropType; label: string; emoji: string; color: string }[] = [
  { id: 'apt',       label: '아파트',   emoji: '🏢', color: '#3b82f6' },
  { id: 'villa',     label: '빌라·연립', emoji: '🏘', color: '#8b5cf6' },
  { id: 'house',     label: '원룸·단독', emoji: '🏠', color: '#10b981' },
  { id: 'officetel', label: '오피스텔', emoji: '🏬', color: '#f59e0b' },
]

const DEAL_TYPE_COLOR: Record<string, string> = {
  '매매': '#34d399', '전세': '#60a5fa', '월세': '#f59e0b',
}

function formatPrice(amount: string, dealType: string) {
  if (dealType === '월세') {
    const [deposit, monthly] = amount.split('·')
    const fmt = (s: string) => {
      if (!s) return s
      const prefix = s.slice(0, 1)
      const n = parseInt(s.slice(1))
      if (isNaN(n)) return s
      return prefix + (n >= 10000 ? `${Math.floor(n/10000)}억${n%10000>0?` ${n%10000}만`:''}` : `${n.toLocaleString()}만`)
    }
    return `${fmt(deposit)} / ${fmt(monthly)}`
  }
  const n = parseInt(amount.replace(/,/g, ''))
  if (isNaN(n)) return amount
  if (n >= 10000) {
    const uk = Math.floor(n / 10000)
    const remain = n % 10000
    return remain > 0 ? `${uk}억 ${remain.toLocaleString()}만` : `${uk}억`
  }
  return `${n.toLocaleString()}만`
}

function rawNum(amount: string) {
  return parseInt(amount.replace(/,/g, '')) || 0
}

function formatDate(y: string, m: string, d: string) {
  return `${y}.${String(m).padStart(2,'0')}.${String(d).padStart(2,'0')}`
}

function pyeong(ar: string) {
  const n = parseFloat(ar)
  return isNaN(n) ? '' : `${Math.round(n / 3.3058)}평`
}

function TradeRow({ item, onClick, onLocate }: { item: TradeItem; onClick?: () => void; onLocate?: () => void }) {
  const color = DEAL_TYPE_COLOR[item.dealType] || '#34d399'
  return (
    <div
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.03)', borderRadius: 11,
        padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)',
        cursor: onClick ? 'pointer' : 'default', transition: 'background 0.15s',
      }}
      onMouseEnter={e => onClick && ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)')}
      onMouseLeave={e => onClick && ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'white', flex: 1, marginRight: 8 }}>{item.aptNm}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color, background: `${color}20`, borderRadius: 4, padding: '1px 5px' }}>{item.dealType}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color }}>{formatPrice(item.dealAmount, item.dealType)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, fontSize: 10, color: '#64748b' }}>
        {item.excluUseAr && <span style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 4, padding: '1px 5px' }}>{item.excluUseAr}㎡ · {pyeong(item.excluUseAr)}</span>}
        {item.floor && <span style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 4, padding: '1px 5px' }}>{item.floor}층</span>}
        {item.buildYear && <span style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 4, padding: '1px 5px' }}>{item.buildYear}년</span>}
        <span style={{ marginLeft: 'auto', color: '#374151' }}><Calendar size={8} style={{ display: 'inline', marginRight: 2 }} />{formatDate(item.dealYear, item.dealMonth, item.dealDay)}</span>
      </div>
      {onClick && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 4 }}>
          {onLocate && (
            <button onClick={e => { e.stopPropagation(); onLocate() }} style={{ fontSize: 9, color: '#60a5fa', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontWeight: 600 }}>
              📍 지도에서 보기
            </button>
          )}
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            <a href={`https://land.naver.com/search?query=${encodeURIComponent(item.aptNm)}`} target="_blank" rel="noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 9, color: '#4ade80', textDecoration: 'none', background: 'rgba(74,222,128,0.08)', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>네이버</a>
            <a href={`https://map.kakao.com/link/search/${encodeURIComponent(item.aptNm)}`} target="_blank" rel="noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 9, color: '#fbbf24', textDecoration: 'none', background: 'rgba(251,191,36,0.08)', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>카카오맵</a>
          </div>
        </div>
      )}
    </div>
  )
}

function PriceChart({ chartData }: { chartData: { label: string; avg: number }[] }) {
  if (chartData.length < 2) return null
  const W = 260, H = 90, PAD = { t: 12, r: 10, b: 22, l: 50 }
  const iW = W - PAD.l - PAD.r
  const iH = H - PAD.t - PAD.b
  const vals = chartData.map(d => d.avg)
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const pts = chartData.map((d, i) => ({
    x: PAD.l + (i / (chartData.length - 1)) * iW,
    y: PAD.t + iH - ((d.avg - min) / range) * iH,
    ...d,
  }))
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${path} L${pts[pts.length-1].x.toFixed(1)},${(PAD.t+iH).toFixed(1)} L${PAD.l},${(PAD.t+iH).toFixed(1)} Z`
  const fmtY = (v: number) => v >= 10000 ? `${Math.floor(v/10000)}억` : `${Math.round(v/100)*100}만`
  const maxPt = pts.reduce((a, b) => a.avg > b.avg ? a : b)
  const minPt = pts.reduce((a, b) => a.avg < b.avg ? a : b)
  const last = vals[vals.length - 1], prev = vals[vals.length - 2]
  const trend = last > prev ? 'up' : last < prev ? 'down' : 'flat'

  return (
    <div style={{ background: 'rgba(59,130,246,0.04)', borderRadius: 12, padding: '12px 10px 8px', border: '1px solid rgba(59,130,246,0.12)', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <TrendingUp size={11} color="#3b82f6" />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>월별 평균 시세 추이</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700 }}>
          {trend === 'up' && <><TrendingUp size={9} color="#34d399" /><span style={{ color: '#34d399' }}>상승 중</span></>}
          {trend === 'down' && <><TrendingDown size={9} color="#f87171" /><span style={{ color: '#f87171' }}>하락 중</span></>}
          {trend === 'flat' && <><Minus size={9} color="#94a3b8" /><span style={{ color: '#94a3b8' }}>보합</span></>}
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map(r => {
          const y = PAD.t + iH - r * iH
          return <line key={r} x1={PAD.l} y1={y} x2={PAD.l + iW} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
        })}
        {[0, 0.5, 1].map(r => (
          <text key={r} x={PAD.l - 4} y={PAD.t + iH - r * iH + 3} textAnchor="end" fontSize={8} fill="#374151">{fmtY(min + range * r)}</text>
        ))}
        <path d={area} fill="url(#chartGrad)" />
        <path d={path} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={i === pts.length-1 ? 3.5 : 2.5} fill={i === pts.length-1 ? '#60a5fa' : '#3b82f6'} />
            {(i === 0 || i === pts.length - 1 || pts.length <= 5) && (
              <text x={p.x} y={H - 3} textAnchor="middle" fontSize={7.5} fill="#374151">{p.label}</text>
            )}
          </g>
        ))}
        <text x={maxPt.x} y={maxPt.y - 6} textAnchor="middle" fontSize={8} fill="#34d399" fontWeight="bold">{fmtY(maxPt.avg)}</text>
        {minPt !== maxPt && <text x={minPt.x} y={minPt.y + 12} textAnchor="middle" fontSize={8} fill="#f87171" fontWeight="bold">{fmtY(minPt.avg)}</text>}
      </svg>
    </div>
  )
}

const COMPARE_CITIES = ['서울', '부산', '대구', '대전', '광주', '인천']

export default function RealEstateWidget({ sido, lat, lng, onItemsChange, externalSelected, onAptLocate }: {
  sido: string; lat: number; lng: number
  onItemsChange?: (items: TradeItem[]) => void
  externalSelected?: string | null
  onAptLocate?: (lat: number, lng: number, name: string) => void
}) {
  const [dealTab, setDealTab] = useState<DealTab>('trade')
  const [propType, setPropType] = useState<PropType>('apt')
  const [items, setItems] = useState<TradeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDong, setFilterDong] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [history, setHistory] = useState<TradeItem[]>([])
  const [histLoading, setHistLoading] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [compareData, setCompareData] = useState<{ city: string; avg: number }[]>([])
  const [compareLoading, setCompareLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    setSelected(null)
    fetch(`/api/realestate?sido=${encodeURIComponent(sido)}&lat=${lat}&lng=${lng}&dealType=${dealTab}&propType=${propType}`)
      .then(r => r.json())
      .then(d => {
        const loaded = d.items || []
        setItems(loaded)
        setFilterDong(d.filterDong || '')
        setLoading(false)
        onItemsChange?.(loaded)
      })
      .catch(() => setLoading(false))
  }, [sido, lat, lng, dealTab, propType])

  // 지도 마커 클릭 시 외부에서 선택된 아파트 자동 오픈
  useEffect(() => {
    if (externalSelected && externalSelected !== selected) {
      handleAptClick(externalSelected)
    }
  }, [externalSelected])

  async function loadCompare() {
    setCompareLoading(true)
    const results = await Promise.all(
      COMPARE_CITIES.map(city =>
        fetch(`/api/realestate?sido=${encodeURIComponent(city)}&dealType=${dealTab}&propType=${propType}`)
          .then(r => r.json())
          .then(d => {
            const nums = (d.items || []).filter((i: TradeItem) => i.dealType !== '월세').map((i: TradeItem) => rawNum(i.dealAmount)).filter((n: number) => n > 0)
            const avg = nums.length ? Math.round(nums.reduce((s: number, v: number) => s + v, 0) / nums.length) : 0
            return { city, avg }
          })
          .catch(() => ({ city, avg: 0 }))
      )
    )
    setCompareData(results.filter(r => r.avg > 0))
    setCompareLoading(false)
  }

  function handleAptClick(aptNm: string) {
    setSelected(aptNm)
    setHistLoading(true)
    fetch(`/api/realestate?sido=${encodeURIComponent(sido)}&lat=${lat}&lng=${lng}&dealType=${dealTab}&propType=${propType}&aptNm=${encodeURIComponent(aptNm)}`)
      .then(r => r.json())
      .then(d => { setHistory(d.items || []); setHistLoading(false) })
      .catch(() => setHistLoading(false))
  }

  const activeProp = PROP_TYPES.find(p => p.id === propType)!

  // 요약 통계
  const stats = (() => {
    if (items.length === 0) return null
    const tradeNums = items.filter(i => i.dealType !== '월세').map(i => rawNum(i.dealAmount)).filter(n => n > 0)
    if (tradeNums.length === 0) return null
    const avg = Math.round(tradeNums.reduce((s, v) => s + v, 0) / tradeNums.length)
    return { avg, min: Math.min(...tradeNums), max: Math.max(...tradeNums), count: items.length }
  })()

  if (selected) {
    const chartData = (() => {
      const byMonth: Record<string, number[]> = {}
      for (const item of history) {
        if (item.dealType === '월세') continue
        const key = `${item.dealYear}-${String(item.dealMonth).padStart(2,'0')}`
        const n = rawNum(item.dealAmount)
        if (n > 0) {
          if (!byMonth[key]) byMonth[key] = []
          byMonth[key].push(n)
        }
      }
      return Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([ym, vals]) => ({ label: ym.slice(2).replace('-', '/'), avg: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) }))
    })()

    return (
      <div>
        <button onClick={() => setSelected(null)} style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '6px 12px',
          color: '#94a3b8', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 12,
        }}>
          <ArrowLeft size={12} /> 목록으로
        </button>
        <p style={{ fontSize: 14, fontWeight: 800, color: 'white', marginBottom: 2 }}>{selected}</p>
        <p style={{ fontSize: 10, color: '#475569', marginBottom: 10 }}>근 1년 실거래 내역 · 최신순</p>
        {histLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...Array(3)].map((_, i) => <div key={i} style={{ height: 68, borderRadius: 11, background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />)}
          </div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#475569', fontSize: 13 }}>거래 내역이 없어요</div>
        ) : (
          <>
            <PriceChart chartData={chartData} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {history.map((item, i) => <TradeRow key={i} item={item} />)}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* 매물 유형 선택 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
        {PROP_TYPES.map(p => (
          <button key={p.id} onClick={() => setPropType(p.id)} style={{
            padding: '8px 6px', borderRadius: 10, fontSize: 11, border: 'none',
            cursor: 'pointer', fontWeight: 700, transition: 'all 0.15s',
            background: propType === p.id ? `${p.color}22` : 'rgba(255,255,255,0.04)',
            color: propType === p.id ? p.color : '#64748b',
            outline: propType === p.id ? `1px solid ${p.color}55` : '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <span style={{ fontSize: 17 }}>{p.emoji}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {/* 매매 / 전세·월세 토글 */}
      <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 9, padding: 3 }}>
        {(['trade', 'rent'] as const).map(t => (
          <button key={t} onClick={() => setDealTab(t)} style={{
            flex: 1, padding: '7px 0', borderRadius: 7, fontSize: 12, fontWeight: 700,
            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            background: dealTab === t ? 'rgba(59,130,246,0.2)' : 'transparent',
            color: dealTab === t ? '#93c5fd' : '#64748b',
          }}>
            {t === 'trade' ? '🏠 매매' : '📋 전세·월세'}
          </button>
        ))}
      </div>

      {/* 지역 + 요약 */}
      <div style={{ background: `linear-gradient(135deg, ${activeProp.color}18, ${activeProp.color}08)`, borderRadius: 12, padding: '10px 13px', border: `1px solid ${activeProp.color}25` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>
              {activeProp.emoji} {filterDong ? `📍 ${filterDong}` : sido} {activeProp.label} {dealTab === 'trade' ? '매매' : '전세·월세'}
            </p>
            <p style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>최근 3개월 · 실거래 신고 기준</p>
          </div>
          {stats && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 9, color: '#475569' }}>평균</p>
              <p style={{ fontSize: 13, fontWeight: 800, color: activeProp.color }}>{formatPrice(String(stats.avg), '매매')}</p>
            </div>
          )}
        </div>
        {stats && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${activeProp.color}20` }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <p style={{ fontSize: 9, color: '#475569' }}>최저</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#f87171' }}>{formatPrice(String(stats.min), '매매')}</p>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <p style={{ fontSize: 9, color: '#475569' }}>건수</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>{stats.count}건</p>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <p style={{ fontSize: 9, color: '#475569' }}>최고</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#34d399' }}>{formatPrice(String(stats.max), '매매')}</p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[...Array(4)].map((_, i) => <div key={i} style={{ height: 68, borderRadius: 11, background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />)}
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#475569', fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>⏳</div>
          해당 지역 {activeProp.label} 거래 데이터가 없어요
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {items.map((item, i) => (
            <TradeRow key={i} item={item}
              onClick={() => handleAptClick(item.aptNm)}
              onLocate={onAptLocate ? async () => {
                const res = await fetch(`/api/geocode-apt?q=${encodeURIComponent(item.aptNm + ' ' + (item.umdNm || ''))}`)
                const d = await res.json()
                if (d.lat) onAptLocate(d.lat, d.lng, item.aptNm)
              } : undefined}
            />
          ))}
        </div>
      )}

      {/* 전국 시세 비교 */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
        <button
          onClick={() => { setShowCompare(v => !v); if (!showCompare && compareData.length === 0) loadCompare() }}
          style={{
            width: '100%', padding: '8px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)',
            background: showCompare ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)',
            color: showCompare ? '#c4b5fd' : '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}
        >
          🗺 전국 시세 비교 {showCompare ? '▲' : '▼'}
        </button>

        {showCompare && (
          <div style={{ marginTop: 8 }}>
            {compareLoading ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#475569', fontSize: 11 }}>불러오는 중...</div>
            ) : compareData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '12px 0', color: '#475569', fontSize: 11 }}>데이터 없음</div>
            ) : (() => {
              const maxAvg = Math.max(...compareData.map(d => d.avg))
              const currentAvg = stats?.avg || 0
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p style={{ fontSize: 9, color: '#475569', marginBottom: 2 }}>{activeProp.label} {dealTab === 'trade' ? '매매' : '전세·월세'} 평균 시세 비교</p>
                  {compareData.sort((a, b) => b.avg - a.avg).map(d => {
                    const pct = Math.round((d.avg / maxAvg) * 100)
                    const isCurrent = d.city === sido
                    return (
                      <div key={d.city}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 10, fontWeight: isCurrent ? 800 : 600, color: isCurrent ? '#c4b5fd' : '#94a3b8' }}>
                            {isCurrent ? '📍 ' : ''}{d.city}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: isCurrent ? '#c4b5fd' : '#64748b' }}>{formatPrice(String(d.avg), '매매')}</span>
                        </div>
                        <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: isCurrent ? 'linear-gradient(90deg,#8b5cf6,#c4b5fd)' : 'rgba(255,255,255,0.15)', transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    )
                  })}
                  {currentAvg > 0 && (
                    <p style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>
                      현재 지역 평균: {formatPrice(String(currentAvg), '매매')}
                    </p>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
