'use client'
import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Search, Navigation, CloudSun, Wind, ChevronDown, Building2, Calendar, X } from 'lucide-react'
import WeatherWidget from '@/components/WeatherWidget'
import DustWidget from '@/components/DustWidget'
import ForecastWidget from '@/components/ForecastWidget'
import PlacesWidget from '@/components/PlacesWidget'
import EventsWidget from '@/components/EventsWidget'

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm text-gray-500">지도 불러오는 중...</p>
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
  { id: 'weather', label: '날씨', icon: '🌤' },
  { id: 'dust', label: '미세먼지', icon: '💨' },
  { id: 'places', label: '편의시설', icon: '🏢' },
  { id: 'events', label: '행사', icon: '🎪' },
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
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const grid = latlngToGrid(lat, lng)

  const handleMapClick = useCallback(async (clickLat: number, clickLng: number) => {
    setLat(clickLat)
    setLng(clickLng)
    setAddress('주소 불러오는 중...')
    try {
      const res = await fetch(`/api/address?lat=${clickLat}&lng=${clickLng}`)
      const data = await res.json()
      setAddress(data.address || `${clickLat.toFixed(4)}°N, ${clickLng.toFixed(4)}°E`)
    } catch {
      setAddress(`${clickLat.toFixed(4)}°N, ${clickLng.toFixed(4)}°E`)
    }
  }, [])

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
        setSearchInput('')
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
        .tab-btn:hover { background: rgba(255,255,255,0.08) !important; }
        .icon-btn:hover { background: rgba(255,255,255,0.12) !important; transform: scale(1.05); }
        .sido-select option { background: #1e293b; color: white; }
      `}</style>

      {/* 헤더 */}
      <header style={{
        background: 'rgba(15,23,42,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0 20px',
        height: 58,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
        zIndex: 100,
      }}>
        {/* 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 4 }}>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: 10, padding: '6px 7px', display: 'flex',
            boxShadow: '0 0 12px rgba(59,130,246,0.4)'
          }}>
            <MapPin size={15} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, color: 'white', letterSpacing: '-0.3px' }}>동네허브</span>
        </div>

        {/* 검색창 */}
        <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: 440, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="동네 이름으로 검색..."
            style={{
              width: '100%', paddingLeft: 36, paddingRight: searchInput ? 32 : 12,
              paddingTop: 9, paddingBottom: 9,
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, fontSize: 13,
              outline: 'none', background: 'rgba(255,255,255,0.07)',
              color: 'white', transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.6)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
          {searchInput && (
            <button type="button" onClick={() => setSearchInput('')} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 2,
            }}>
              <X size={13} />
            </button>
          )}
          {searching && (
            <div style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              width: 14, height: 14, border: '2px solid #3b82f6', borderTopColor: 'transparent',
              borderRadius: '50%', animation: 'spin 0.6s linear infinite'
            }} />
          )}
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          {/* 내 위치 */}
          <button
            onClick={handleCurrentLocation}
            className="icon-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
              border: '1px solid rgba(59,130,246,0.25)',
              borderRadius: 10, padding: '7px 12px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
          >
            <Navigation size={13} />내 위치
          </button>

          {/* 시도 선택 */}
          <div style={{ position: 'relative' }}>
            <select
              value={sido}
              onChange={e => handleSidoChange(e.target.value)}
              className="sido-select"
              style={{
                appearance: 'none',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                padding: '7px 28px 7px 12px', fontSize: 13,
                color: 'white', background: 'rgba(255,255,255,0.07)',
                cursor: 'pointer', outline: 'none', fontWeight: 500,
              }}
            >
              {SIDO_LIST.map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
          </div>
        </div>
      </header>

      {/* 본문 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* 사이드바 */}
        <aside style={{
          width: sidebarOpen ? 300 : 0,
          background: 'rgba(15,23,42,0.97)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column',
          flexShrink: 0, overflow: 'hidden',
          transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
          zIndex: 50,
        }}>
          {/* 위치 헤더 */}
          <div style={{
            padding: '16px 18px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'linear-gradient(180deg, rgba(59,130,246,0.08) 0%, transparent 100%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 6px #3b82f6' }} />
              <span style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>선택된 위치</span>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 3, lineHeight: 1.3 }}>{address}</p>
            <p style={{ fontSize: 11, color: '#334155' }}>{lat.toFixed(4)}°N · {lng.toFixed(4)}°E</p>
          </div>

          {/* 탭 */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, padding: '0 4px' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="tab-btn"
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 3, padding: '10px 4px', fontSize: 10, fontWeight: 700,
                  border: 'none', background: 'none', cursor: 'pointer',
                  color: activeTab === tab.id ? '#60a5fa' : '#475569',
                  borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                  transition: 'all 0.2s', borderRadius: '4px 4px 0 0',
                  letterSpacing: '0.02em',
                }}
              >
                <span style={{ fontSize: 16 }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* 탭 컨텐츠 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
            {activeTab === 'weather' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <WeatherWidget nx={grid.nx} ny={grid.ny} />
                <ForecastWidget nx={grid.nx} ny={grid.ny} />
              </div>
            )}
            {activeTab === 'dust' && <DustWidget sido={sido} />}
            {activeTab === 'places' && (
              <PlacesWidget lat={lat} lng={lng} onPlacesChange={setMapPlaces} />
            )}
            {activeTab === 'events' && <EventsWidget sido={sido} />}
          </div>

          <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <span style={{ fontSize: 10, color: '#1e293b', letterSpacing: '0.05em' }}>DONGNEHUB · 공공데이터 기반</span>
          </div>
        </aside>

        {/* 사이드바 토글 버튼 */}
        <button
          onClick={() => setSidebarOpen(v => !v)}
          style={{
            position: 'absolute', left: sidebarOpen ? 300 : 0, top: '50%', transform: 'translateY(-50%)',
            zIndex: 200, background: 'rgba(15,23,42,0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderLeft: sidebarOpen ? 'none' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: sidebarOpen ? '0 8px 8px 0' : '0 8px 8px 0',
            width: 20, height: 48, cursor: 'pointer', color: '#475569',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)',
            fontSize: 10,
          }}
        >
          {sidebarOpen ? '‹' : '›'}
        </button>

        {/* 지도 */}
        <main style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <Map lat={lat} lng={lng} address={address} onMapClick={handleMapClick} places={activeTab === 'places' ? mapPlaces : []} />

          {/* 지도 하단 힌트 */}
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(12px)',
            color: 'rgba(255,255,255,0.7)', borderRadius: 20,
            padding: '7px 16px', fontSize: 12,
            pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 1000,
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            📍 지도를 클릭하면 해당 위치 정보를 불러와요
          </div>
        </main>
      </div>
    </div>
  )
}
