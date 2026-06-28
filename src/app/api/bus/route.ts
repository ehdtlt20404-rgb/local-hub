import { NextRequest, NextResponse } from 'next/server'

const KEY = process.env.PUBLIC_DATA_API_KEY || ''
const KAKAO_KEY = process.env.KAKAO_REST_API_KEY || ''

function dist(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
}

function getTag(str: string, tag: string) {
  const m = str.match(new RegExp('<' + tag + '>([^<]*)<\\/' + tag + '>'))
  return m ? m[1].trim() : ''
}

// 대전 버스정류소 API로 근처 정류장 직접 조회
async function getDaejeonNearbyStops(lat: string, lng: string) {
  try {
    // 대전 전체 정류장 목록 가져오기 (numOfRows 최대)
    const url = `https://apis.data.go.kr/6300000/BusSttnInfoInqireService/getSttnList?serviceKey=${KEY}&numOfRows=9999&pageNo=1`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const xml = await res.text()
    if (!xml.includes('<item>')) return []

    const items = (xml.match(/<item>[\s\S]*?<\/item>/g) || [])
    const latN = parseFloat(lat), lngN = parseFloat(lng)
    return items
      .map(item => ({
        id: getTag(item, 'stationId'),
        name: getTag(item, 'stationNm'),
        lat: parseFloat(getTag(item, 'gpsLati') || getTag(item, 'lat') || '0'),
        lng: parseFloat(getTag(item, 'gpsLong') || getTag(item, 'lng') || '0'),
      }))
      .filter(s => s.lat && s.lng)
      .map(s => ({ ...s, distance: dist(latN, lngN, s.lat, s.lng) }))
      .filter(s => s.distance <= 600)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10)
  } catch { return [] }
}

// Kakao PT9(버스정류장) 카테고리 검색 - 반경 1km
async function getKakaoStops(lat: string, lng: string) {
  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=PT9&x=${lng}&y=${lat}&radius=1000&size=15&sort=distance`,
      { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` }, signal: AbortSignal.timeout(5000) }
    )
    const data = await res.json()
    return (data.documents || []).map((d: any) => ({
      id: `kakao_${d.id}`,
      name: d.place_name,
      address: d.road_address_name || d.address_name,
      lat: parseFloat(d.y),
      lng: parseFloat(d.x),
      distance: parseInt(d.distance),
    }))
  } catch { return [] }
}

// 대전 버스 도착 정보 조회
async function getDaejeonArrivals(stationId: string) {
  try {
    const url = `https://apis.data.go.kr/6300000/ArvlInfoInqireService/getArvlInfoByStn?serviceKey=${KEY}&stationId=${stationId}&numOfRows=20&pageNo=1`
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
    const xml = await res.text()
    return (xml.match(/<item>[\s\S]*?<\/item>/g) || []).map(item => ({
      routeNo: getTag(item, 'routeNo'),
      destination: getTag(item, 'endStNm') || getTag(item, 'routeDestStNm'),
      arrTime: getTag(item, 'arrTime') || getTag(item, 'predTime1'),
      arrivalSec: parseInt(getTag(item, 'arrTimeSec') || getTag(item, 'arrTime') || '0') * 60,
      busNum: getTag(item, 'carNo') || getTag(item, 'plateNo1'),
      remainSeat: getTag(item, 'remainSeatCnt1'),
      lowBus: getTag(item, 'lowTp') === '1',
    }))
  } catch { return [] }
}

// 정류장 이름으로 대전 stationId 검색
async function getStationIdByName(stNm: string): Promise<string | null> {
  try {
    const url = `https://apis.data.go.kr/6300000/BusSttnInfoInqireService/getSttnList?serviceKey=${KEY}&numOfRows=5&pageNo=1&stNm=${encodeURIComponent(stNm)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    const xml = await res.text()
    const m = xml.match(/<stationId>([^<]+)<\/stationId>/)
    return m ? m[1].trim() : null
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const op = searchParams.get('op') || 'nearby'
  const lat = searchParams.get('lat') || ''
  const lng = searchParams.get('lng') || ''
  const stationNm = searchParams.get('stationNm') || ''
  const stationId = searchParams.get('stationId') || ''

  try {
    if (op === 'nearby') {
      // 대전 API와 카카오 동시 시도
      const [daejeonStops, kakaoStops] = await Promise.all([
        getDaejeonNearbyStops(lat, lng),
        getKakaoStops(lat, lng),
      ])

      // 대전 API 결과 우선, 없으면 카카오 결과 사용
      const stops = daejeonStops.length > 0
        ? daejeonStops.map(s => ({ ...s, address: '', isDaejeon: true }))
        : kakaoStops.map(s => ({ ...s, isDaejeon: false }))

      return NextResponse.json({ stops, source: daejeonStops.length > 0 ? 'daejeon' : 'kakao' })
    }

    if (op === 'arrivals') {
      // stationId 직접 있으면 바로, 없으면 이름으로 검색
      const id = stationId || await getStationIdByName(stationNm)
      if (!id) return NextResponse.json({ arrivals: [], error: '정류장 ID를 찾을 수 없어요' })
      const arrivals = await getDaejeonArrivals(id)
      return NextResponse.json({ arrivals, stationId: id })
    }

    return NextResponse.json({ error: 'invalid op' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
