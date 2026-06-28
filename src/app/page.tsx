'use client'
import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Search, Navigation, ChevronDown, X, Map as MapIcon, Bookmark, BookmarkCheck } from 'lucide-react'
import { useFavorites } from '@/hooks/useFavorites'
import WeatherWidget from '@/components/WeatherWidget'
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
  const [mapPlaces, setMapPlaces] = useState<any[]>([])
  const [priceMarkers, setPriceMarkers] = useState<any[]>([])
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number } | null>(null)
  const [aptExternalSelect, setAptExternalSelect] = useState<string | null>(null)
  const [highlightedApt, setHighlightedApt] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [rainAlert, setRainAlert] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileView, setMobileView] = useState<'info' | 'map'>('info')
  const { favorites, add: addFav, remove: removeFav, isSaved } = useFavorites()

  async function handleRealEstateItems(items: any[]) {
    const top = items.slice(0, 30)
    const markers = await Promise.all(top.map(async item => {
      try {
        const res = await fetch(`/api/geocode-apt?q=${encodeURIComponent(item.aptNm + (item.umdNm ? ' ' + item.umdNm : ''))}&propType=${item.propType || 'apt'}`)
        const d = await res.json()
        if (!d.lat) return null
        const price = item.dealType === '월세'
          ? item.dealAmount.replace('보', '보').replace('·월', '/월')
          : item.dealAmount.length > 5 ? item.dealAmount.slice(0, 6) + '..' : item.dealAmount
        return { lat: d.lat, lng: d.lng, name: item.aptNm, price: formatPriceShort(item.dealAmount, item.dealType), dealType: item.dealType }
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

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchInput.trim()) return
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
        </div>
      )}
      {activeTab === 'places' && <PlacesWidget lat={lat} lng={lng} onPlacesChange={setMapPlaces} />}
      {activeTab === 'food' && <RestaurantWidget lat={lat} lng={lng} />}
      {activeTab === 'realestate' && (
        <RealEstateWidget sido={sido} lat={lat} lng={lng}
          onItemsChange={handleRealEstateItems}
          externalSelected={aptExternalSelect}
          onAptLocate={(aLat, aLng, name) => {
            setMapFocus({ lat: aLat, lng: aLng })
            setHighlightedApt(name)
          }}
        />
      )}
      {activeTab === 'life' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <BusWidget lat={lat} lng={lng} />
          <SafetyWidget sido={sido} />
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
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#475569', fontSize: 13 }}>
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
        </div>
      )}
    </>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0f172a', overflow: 'hidden' }}>
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
        input::placeholder { color: #475569; }
        .mobile-tabs::-webkit-scrollbar { display: none; }
      `}</style>

      {/* 헤더 */}
      <header style={{
        background: 'rgba(15,23,42,0.98)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: isMobile ? '0 12px' : '0 20px',
        height: isMobile ? 52 : 58,
        display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12,
        flexShrink: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 9, padding: '5px 6px', boxShadow: '0 0 10px rgba(59,130,246,0.35)' }}>
            <MapPin size={13} color="white" />
          </div>
          {!isMobile && <span style={{ fontWeight: 800, fontSize: 16, color: 'white', letterSpacing: '-0.3px' }}>동네허브</span>}
        </div>

        <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: isMobile ? '100%' : 440, position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="동네 검색..."
            style={{
              width: '100%', paddingLeft: 32, paddingRight: searchInput ? 28 : 10,
              paddingTop: 8, paddingBottom: 8, border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 10, fontSize: 13, outline: 'none',
              background: 'rgba(255,255,255,0.06)', color: 'white', transition: 'border-color 0.15s',
            }}
            onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.55)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
          />
          {searchInput && !searching && (
            <button type="button" onClick={() => setSearchInput('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', lineHeight: 1 }}>
              <X size={12} />
            </button>
          )}
          {searching && (
            <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
          )}
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button onClick={handleCurrentLocation} className="icon-btn" style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(59,130,246,0.12)', color: '#60a5fa',
            border: '1px solid rgba(59,130,246,0.2)', borderRadius: 9,
            padding: isMobile ? '7px 9px' : '7px 12px', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>
            <Navigation size={12} />
            {!isMobile && '내 위치'}
          </button>

          <div style={{ position: 'relative' }}>
            <select value={sido} onChange={e => handleSidoChange(e.target.value)} className="sido-select" style={{
              appearance: 'none', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 9,
              padding: isMobile ? '7px 22px 7px 9px' : '7px 26px 7px 11px', fontSize: 12,
              color: 'white', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', outline: 'none', fontWeight: 500,
            }}>
              {SIDO_LIST.map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown size={11} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
          </div>

          {/* 즐겨찾기 저장/해제 버튼 */}
          <button
            onClick={() => {
              if (isSaved(lat, lng)) {
                removeFav(`${lat.toFixed(4)}_${lng.toFixed(4)}`)
              } else {
                addFav({ name: address, lat, lng, sido })
                setActiveTab('favorites')
              }
            }}
            title={isSaved(lat, lng) ? '즐겨찾기 해제' : '현재 위치 즐겨찾기 저장'}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: isSaved(lat, lng) ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.07)',
              color: isSaved(lat, lng) ? '#fbbf24' : '#94a3b8',
              border: `1px solid ${isSaved(lat, lng) ? 'rgba(234,179,8,0.3)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 9, padding: '7px 9px', cursor: 'pointer', flexShrink: 0, fontSize: 12, fontWeight: 600,
            }}
          >
            {isSaved(lat, lng) ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
            {!isMobile && <span>{isSaved(lat, lng) ? '저장됨' : '저장'}</span>}
          </button>

          {isMobile && (

            <button onClick={() => setMobileView(v => v === 'info' ? 'map' : 'info')} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: mobileView === 'map' ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.07)',
              color: mobileView === 'map' ? '#c4b5fd' : '#94a3b8',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9,
              padding: '7px 9px', cursor: 'pointer', flexShrink: 0,
            }}>
              <MapIcon size={13} />
            </button>
          )}
        </div>
      </header>

      {/* 강수 알림 배너 */}
      {rainAlert && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(59,130,246,0.18), rgba(99,102,241,0.12))',
          borderBottom: '1px solid rgba(59,130,246,0.18)',
          padding: '6px 16px', fontSize: 12, fontWeight: 600, color: '#93c5fd',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <span>{rainAlert}</span>
          <button onClick={() => setRainAlert(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* 본문 */}
      {isMobile ? (
        /* ── 모바일 레이아웃 ── */
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {mobileView === 'map' ? (
            <div style={{ flex: 1, position: 'relative' }}>
              <Map lat={lat} lng={lng} address={address} onMapClick={handleMapClick} places={activeTab === 'places' ? mapPlaces : []} />
              <div style={{
                position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(10px)',
                color: 'rgba(255,255,255,0.6)', borderRadius: 14, padding: '5px 13px',
                fontSize: 11, pointerEvents: 'none', border: '1px solid rgba(255,255,255,0.07)', zIndex: 999,
              }}>
                📍 탭하면 해당 위치 정보를 불러와요
              </div>
            </div>
          ) : (
            <>
              {/* 위치 표시 바 */}
              <div style={{
                padding: '9px 14px', background: 'rgba(15,23,42,0.97)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 5px #3b82f6', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{address}</p>
                  <p style={{ fontSize: 10, color: '#475569' }}>{lat.toFixed(4)}°N · {lng.toFixed(4)}°E</p>
                </div>
              </div>

              {/* 모바일 탭 바 */}
              <div className="mobile-tabs" style={{
                display: 'flex', overflowX: 'auto', flexShrink: 0,
                background: 'rgba(15,23,42,0.97)', borderBottom: '1px solid rgba(255,255,255,0.06)',
                gap: 2, padding: '4px 8px',
              }}>
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="tab-btn" style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    padding: '7px 12px', fontSize: 10, fontWeight: 700, flexShrink: 0,
                    border: 'none', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap',
                    background: activeTab === tab.id ? 'rgba(59,130,246,0.18)' : 'transparent',
                    color: activeTab === tab.id ? '#93c5fd' : '#64748b',
                    outline: activeTab === tab.id ? '1px solid rgba(59,130,246,0.35)' : 'none',
                    transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: 17 }}>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                {tabContent}
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
    </div>
  )
}
