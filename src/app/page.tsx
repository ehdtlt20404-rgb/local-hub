'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Search, Navigation, ChevronDown, X, Map as MapIcon, Bookmark, BookmarkCheck } from 'lucide-react'
import { useFavorites } from '@/hooks/useFavorites'
import { useRecentPlaces } from '@/hooks/useRecentPlaces'
import WeatherWidget from '@/components/WeatherWidget'
import NeighborhoodScore from '@/components/NeighborhoodScore'
import CompareModal from '@/components/CompareModal'
import DustWidget from '@/components/DustWidget'
import ForecastWidget from '@/components/ForecastWidget'
import PlacesWidget from '@/components/PlacesWidget'
import EventsWidget from '@/components/EventsWidget'
import RealEstateWidget from '@/components/RealEstateWidget'
import BusWidget from '@/components/BusWidget'
import RestaurantWidget from '@/components/RestaurantWidget'
import SafetyWidget from '@/components/SafetyWidget'

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite', margin: '0 auto 8px' }} />
        <p style={{ fontSize: 13, color: '#64748b' }}>지도 불러오는 중...</p>
      </div>
    </div>
  )
})

function latlngToGrid(lat: number, lng: number) {
  const RE = 6371.00877, GRID = 5.0, SLAT1 = 30.0, SLAT2 = 60.0
  const OLON = 126.0, OLAT = 38.0, XO = 43, YO = 136
  const DEGRAD = Math.PI / 180.0
  const re = RE / GRID
  const slat1 = SLAT1 * DEGRAD, slat2 = SLAT2 * DEGRAD
  const olon = OLON * DEGRAD, olat = OLAT * DEGRAD
  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn)
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5)
  ro = (re * sf) / Math.pow(ro, sn)
  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5)
  ra = (re * sf) / Math.pow(ra, sn)
  let theta = lng * DEGRAD - olon
  if (theta > Math.PI) theta -= 2.0 * Math.PI
  if (theta < -Math.PI) theta += 2.0 * Math.PI
  theta *= sn
  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
  }
}

const SIDO_COORDS: Record<string, [number, number]> = {
  '서울': [37.5665, 126.9780], '부산': [35.1796, 129.0756], '대구': [35.8714, 128.6014],
  '인천': [37.4563, 126.7052], '광주': [35.1595, 126.8526], '대전': [36.3504, 127.3845],
  '울산': [35.5384, 129.3114], '경기': [37.4138, 127.5183], '강원': [37.8228, 128.1555],
  '충북': [36.8000, 127.7000], '충남': [36.5184, 126.8000], '전북': [35.7175, 127.1530],
  '전남': [34.8679, 126.9910], '경북': [36.4919, 128.8889], '경남': [35.4606, 128.2132],
  '제주': [33.4996, 126.5312],
}
const SIDO_LIST = Object.keys(SIDO_COORDS)

const TABS = [
  { id: 'weather',    label: '날씨·환경',  icon: '🌤' },
  { id: 'places',     label: '편의시설',   icon: '🏢' },
  { id: 'food',       label: '맛집',       icon: '🍽' },
  { id: 'realestate', label: '부동산',     icon: '🏘' },
  { id: 'life',       label: '교통·행사',  icon: '🚌' },
  { id: 'favorites',  label: '즐겨찾기',   icon: '⭐' },
] as const
type TabId = typeof TABS[number]['id']

export default function HomePage() {
  const [lat, setLat] = useState(37.5665)
  const [lng, setLng] = useState(126.9780)
  const [address, setAddress] = useState('서울특별시 중구')
  const [searchInput, setSearchInput] = useState('')
  const [sido, setSido] = useState('서울')
  const [activeTab, setActiveTab] = useState<TabId>('weather')
  const [searching, setSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<{ name: string; lat: number; lng: number; province: string; category?: string; type?: string; otherRegion?: boolean }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mapPlaces, setMapPlaces] = useState<any[]>([])
  const [priceMarkers, setPriceMarkers] = useState<any[]>([])
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number } | null>(null)
  const [aptExternalSelect, setAptExternalSelect] = useState<string | null>(null)
  const [highlightedApt, setHighlightedApt] = useState<string | null>(null)
  // 부동산 탭 상태 유지 (지도↔정보 전환 시 리셋 방지)
  const [rePropType, setRePropType] = useState<'apt'|'villa'|'house'|'officetel'>('apt')
  const [reDealTab, setReDealTab] = useState<'trade'|'rent'>('trade')
  const [realEstateLoading, setRealEstateLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [rainAlert, setRainAlert] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileView, setMobileView] = useState<'info' | 'map'>('info')
  const { favorites, add: addFav, remove: removeFav, isSaved } = useFavorites()
  const { places: recentPlaces, add: addRecent, remove: removeRecent, clear: clearRecent } = useRecentPlaces()
  const [showCompareModal, setShowCompareModal] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleRealEstateItems(items: any[]) {
    // 최신 거래순 상위 50개
    const sorted = [...items].sort((a, b) => {
      const da = `${a.dealYear}${String(a.dealMonth).padStart(2,'0')}${String(a.dealDay).padStart(2,'0')}`
      const db = `${b.dealYear}${String(b.dealMonth).padStart(2,'0')}${String(b.dealDay).padStart(2,'0')}`
      return db.localeCompare(da)
    })
    const top = sorted.slice(0, 50)
    const markers = await Promise.all(top.map(async item => {
      try {
        const res = await fetch(`/api/geocode-apt?q=${encodeURIComponent(item.aptNm)}&dong=${encodeURIComponent(item.umdNm || '')}&propType=${item.propType || 'apt'}`)
        const d = await res.json()
        if (!d.lat) return null
        const dealDate = item.dealYear && item.dealMonth
          ? `${item.dealYear}.${String(item.dealMonth).padStart(2,'0')}.${String(item.dealDay||'').padStart(2,'0')}`
          : null
        return { lat: d.lat, lng: d.lng, name: item.aptNm, price: formatPriceShort(item.dealAmount, item.dealType), dealType: item.dealType, dealDate }
      } catch { return null }
    }))
    setPriceMarkers(markers.filter(Boolean))
  }

  function formatPriceShort(amount: string, dealType: string) {
    if (dealType === '월세') {
      const [dep, mon] = amount.split('·')
      return `${dep.replace('보','')}/${mon.replace('월','')}`
    }
    const n = parseInt(amount)
    if (isNaN(n)) return amount
    return n >= 10000 ? `${Math.floor(n/10000)}억` : `${Math.round(n/1000)}천`
  }

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // URL params로 위치 복원
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const pLat = parseFloat(params.get('lat') || '')
    const pLng = parseFloat(params.get('lng') || '')
    const pAddr = params.get('address')
    const pSido = params.get('sido')
    if (!isNaN(pLat) && !isNaN(pLng)) {
      setLat(pLat); setLng(pLng)
      if (pAddr) setAddress(decodeURIComponent(pAddr))
      if (pSido) setSido(decodeURIComponent(pSido))
    }
  }, [])

  // 위치 변경 시 최근 동네 저장
  useEffect(() => {
    if (address && address !== '서울특별시 중구' && address !== '주소 불러오는 중...' && address !== '현재 위치') {
      addRecent({ name: address, lat, lng, sido })
    }
  }, [address, lat, lng, sido])

  // 공유 URL 복사
  function handleShareUrl() {
    const url = `${window.location.origin}?lat=${lat}&lng=${lng}&address=${encodeURIComponent(address)}&sido=${encodeURIComponent(sido)}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // 공유 카드 생성
  function handleShareCard() {
    const canvas = document.createElement('canvas')
    canvas.width = 600; canvas.height = 340
    const ctx = canvas.getContext('2d')!

    // 배경
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, 600, 340)

    // 그라디언트 장식
    const grad = ctx.createLinearGradient(0, 0, 600, 340)
    grad.addColorStop(0, 'rgba(59,130,246,0.15)')
    grad.addColorStop(1, 'rgba(139,92,246,0.08)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 600, 340)

    // 테두리
    ctx.strokeStyle = 'rgba(59,130,246,0.3)'
    ctx.lineWidth = 1.5
    ctx.roundRect(2, 2, 596, 336, 16)
    ctx.stroke()

    // 로고
    ctx.fillStyle = 'white'
    ctx.font = 'bold 14px sans-serif'
    ctx.fillText('📍 동네허브', 24, 36)

    // 주소
    ctx.fillStyle = 'white'
    ctx.font = 'bold 22px sans-serif'
    ctx.fillText(address.length > 24 ? address.slice(0, 24) + '...' : address, 24, 80)

    // 좌표
    ctx.fillStyle = '#475569'
    ctx.font = '12px sans-serif'
    ctx.fillText(`${lat.toFixed(4)}°N · ${lng.toFixed(4)}°E`, 24, 102)

    // 구분선
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(24, 120); ctx.lineTo(576, 120); ctx.stroke()

    // 정보 박스들
    const boxes = [
      { label: '시·도', value: sido, color: '#3b82f6' },
      { label: '위도', value: lat.toFixed(4) + '°', color: '#10b981' },
      { label: '경도', value: lng.toFixed(4) + '°', color: '#8b5cf6' },
    ]
    boxes.forEach((box, i) => {
      const x = 24 + i * 186
      ctx.fillStyle = 'rgba(255,255,255,0.04)'
      ctx.roundRect(x, 132, 174, 72, 8)
      ctx.fill()
      ctx.fillStyle = '#64748b'
      ctx.font = '10px sans-serif'
      ctx.fillText(box.label, x + 12, 152)
      ctx.fillStyle = box.color
      ctx.font = 'bold 18px sans-serif'
      ctx.fillText(box.value, x + 12, 182)
    })

    // 하단 URL
    ctx.fillStyle = '#1e3a5f'
    ctx.font = '11px sans-serif'
    ctx.fillText('dongnehub.com', 24, 310)

    ctx.fillStyle = '#334155'
    ctx.font = '10px sans-serif'
    const shareUrl = `dongnehub.com?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`
    ctx.fillText(shareUrl, 24, 328)

    // 다운로드
    const link = document.createElement('a')
    link.download = `동네허브_${address.replace(/\s/g, '_')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }


  const grid = latlngToGrid(lat, lng)

  useEffect(() => {
    fetch(`/api/forecast?nx=${grid.nx}&ny=${grid.ny}`)
      .then(r => r.json())
      .then(d => {
        const items: any[] = d.items || []
        const rainItem = items.find(i => i.category === 'PTY' && i.fcstValue !== '0')
        const snowItem = items.find(i => i.category === 'SNO' && parseFloat(i.fcstValue) > 0)
        const rainAmt = items.find(i => i.category === 'PCP' && i.fcstValue !== '강수없음')
        if (snowItem) setRainAlert('❄️ 오늘 눈이 예보되어 있어요')
        else if (rainItem || rainAmt) setRainAlert('🌧️ 오늘 비가 예보되어 있어요. 우산을 챙기세요!')
        else setRainAlert(null)
      })
      .catch(() => {})
  }, [grid.nx, grid.ny])

  const handleMapClick = useCallback(async (clickLat: number, clickLng: number) => {
    setLat(clickLat)
    setLng(clickLng)
    setAddress('주소 불러오는 중...')
    if (isMobile) setMobileView('info')
    try {
      const res = await fetch(`/api/address?lat=${clickLat}&lng=${clickLng}`)
      const data = await res.json()
      const addr = data.address || `${clickLat.toFixed(4)}°N, ${clickLng.toFixed(4)}°E`
      setAddress(addr)
      const matched = SIDO_LIST.find(s => addr.includes(s))
      if (matched) setSido(matched)
    } catch {
      setAddress(`${clickLat.toFixed(4)}°N, ${clickLng.toFixed(4)}°E`)
    }
  }, [isMobile])

  function handleCurrentLocation() {
    navigator.geolocation.getCurrentPosition(pos => {
      setLat(pos.coords.latitude)
      setLng(pos.coords.longitude)
      setAddress('현재 위치')
    })
  }

  function handleSearchInputChange(val: string) {
    setSearchInput(val)
    if (suggestTimer.current) clearTimeout(suggestTimer.current)
    if (!val.trim()) { setSuggestions([]); setShowSuggestions(false); return }
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(val)}&sido=${encodeURIComponent(sido)}`)
        const data = await res.json()
        setSuggestions(data)
        setShowSuggestions(data.length > 0)
      } catch {}
    }, 250)
  }

  function applySuggestion(s: { name: string; lat: number; lng: number; province: string }) {
    setSearchInput(s.name)
    setLat(s.lat)
    setLng(s.lng)
    setAddress(s.name)
    const matched = SIDO_LIST.find(sido => s.province.includes(sido) || s.name.includes(sido))
    if (matched) setSido(matched)
    setSuggestions([])
    setShowSuggestions(false)
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchInput.trim()) return
    setShowSuggestions(false)
    if (suggestions.length > 0) { applySuggestion(suggestions[0]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(searchInput)}`)
      const data = await res.json()
      if (data.lat && data.lng) {
        setLat(data.lat)
        setLng(data.lng)
        setAddress(searchInput)
        const province = data.province || ''
        const matched = SIDO_LIST.find(s => province.includes(s) || searchInput.includes(s))
        if (matched) setSido(matched)
      }
    } finally {
      setSearching(false)
    }
  }

  function handleSidoChange(newSido: string) {
    setSido(newSido)
    const [newLat, newLng] = SIDO_COORDS[newSido]
    setLat(newLat)
    setLng(newLng)
    setAddress(`${newSido}`)
  }

  const tabContent = (
    <>
      {activeTab === 'weather' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <WeatherWidget nx={grid.nx} ny={grid.ny} />
          <ForecastWidget nx={grid.nx} ny={grid.ny} />
          <DustWidget sido={sido} />
          <NeighborhoodScore lat={lat} lng={lng} sido={sido} nx={grid.nx} ny={grid.ny} />
          {/* 공유 버튼들 */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleShareUrl} style={{
              flex: 1, padding: '8px', borderRadius: 9, border: '1px solid rgba(59,130,246,0.25)',
              background: copied ? 'rgba(52,211,153,0.12)' : 'rgba(59,130,246,0.08)',
              color: copied ? '#34d399' : '#60a5fa', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>
              {copied ? '✅ 복사됨!' : '🔗 이 동네 URL 공유'}
            </button>
            <button onClick={handleShareCard} style={{
              flex: 1, padding: '8px', borderRadius: 9, border: '1px solid rgba(139,92,246,0.25)',
              background: 'rgba(139,92,246,0.08)', color: '#c4b5fd', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>
              🖼 정보 카드 저장
            </button>
          </div>
          <button onClick={() => setShowCompareModal(true)} style={{
            width: '100%', padding: '8px', borderRadius: 9, border: '1px solid rgba(234,179,8,0.25)',
            background: 'rgba(234,179,8,0.08)', color: '#fbbf24', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}>
            🆚 다른 동네와 비교하기
          </button>
        </div>
      )}
      {activeTab === 'places' && <PlacesWidget lat={lat} lng={lng} onPlacesChange={setMapPlaces} />}
      {activeTab === 'food' && <RestaurantWidget lat={lat} lng={lng} />}
      {activeTab === 'realestate' && (
        <RealEstateWidget sido={sido} lat={lat} lng={lng}
          onItemsChange={handleRealEstateItems}
          externalSelected={aptExternalSelect}
          onLoadingChange={setRealEstateLoading}
          propType={rePropType}
          dealTab={reDealTab}
          onPropTypeChange={setRePropType}
          onDealTabChange={setReDealTab}
          onAptLocate={(aLat, aLng, name) => {
            setMapFocus({ lat: aLat, lng: aLng })
            setHighlightedApt(name)
            if (isMobile) setMobileView('map')
          }}
        />
      )}
      {activeTab === 'life' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <BusWidget lat={lat} lng={lng} />
          <SafetyWidget sido={sido} lat={lat} lng={lng} />
          <EventsWidget sido={sido} />
        </div>
      )}
      {activeTab === 'favorites' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 12, padding: '10px 14px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>⭐ 즐겨찾기</p>
            <p style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>별표 버튼으로 현재 위치를 저장하세요</p>
          </div>
          {favorites.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#475569', fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📍</div>
              저장된 위치가 없어요
            </div>
          ) : (
            favorites.map(f => (
              <div key={f.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => { setLat(f.lat); setLng(f.lng); setAddress(f.name); setSido(f.sido) }}
                  style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'white', marginBottom: 2 }}>{f.name}</p>
                  <p style={{ fontSize: 10, color: '#475569' }}>{f.sido} · {f.lat.toFixed(3)}°N {f.lng.toFixed(3)}°E</p>
                </button>
                <button
                  onClick={() => removeFav(f.id)}
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '5px 8px', color: '#f87171', cursor: 'pointer', fontSize: 11, fontWeight: 700, flexShrink: 0 }}
                >삭제</button>
              </div>
            ))
          )}

          {/* 최근 본 동네 */}
          {recentPlaces.length > 0 && (
            <>
              <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '10px 14px', marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#818cf8' }}>🕐 최근 본 동네</p>
                  <button onClick={clearRecent} style={{ fontSize: 10, color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}>전체삭제</button>
                </div>
              </div>
              {recentPlaces.map(r => (
                <div key={r.timestamp} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => { setLat(r.lat); setLng(r.lng); setAddress(r.name); setSido(r.sido) }}
                    style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 2 }}>{r.name}</p>
                    <p style={{ fontSize: 10, color: '#334155' }}>{r.sido} · {new Date(r.timestamp).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</p>
                  </button>
                  <button onClick={() => removeRecent(r.timestamp)} style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', fontSize: 13, padding: '2px 4px' }}>✕</button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: isMobile ? '#f0f4f8' : '#0f172a', overflow: 'hidden' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
        .tab-btn:hover { background: rgba(255,255,255,0.07) !important; }
        .icon-btn:hover { background: rgba(59,130,246,0.25) !important; }
        .sido-select option { background: #1e293b; color: white; }
        input::placeholder { color: #94a3b8; }
        .mobile-tabs::-webkit-scrollbar { display: none; }
        .m-tab-btn:active { opacity: 0.7; }
      `}</style>

      {/* 모바일 헤더 */}
      {isMobile ? (
        <header style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '10px 14px',
          display: 'flex', flexDirection: 'column', gap: 10,
          flexShrink: 0, zIndex: 100,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          {/* 로고 + 지역선택 + 내 위치 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 10, padding: '6px 7px' }}>
                <MapPin size={16} color="white" />
              </div>
              <span style={{ fontWeight: 800, fontSize: 17, color: '#1e293b' }}>동네허브</span>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ position: 'relative' }}>
              <select value={sido} onChange={e => handleSidoChange(e.target.value)} style={{
                appearance: 'none', border: '1.5px solid #e2e8f0', borderRadius: 10,
                padding: '8px 28px 8px 12px', fontSize: 14,
                color: '#1e293b', background: '#f8fafc', cursor: 'pointer', outline: 'none', fontWeight: 600,
              }}>
                {SIDO_LIST.map(s => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
            </div>
            <button onClick={handleCurrentLocation} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: '#eff6ff', color: '#2563eb',
              border: '1.5px solid #bfdbfe', borderRadius: 10,
              padding: '8px 12px', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              <Navigation size={15} />내 위치
            </button>
          </div>

          {/* 검색창 */}
          <form onSubmit={handleSearch} style={{ position: 'relative' }}>
            <Search size={17} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
            <input
              value={searchInput}
              onChange={e => handleSearchInputChange(e.target.value)}
              placeholder="동네·장소 검색  (예: 강남구, 스타벅스)"
              style={{
                width: '100%', paddingLeft: 42, paddingRight: searchInput ? 36 : 14,
                paddingTop: 12, paddingBottom: 12,
                border: '1.5px solid #e2e8f0',
                borderRadius: showSuggestions ? '12px 12px 0 0' : 12,
                fontSize: 15, outline: 'none',
                background: '#f8fafc', color: '#1e293b',
              }}
              onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#fff'; if (suggestions.length > 0) setShowSuggestions(true) }}
              onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; setTimeout(() => setShowSuggestions(false), 150) }}
            />
            {searchInput && !searching && (
              <button type="button" onClick={() => { setSearchInput(''); setSuggestions([]); setShowSuggestions(false) }}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: '#e2e8f0', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                <X size={13} />
              </button>
            )}
            {searching && (
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, border: '2.5px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite', zIndex: 1 }} />
            )}
            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 500,
                background: '#fff', border: '1.5px solid #3b82f6', borderTop: 'none',
                borderRadius: '0 0 12px 12px', overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              }}>
                {suggestions.some(s => s.otherRegion) && (
                  <div style={{ padding: '6px 14px', background: '#fef9c3', borderBottom: '1px solid #fde047' }}>
                    <p style={{ fontSize: 11, color: '#854d0e' }}>⚠️ {sido} 내 결과 없음 — 다른 지역 결과입니다</p>
                  </div>
                )}
                {suggestions.map((s, i) => (
                  <button key={i} type="button" onMouseDown={() => applySuggestion(s)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                    padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: i < suggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                    color: '#1e293b',
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{s.type === 'place' ? '🏢' : '📍'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{s.name}</span>
                      {s.category && <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>{s.category}</span>}
                    </div>
                    {s.province && <span style={{ fontSize: 13, color: s.otherRegion ? '#f97316' : '#64748b', flexShrink: 0 }}>{s.province}</span>}
                  </button>
                ))}
                <div style={{ padding: '8px 14px', borderTop: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: 11, color: '#94a3b8' }}>일부 위치는 검색이 안 될 수 있어요</p>
                </div>
              </div>
            )}
          </form>
        </header>
      ) : (
      /* 데스크탑 헤더 */
      <header style={{
        background: 'rgba(15,23,42,0.98)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 20px',
        height: 58,
        display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 9, padding: '5px 6px', boxShadow: '0 0 10px rgba(59,130,246,0.35)' }}>
            <MapPin size={13} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, color: 'white', letterSpacing: '-0.3px' }}>동네허브</span>
        </div>

        <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: 440, position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none', zIndex: 1 }} />
          <input
            value={searchInput}
            onChange={e => handleSearchInputChange(e.target.value)}
            placeholder="동네 검색..."
            style={{
              width: '100%', paddingLeft: 32, paddingRight: searchInput ? 28 : 10,
              paddingTop: 8, paddingBottom: 8, border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: showSuggestions ? '10px 10px 0 0' : 10, fontSize: 13, outline: 'none',
              background: 'rgba(255,255,255,0.06)', color: 'white', transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.55)'; if (suggestions.length > 0) setShowSuggestions(true) }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; setTimeout(() => setShowSuggestions(false), 150) }}
          />
          {searchInput && !searching && (
            <button type="button" onClick={() => { setSearchInput(''); setSuggestions([]); setShowSuggestions(false) }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', lineHeight: 1, zIndex: 1 }}>
              <X size={12} />
            </button>
          )}
          {searching && (
            <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite', zIndex: 1 }} />
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 500,
              background: 'rgba(15,23,42,0.98)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(59,130,246,0.3)', borderTop: 'none',
              borderRadius: '0 0 10px 10px', overflow: 'hidden',
            }}>
              {suggestions.some(s => s.otherRegion) && (
                <div style={{ padding: '6px 12px', background: 'rgba(251,191,36,0.1)', borderBottom: '1px solid rgba(251,191,36,0.2)' }}>
                  <p style={{ fontSize: 10, color: '#fbbf24' }}>⚠️ {sido} 내 결과 없음 — 다른 지역 결과</p>
                </div>
              )}
              {suggestions.map((s, i) => (
                <button key={i} type="button" onMouseDown={() => applySuggestion(s)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                  padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  color: 'white',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.12)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ fontSize: 11, color: '#64748b', flexShrink: 0 }}>{s.type === 'place' ? '🏢' : '📍'}</span>
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{s.name}</span>
                    {s.category && <span style={{ fontSize: 10, color: '#475569', marginLeft: 5 }}>{s.category}</span>}
                  </div>
                  {s.province && <span style={{ fontSize: 10, color: s.otherRegion ? '#f97316' : '#475569', flexShrink: 0 }}>{s.province}</span>}
                </button>
              ))}
            </div>
          )}
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button onClick={handleCurrentLocation} className="icon-btn" style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(59,130,246,0.12)', color: '#60a5fa',
            border: '1px solid rgba(59,130,246,0.2)', borderRadius: 9,
            padding: '7px 12px', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>
            <Navigation size={12} />내 위치
          </button>

          <div style={{ position: 'relative' }}>
            <select value={sido} onChange={e => handleSidoChange(e.target.value)} className="sido-select" style={{
              appearance: 'none', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 9,
              padding: '7px 26px 7px 11px', fontSize: 12,
              color: 'white', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', outline: 'none', fontWeight: 500,
            }}>
              {SIDO_LIST.map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown size={11} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
          </div>

          <button
            onClick={() => {
              if (isSaved(lat, lng)) {
                removeFav(`${lat.toFixed(4)}_${lng.toFixed(4)}`)
              } else {
                addFav({ name: address, lat, lng, sido })
                setActiveTab('favorites')
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: isSaved(lat, lng) ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.07)',
              color: isSaved(lat, lng) ? '#fbbf24' : '#94a3b8',
              border: `1px solid ${isSaved(lat, lng) ? 'rgba(234,179,8,0.3)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 9, padding: '7px 9px', cursor: 'pointer', flexShrink: 0, fontSize: 12, fontWeight: 600,
            }}
          >
            {isSaved(lat, lng) ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
            <span>{isSaved(lat, lng) ? '저장됨' : '저장'}</span>
          </button>
        </div>
      </header>
      )}

      {/* 강수 알림 배너 */}
      {rainAlert && (
        <div style={{
          background: isMobile ? '#eff6ff' : 'linear-gradient(90deg, rgba(59,130,246,0.18), rgba(99,102,241,0.12))',
          borderBottom: isMobile ? '1px solid #bfdbfe' : '1px solid rgba(59,130,246,0.18)',
          padding: isMobile ? '10px 16px' : '6px 16px',
          fontSize: isMobile ? 14 : 12, fontWeight: 600,
          color: isMobile ? '#1d4ed8' : '#93c5fd',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <span>{rainAlert}</span>
          <button onClick={() => setRainAlert(null)} style={{ background: 'none', border: 'none', color: isMobile ? '#64748b' : '#475569', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* 본문 */}
      {isMobile ? (
        /* ── 모바일 레이아웃 ── */
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {mobileView === 'map' ? (
            <div style={{ flex: 1, position: 'relative' }}>
              <Map lat={lat} lng={lng} address={address} onMapClick={handleMapClick}
                places={activeTab === 'places' ? mapPlaces : []}
                priceMarkers={activeTab === 'realestate' ? priceMarkers : []}
                highlightedApt={highlightedApt}
                focusLat={mapFocus?.lat}
                focusLng={mapFocus?.lng}
                onPriceMarkerClick={name => {
                  setAptExternalSelect(name)
                  setHighlightedApt(name)
                  setActiveTab('realestate')
                  setMobileView('info')
                }}
              />
              {/* 지도 안 현재 주소 표시 */}
              <div style={{
                position: 'absolute', top: 12, left: 12, right: 12, zIndex: 999,
                background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
                borderRadius: 14, padding: '10px 14px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                <p style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{address}</p>
              </div>
              {/* 정보 보기 버튼 */}
              <button
                onClick={() => setMobileView('info')}
                style={{
                  position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
                  background: '#2563eb', color: 'white', border: 'none',
                  borderRadius: 50, padding: '14px 28px',
                  fontSize: 16, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(37,99,235,0.5)',
                  display: 'flex', alignItems: 'center', gap: 8, zIndex: 999,
                  whiteSpace: 'nowrap',
                }}
              >
                📋 이 동네 정보 보기
              </button>
            </div>
          ) : (
            <>
              {/* 위치 표시 바 */}
              <div style={{
                padding: '12px 16px', background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 6px #3b82f6', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {address}</p>
                </div>
                {/* 지도 보기 버튼 */}
                <button
                  onClick={() => setMobileView('map')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: '#eff6ff', color: '#2563eb',
                    border: '1.5px solid #bfdbfe', borderRadius: 10,
                    padding: '8px 12px', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                  }}
                >
                  <MapIcon size={15} /> 지도 보기
                </button>
              </div>

              {/* 모바일 탭 바 */}
              <div className="mobile-tabs" style={{
                display: 'flex', overflowX: 'auto', flexShrink: 0,
                background: '#ffffff', borderBottom: '2px solid #e2e8f0',
                gap: 0, padding: '0 6px',
              }}>
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="m-tab-btn" style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    padding: '10px 14px 8px', fontSize: 12, fontWeight: 700, flexShrink: 0,
                    border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                    background: 'transparent',
                    color: activeTab === tab.id ? '#2563eb' : '#64748b',
                    borderBottom: activeTab === tab.id ? '3px solid #2563eb' : '3px solid transparent',
                    transition: 'all 0.15s',
                    marginBottom: -2,
                  }}>
                    <span style={{ fontSize: 22 }}>{tab.icon}</span>
                    <span style={{ fontSize: 12 }}>{tab.label}</span>
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 80px' }}>
                {tabContent}
              </div>

              {/* 하단 즐겨찾기 저장 버튼 */}
              <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
                background: '#ffffff', borderTop: '1px solid #e2e8f0',
                padding: '10px 14px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
              }}>
                <button
                  onClick={() => {
                    if (isSaved(lat, lng)) removeFav(`${lat.toFixed(4)}_${lng.toFixed(4)}`)
                    else { addFav({ name: address, lat, lng, sido }); setActiveTab('favorites') }
                  }}
                  style={{
                    width: '100%', padding: '14px',
                    background: isSaved(lat, lng) ? '#fef3c7' : '#f8fafc',
                    color: isSaved(lat, lng) ? '#92400e' : '#475569',
                    border: `2px solid ${isSaved(lat, lng) ? '#fcd34d' : '#e2e8f0'}`,
                    borderRadius: 14, fontSize: 15, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {isSaved(lat, lng) ? <><BookmarkCheck size={18} /> 즐겨찾기에 저장됨</> : <><Bookmark size={18} /> 이 동네 즐겨찾기에 저장</>}
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        /* ── 데스크탑 레이아웃 ── */
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          <aside style={{
            width: sidebarOpen ? 320 : 0,
            background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden',
            transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)', zIndex: 50,
          }}>
            {/* 위치 헤더 */}
            <div style={{
              padding: '14px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.05) 100%)', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }} />
                  <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>선택 위치</span>
                </div>
                <button
                  onClick={() => {
                    if (isSaved(lat, lng)) removeFav(`${lat.toFixed(4)}_${lng.toFixed(4)}`)
                    else addFav({ name: address, lat, lng, sido })
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                    borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                    background: isSaved(lat, lng) ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.06)',
                    color: isSaved(lat, lng) ? '#fbbf24' : '#475569',
                  }}
                >
                  {isSaved(lat, lng) ? '★ 저장됨' : '☆ 저장'}
                </button>
              </div>
              <p style={{ fontSize: 15, fontWeight: 800, color: 'white', marginBottom: 3, lineHeight: 1.3 }}>{address}</p>
              <p style={{ fontSize: 10, color: '#475569' }}>{lat.toFixed(4)}°N · {lng.toFixed(4)}°E</p>
            </div>

            {/* 탭 그리드 3×3 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="tab-btn" style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '11px 4px', fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: activeTab === tab.id ? 'rgba(59,130,246,0.12)' : 'transparent',
                  color: activeTab === tab.id ? '#93c5fd' : '#64748b',
                  borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                  transition: 'all 0.15s', position: 'relative',
                }}>
                  <span style={{ fontSize: 18 }}>{tab.icon}</span>
                  {tab.label}
                  {tab.id === 'favorites' && favorites.length > 0 && (
                    <span style={{ position: 'absolute', top: 6, right: '50%', transform: 'translateX(14px)', background: '#f59e0b', borderRadius: '50%', width: 14, height: 14, fontSize: 8, fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{favorites.length}</span>
                  )}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
              {tabContent}
            </div>

            <div style={{ padding: '8px 18px', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 9, color: '#1e3a5f', letterSpacing: '0.06em' }}>DONGNEHUB · 공공데이터 기반</span>
            </div>
          </aside>

          <button onClick={() => setSidebarOpen(v => !v)} style={{
            position: 'absolute', left: sidebarOpen ? 320 : 0, top: '50%', transform: 'translateY(-50%)',
            zIndex: 200, background: sidebarOpen ? 'rgba(15,23,42,0.95)' : 'rgba(59,130,246,0.9)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${sidebarOpen ? 'rgba(255,255,255,0.09)' : 'rgba(59,130,246,0.6)'}`,
            borderLeft: sidebarOpen ? 'none' : undefined,
            borderRadius: '0 10px 10px 0',
            width: 22, height: 56, cursor: 'pointer',
            color: sidebarOpen ? '#64748b' : 'white',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
            transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: sidebarOpen ? 'none' : '0 0 12px rgba(59,130,246,0.4)',
          }}>
            <span style={{ fontSize: 13, lineHeight: 1 }}>{sidebarOpen ? '‹' : '›'}</span>
            {!sidebarOpen && <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.05em', writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: 'rgba(255,255,255,0.8)' }}>메뉴</span>}
          </button>

          <main style={{ flex: 1, position: 'relative', minWidth: 0 }}>
            <Map lat={lat} lng={lng} address={address} onMapClick={handleMapClick}
              onMapMove={activeTab === 'realestate' ? (mLat, mLng) => {
                setLat(mLat)
                setLng(mLng)
              } : undefined}
              places={activeTab === 'places' ? mapPlaces : []}
              priceMarkers={activeTab === 'realestate' ? priceMarkers : []}
              highlightedApt={highlightedApt}
              focusLat={mapFocus?.lat}
              focusLng={mapFocus?.lng}
              onPriceMarkerClick={name => {
                setAptExternalSelect(name)
                setHighlightedApt(name)
                setActiveTab('realestate')
                setSidebarOpen(true)
              }}
            />
            {/* 부동산 로딩 오버레이 */}
            {realEstateLoading && activeTab === 'realestate' && (
              <div style={{
                position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(12px)',
                color: 'white', borderRadius: 20, padding: '7px 16px', fontSize: 12, fontWeight: 700,
                pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 1001,
                border: '1px solid rgba(59,130,246,0.4)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#60a5fa', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                부동산 데이터 불러오는 중...
              </div>
            )}
            <div style={{
              position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(12px)',
              color: 'rgba(255,255,255,0.6)', borderRadius: 16, padding: '6px 15px', fontSize: 11,
              pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 1000,
              border: '1px solid rgba(255,255,255,0.07)',
            }}>
              📍 지도를 클릭하면 해당 위치 정보를 불러와요
            </div>
          </main>
        </div>
      )}

      {showCompareModal && (
        <CompareModal
          current={{ name: address, lat, lng, sido }}
          onClose={() => setShowCompareModal(false)}
        />
      )}
    </div>
  )
}
