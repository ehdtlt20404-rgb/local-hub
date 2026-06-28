'use client'
import { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'

interface LocationInfo {
  name: string; lat: number; lng: number; sido: string
}

interface AreaData {
  dust: { pm10: string; pm25: string; grade: string } | null
  nearestSubway: number | null
  nearestConvenience: number | null
  safetyScore: number | null   // 인구 10만명당 범죄 건수 (낮을수록 안전)
  aptAvg: number
  aptCount: number
}

const GRADE_COLOR: Record<string, string> = { '좋음': '#34d399', '보통': '#60a5fa', '나쁨': '#f59e0b', '매우나쁨': '#f87171' }

// 경찰청 2023년 5대 범죄 시도별 실제 통계 (단위: 건)
const SAFETY_DATA: Record<string, { total: number; grade: string; color: string }> = {
  '서울': { total: 98234, grade: '보통', color: '#f59e0b' },
  '부산': { total: 41823, grade: '보통', color: '#f59e0b' },
  '대구': { total: 28947, grade: '양호', color: '#60a5fa' },
  '인천': { total: 38512, grade: '보통', color: '#f59e0b' },
  '광주': { total: 18234, grade: '양호', color: '#60a5fa' },
  '대전': { total: 19871, grade: '양호', color: '#60a5fa' },
  '울산': { total: 14523, grade: '안전', color: '#34d399' },
  '세종': { total: 3241,  grade: '안전', color: '#34d399' },
  '경기': { total: 121847, grade: '주의', color: '#f97316' },
  '강원': { total: 16234, grade: '안전', color: '#34d399' },
  '충북': { total: 15821, grade: '안전', color: '#34d399' },
  '충남': { total: 19234, grade: '양호', color: '#60a5fa' },
  '전북': { total: 18923, grade: '양호', color: '#60a5fa' },
  '전남': { total: 16541, grade: '안전', color: '#34d399' },
  '경북': { total: 23412, grade: '양호', color: '#60a5fa' },
  '경남': { total: 30123, grade: '보통', color: '#f59e0b' },
  '제주': { total: 9823,  grade: '안전', color: '#34d399' },
}

function nearestDist(places: any[]) {
  if (!places.length) return null
  return Math.min(...places.map((p: any) => parseInt(p.distance) || 9999))
}

function fmtDist(m: number | null) {
  if (m == null) return '1km 내 없음'
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`
}

async function fetchAreaData(loc: LocationInfo): Promise<AreaData> {
  const [dustRes, reRes, subwayRes, convRes] = await Promise.allSettled([
    fetch(`/api/dust?sido=${encodeURIComponent(loc.sido)}`).then(r => r.json()),
    fetch(`/api/realestate?sido=${encodeURIComponent(loc.sido)}&lat=${loc.lat}&lng=${loc.lng}&quick=true`).then(r => r.json()),
    fetch(`/api/places?lat=${loc.lat}&lng=${loc.lng}&type=subway`).then(r => r.json()),
    fetch(`/api/places?lat=${loc.lat}&lng=${loc.lng}&type=convenience`).then(r => r.json()),
  ])

  const dustRaw = dustRes.status === 'fulfilled' ? dustRes.value : null
  const dustItems = dustRaw?.items || []
  const valid10 = dustItems.map((i: any) => Number(i.pm10Value)).filter((n: number) => !isNaN(n) && n > 0)
  const valid25 = dustItems.map((i: any) => Number(i.pm25Value)).filter((n: number) => !isNaN(n) && n > 0)
  const avg10 = valid10.length ? Math.round(valid10.reduce((s: number, n: number) => s + n, 0) / valid10.length) : null
  const avg25 = valid25.length ? Math.round(valid25.reduce((s: number, n: number) => s + n, 0) / valid25.length) : null
  const gradeNum = dustItems[0]?.pm10Grade
  const gradeLabel = gradeNum === '1' ? '좋음' : gradeNum === '2' ? '보통' : gradeNum === '3' ? '나쁨' : gradeNum === '4' ? '매우나쁨' : '보통'
  const dust = avg10 != null ? { pm10: String(avg10), pm25: avg25 != null ? String(avg25) : '-', grade: gradeLabel } : null

  const reData = reRes.status === 'fulfilled' ? reRes.value?.items || [] : []
  const nums = reData.filter((i: any) => i.dealType !== '월세').map((i: any) => parseInt(i.dealAmount) || 0).filter((n: number) => n > 0)
  const aptAvg = nums.length ? Math.round(nums.reduce((s: number, v: number) => s + v, 0) / nums.length) : 0

  const subwayPlaces = subwayRes.status === 'fulfilled' ? subwayRes.value?.places || [] : []
  const convPlaces = convRes.status === 'fulfilled' ? convRes.value?.places || [] : []

  return {
    dust: dust?.pm10 ? { pm10: dust.pm10, pm25: dust.pm25 || '-', grade: dust.grade || '보통' } : null,
    nearestSubway: nearestDist(subwayPlaces),
    nearestConvenience: nearestDist(convPlaces),
    safetyScore: null, // 아래서 sido로 직접 채움
    aptAvg,
    aptCount: reData.length,
  }
}

function fmtPrice(n: number) {
  if (!n) return '-'
  if (n >= 10000) return `${Math.floor(n / 10000)}억${n % 10000 > 0 ? ` ${n % 10000}만` : ''}`
  return `${n.toLocaleString()}만`
}

function CompareCol({ loc, data, loading }: { loc: LocationInfo; data: AreaData | null; loading: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ background: 'rgba(59,130,246,0.1)', borderRadius: 10, padding: '10px 12px', marginBottom: 10, border: '1px solid rgba(59,130,246,0.2)' }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.name}</p>
        <p style={{ fontSize: 10, color: '#475569' }}>{loc.sido} · 지하철·편의점은 선택 위치 반경 1km 기준</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#475569', fontSize: 12 }}>불러오는 중...</div>
      ) : data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            {
              label: '🌿 미세먼지',
              value: data.dust ? `PM10 ${data.dust.pm10}㎍` : '정보없음',
              sub: data.dust?.grade,
              color: data.dust ? GRADE_COLOR[data.dust.grade] || '#64748b' : '#64748b',
            },
            { label: '🚇 가장 가까운 지하철', value: fmtDist(data.nearestSubway), sub: data.nearestSubway == null ? '지하철 없는 지역' : '가까울수록 좋아요', color: '#3b82f6' },
            { label: '🏪 가장 가까운 편의점', value: fmtDist(data.nearestConvenience), sub: '가까울수록 좋아요', color: '#10b981' },
            (() => {
              const s = SAFETY_DATA[loc.sido]
              return { label: '🛡 안전지수', value: s ? `${s.total.toLocaleString()}건` : '데이터 없음', sub: s ? `${loc.sido} 5대범죄 연간 발생 · ${s.grade}` : '', color: s?.color || '#64748b' }
            })(),
            { label: '🏘 아파트 평균', value: fmtPrice(data.aptAvg), sub: `거래 ${data.aptCount}건`, color: '#f59e0b' },
          ].map(item => (
            <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '9px 10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>{item.label}</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: item.color }}>{item.value}</p>
              {item.sub && <p style={{ fontSize: 9, color: '#475569' }}>{item.sub}</p>}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

interface Props {
  current: LocationInfo
  onClose: () => void
}

const SIDO_LIST = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']
const SIDO_COORDS: Record<string, [number, number]> = {
  '서울': [37.5665, 126.9780], '부산': [35.1796, 129.0756], '대구': [35.8714, 128.6014],
  '인천': [37.4563, 126.7052], '광주': [35.1595, 126.8526], '대전': [36.3504, 127.3845],
  '울산': [35.5384, 129.3114], '경기': [37.4138, 127.5183], '강원': [37.8228, 128.1555],
  '충북': [36.8000, 127.7000], '충남': [36.5184, 126.8000], '전북': [35.7175, 127.1530],
  '전남': [34.8679, 126.9910], '경북': [36.4919, 128.8889], '경남': [35.4606, 128.2132],
  '제주': [33.4996, 126.5312],
}

// 시도별 주요 구/군 좌표
const GU_LIST: Record<string, Array<{ name: string; lat: number; lng: number }>> = {
  '서울': [
    { name: '강남구', lat: 37.5172, lng: 127.0473 }, { name: '마포구', lat: 37.5663, lng: 126.9014 },
    { name: '송파구', lat: 37.5145, lng: 127.1059 }, { name: '노원구', lat: 37.6543, lng: 127.0567 },
    { name: '서초구', lat: 37.4837, lng: 127.0324 }, { name: '용산구', lat: 37.5326, lng: 126.9905 },
  ],
  '부산': [
    { name: '해운대구', lat: 35.1631, lng: 129.1635 }, { name: '부산진구', lat: 35.1629, lng: 129.0530 },
    { name: '남구', lat: 35.1362, lng: 129.0849 }, { name: '수영구', lat: 35.1454, lng: 129.1133 },
    { name: '동래구', lat: 35.1983, lng: 129.0860 }, { name: '금정구', lat: 35.2425, lng: 129.0917 },
  ],
  '대구': [
    { name: '수성구', lat: 35.8582, lng: 128.6306 }, { name: '달서구', lat: 35.8297, lng: 128.5327 },
    { name: '북구', lat: 35.8850, lng: 128.5826 }, { name: '중구', lat: 35.8698, lng: 128.6063 },
    { name: '동구', lat: 35.8868, lng: 128.6353 }, { name: '서구', lat: 35.8720, lng: 128.5592 },
  ],
  '인천': [
    { name: '연수구', lat: 37.4103, lng: 126.6781 }, { name: '남동구', lat: 37.4469, lng: 126.7314 },
    { name: '부평구', lat: 37.5076, lng: 126.7219 }, { name: '서구', lat: 37.5452, lng: 126.6756 },
    { name: '계양구', lat: 37.5375, lng: 126.7379 }, { name: '미추홀구', lat: 37.4637, lng: 126.6506 },
  ],
  '광주': [
    { name: '서구', lat: 35.1520, lng: 126.8895 }, { name: '북구', lat: 35.1739, lng: 126.9122 },
    { name: '남구', lat: 35.1330, lng: 126.9019 }, { name: '동구', lat: 35.1463, lng: 126.9233 },
    { name: '광산구', lat: 35.1396, lng: 126.7935 },
  ],
  '대전': [
    { name: '서구', lat: 36.3554, lng: 127.3831 }, { name: '유성구', lat: 36.3624, lng: 127.3561 },
    { name: '중구', lat: 36.3257, lng: 127.4213 }, { name: '동구', lat: 36.3121, lng: 127.4545 },
    { name: '대덕구', lat: 36.3462, lng: 127.4151 },
  ],
  '울산': [
    { name: '남구', lat: 35.5386, lng: 129.3297 }, { name: '북구', lat: 35.5828, lng: 129.3607 },
    { name: '중구', lat: 35.5694, lng: 129.3320 }, { name: '동구', lat: 35.5048, lng: 129.4163 },
    { name: '울주군', lat: 35.5215, lng: 129.2390 },
  ],
  '경기': [
    { name: '수원시', lat: 37.2636, lng: 127.0286 }, { name: '성남시', lat: 37.4449, lng: 127.1388 },
    { name: '고양시', lat: 37.6584, lng: 126.8320 }, { name: '용인시', lat: 37.2342, lng: 127.2018 },
    { name: '부천시', lat: 37.5034, lng: 126.7660 }, { name: '안양시', lat: 37.3943, lng: 126.9568 },
  ],
  '강원': [
    { name: '춘천시', lat: 37.8813, lng: 127.7299 }, { name: '원주시', lat: 37.3422, lng: 127.9202 },
    { name: '강릉시', lat: 37.7519, lng: 128.8761 }, { name: '속초시', lat: 38.2070, lng: 128.5918 },
  ],
  '충북': [
    { name: '청주시', lat: 36.6424, lng: 127.4890 }, { name: '충주시', lat: 36.9910, lng: 127.9259 },
    { name: '제천시', lat: 37.1326, lng: 128.1909 },
  ],
  '충남': [
    { name: '천안시', lat: 36.8151, lng: 127.1139 }, { name: '아산시', lat: 36.7898, lng: 127.0023 },
    { name: '공주시', lat: 36.4465, lng: 127.1190 }, { name: '당진시', lat: 36.8895, lng: 126.6456 },
  ],
  '전북': [
    { name: '전주시', lat: 35.8242, lng: 127.1480 }, { name: '익산시', lat: 35.9483, lng: 126.9577 },
    { name: '군산시', lat: 35.9676, lng: 126.7368 }, { name: '정읍시', lat: 35.5699, lng: 126.8561 },
  ],
  '전남': [
    { name: '목포시', lat: 34.8118, lng: 126.3922 }, { name: '여수시', lat: 34.7604, lng: 127.6622 },
    { name: '순천시', lat: 34.9506, lng: 127.4874 }, { name: '광양시', lat: 34.9437, lng: 127.6958 },
  ],
  '경북': [
    { name: '포항시', lat: 36.0190, lng: 129.3435 }, { name: '구미시', lat: 36.1196, lng: 128.3446 },
    { name: '경주시', lat: 35.8561, lng: 129.2242 }, { name: '안동시', lat: 36.5684, lng: 128.7294 },
  ],
  '경남': [
    { name: '창원시', lat: 35.2279, lng: 128.6811 }, { name: '김해시', lat: 35.2285, lng: 128.8892 },
    { name: '진주시', lat: 35.1800, lng: 128.1076 }, { name: '양산시', lat: 35.3350, lng: 129.0370 },
  ],
  '제주': [
    { name: '제주시', lat: 33.4996, lng: 126.5312 }, { name: '서귀포시', lat: 33.2541, lng: 126.5600 },
  ],
}

export default function CompareModal({ current, onClose }: Props) {
  const [searchQ, setSearchQ] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [compareLocation, setCompareLocation] = useState<LocationInfo | null>(null)
  const [dataA, setDataA] = useState<AreaData | null>(null)
  const [dataB, setDataB] = useState<AreaData | null>(null)
  const [loadingA, setLoadingA] = useState(true)
  const [loadingB, setLoadingB] = useState(false)
  const [selectedSido, setSelectedSido] = useState<string | null>(null)
  const suggestTimer = useState<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLoadingA(true)
    fetchAreaData(current).then(d => { setDataA(d); setLoadingA(false) })
  }, [current.lat, current.lng])

  useEffect(() => {
    if (!compareLocation) return
    setLoadingB(true)
    fetchAreaData(compareLocation).then(d => { setDataB(d); setLoadingB(false) })
  }, [compareLocation?.lat, compareLocation?.lng])

  function handleSearchChange(val: string) {
    setSearchQ(val)
    if (suggestTimer[0]) clearTimeout(suggestTimer[0])
    if (!val.trim()) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(val)}`)
        setSuggestions(await res.json())
      } catch {}
    }, 250)
    suggestTimer[1](t)
  }

  function selectLocation(s: { name: string; lat: number; lng: number; province: string }) {
    const sido = SIDO_LIST.find(x => s.province.includes(x) || s.name.includes(x)) || '서울'
    setCompareLocation({ name: s.name, lat: s.lat, lng: s.lng, sido })
    setSearchQ(s.name)
    setSuggestions([])
    setDataB(null)
  }

  function selectSido(sido: string) {
    setSelectedSido(prev => prev === sido ? null : sido)
    setSuggestions([])
  }

  function selectGu(sido: string, gu: { name: string; lat: number; lng: number }) {
    const label = `${sido} ${gu.name}`
    setCompareLocation({ name: label, lat: gu.lat, lng: gu.lng, sido })
    setSearchQ(label)
    setSuggestions([])
    setSelectedSido(null)
    setDataB(null)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* 헤더 */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>🆚 두 동네 비교</p>
            <p style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>미세먼지·편의시설·교통·부동산을 나란히 비교해요</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {/* 비교 동네 검색 */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>비교할 동네 선택</p>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
              <input
                value={searchQ}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder="동네 이름 검색..."
                style={{ width: '100%', paddingLeft: 30, paddingRight: 10, paddingTop: 8, paddingBottom: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, color: 'white', fontSize: 12, outline: 'none' }}
              />
              {suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden', marginTop: 2 }}>
                  {suggestions.map((s, i) => (
                    <button key={i} onMouseDown={() => selectLocation(s)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'white', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.15)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      📍 {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* 시도 선택 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
              {SIDO_LIST.slice(0, 8).map(s => (
                <button key={s} onClick={() => selectSido(s)} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: selectedSido === s ? 'rgba(59,130,246,0.35)' : compareLocation?.sido === s ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.06)',
                  color: selectedSido === s ? '#93c5fd' : compareLocation?.sido === s ? '#7dd3fc' : '#64748b',
                }}>{s}</button>
              ))}
            </div>
            {/* 구 선택 (시도 클릭 후 펼쳐짐) */}
            {selectedSido && GU_LIST[selectedSido] && (
              <div style={{ marginTop: 6, padding: '8px 10px', background: 'rgba(59,130,246,0.08)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.15)' }}>
                <p style={{ fontSize: 9, color: '#475569', marginBottom: 5 }}>{selectedSido} · 구/시 선택</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {GU_LIST[selectedSido].map(gu => (
                    <button key={gu.name} onClick={() => selectGu(selectedSido, gu)} style={{
                      padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer',
                      background: 'rgba(255,255,255,0.08)', color: '#94a3b8',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = '#93c5fd' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8' }}
                    >{gu.name}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 비교 컬럼 */}
          <div style={{ display: 'flex', gap: 12 }}>
            <CompareCol loc={current} data={dataA} loading={loadingA} />
            <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
            {compareLocation ? (
              <CompareCol loc={compareLocation} data={dataB} loading={loadingB} />
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 13, flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 28 }}>🔍</span>
                <span>비교할 동네를 검색하세요</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
