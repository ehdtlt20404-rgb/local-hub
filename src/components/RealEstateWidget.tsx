'use client'
import { useEffect, useState } from 'react'
import { Calendar, ArrowLeft } from 'lucide-react'

interface TradeItem {
  dealType: string; aptNm: string; aptDong: string; dealAmount: string; excluUseAr: string
  floor: string; buildYear: string; dealYear: string; dealMonth: string; dealDay: string; umdNm: string
}

type DealTab = 'trade' | 'rent'

function formatPrice(amount: string, dealType: string) {
  if (dealType === '월세') {
    // "보3000·월50" 형식
    const [deposit, monthly] = amount.split('·')
    const formatPart = (s: string) => {
      if (!s) return s
      const prefix = s.slice(0, 1)
      const n = parseInt(s.slice(1))
      if (isNaN(n)) return s
      const str = n >= 10000
        ? `${Math.floor(n/10000)}억${n%10000>0?` ${n%10000}만`:''}`
        : `${n.toLocaleString()}만`
      return `${prefix}${str}`
    }
    return `${formatPart(deposit)} / ${formatPart(monthly)}`
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

function formatDate(y: string, m: string, d: string) {
  return `${y}.${String(m).padStart(2,'0')}.${String(d).padStart(2,'0')}`
}

function pyeong(ar: string) {
  const n = parseFloat(ar)
  return isNaN(n) ? '' : `(${Math.round(n / 3.3058)}평)`
}

const DEAL_TYPE_COLOR: Record<string, string> = {
  '매매': '#34d399',
  '전세': '#60a5fa',
  '월세': '#f59e0b',
}

function TradeRow({ item, onClick }: { item: TradeItem; onClick?: () => void }) {
  const color = DEAL_TYPE_COLOR[item.dealType] || '#34d399'
  return (
    <div
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.04)', borderRadius: 12,
        padding: '11px 13px', border: '1px solid rgba(255,255,255,0.07)',
        cursor: onClick ? 'pointer' : 'default', transition: 'background 0.15s',
      }}
      onMouseEnter={e => onClick && ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.08)')}
      onMouseLeave={e => onClick && ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
        <div style={{ flex: 1, marginRight: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{item.aptNm}</span>
          {item.aptDong && <span style={{ fontSize: 11, color: '#64748b', marginLeft: 5 }}>{item.aptDong}동</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}22`, borderRadius: 5, padding: '1px 5px' }}>{item.dealType}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color }}>{formatPrice(item.dealAmount, item.dealType)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11, color: '#94a3b8' }}>
        {item.aptDong && <span style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', borderRadius: 5, padding: '1px 5px', fontWeight: 600 }}>{item.aptDong}동</span>}
        <span>{item.floor}층</span>
        <span>·</span>
        <span>{item.excluUseAr}㎡ {pyeong(item.excluUseAr)}</span>
        <span>·</span>
        <span><Calendar size={9} style={{ display: 'inline', marginRight: 2 }} />{formatDate(item.dealYear, item.dealMonth, item.dealDay)}</span>
        {item.umdNm && <span>· 📍{item.umdNm}</span>}
      </div>
      {onClick && <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>클릭 → 1년 거래 내역 보기</div>}
    </div>
  )
}

export default function RealEstateWidget({ sido, lat, lng }: { sido: string; lat: number; lng: number }) {
  const [dealTab, setDealTab] = useState<DealTab>('trade')
  const [items, setItems] = useState<TradeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dealYmd, setDealYmd] = useState('')
  const [filterDong, setFilterDong] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [history, setHistory] = useState<TradeItem[]>([])
  const [histLoading, setHistLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    setSelected(null)
    fetch(`/api/realestate?sido=${encodeURIComponent(sido)}&lat=${lat}&lng=${lng}&dealType=${dealTab}`)
      .then(r => r.json())
      .then(d => { setItems(d.items || []); setDealYmd(d.dealYmd || ''); setFilterDong(d.filterDong || ''); setLoading(false) })
      .catch(() => setLoading(false))
  }, [sido, lat, lng, dealTab])

  function handleAptClick(aptNm: string) {
    setSelected(aptNm)
    setHistLoading(true)
    fetch(`/api/realestate?sido=${encodeURIComponent(sido)}&lat=${lat}&lng=${lng}&dealType=${dealTab}&aptNm=${encodeURIComponent(aptNm)}`)
      .then(r => r.json())
      .then(d => { setHistory(d.items || []); setHistLoading(false) })
      .catch(() => setHistLoading(false))
  }

  // 히스토리 뷰
  if (selected) return (
    <div>
      <button onClick={() => setSelected(null)} style={{
        display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 12px',
        color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 12,
      }}>
        <ArrowLeft size={13} /> 목록으로
      </button>
      <div style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{selected}</p>
        <p style={{ fontSize: 11, color: '#64748b' }}>근 1년 실거래 내역 · 최신순</p>
      </div>
      {histLoading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#475569' }}>불러오는 중...</div>
      ) : history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#475569', fontSize: 13 }}>거래 내역이 없어요</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {history.map((item, i) => <TradeRow key={i} item={item} />)}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* 매매/전세/월세 토글 */}
      <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4 }}>
        {(['trade', 'rent'] as const).map(t => (
          <button key={t} onClick={() => setDealTab(t)} style={{
            flex: 1, padding: '7px 0', borderRadius: 7, fontSize: 12, fontWeight: 700,
            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            background: dealTab === t ? 'rgba(59,130,246,0.25)' : 'transparent',
            color: dealTab === t ? '#93c5fd' : '#94a3b8',
          }}>
            {t === 'trade' ? '🏠 매매' : '📋 전세·월세'}
          </button>
        ))}
      </div>

      <div style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05))',
        borderRadius: 12, padding: '10px 14px', border: '1px solid rgba(16,185,129,0.15)',
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>
          🏘 {filterDong ? `📍 ${filterDong}` : sido} · {dealTab === 'trade' ? '매매' : '전세·월세'} 실거래가
        </p>
        <p style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>최근 3개월 · 단지별 최신 계약 · ※실거래 신고 기준</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...Array(4)].map((_, i) => <div key={i} style={{ height: 72, background: 'rgba(255,255,255,0.04)', borderRadius: 12 }} />)}
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#475569', fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>⏳</div>거래 데이터가 없어요
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((item, i) => <TradeRow key={i} item={item} onClick={() => handleAptClick(item.aptNm)} />)}
        </div>
      )}
    </div>
  )
}
