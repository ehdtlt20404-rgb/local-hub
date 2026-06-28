import { NextRequest, NextResponse } from 'next/server'

function dist(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
}

async function getOSMStops(lat: string, lng: string) {
  const query = `[out:json][timeout:10];node["highway"="bus_stop"](around:600,${lat},${lng});out body;`
  // 여러 Overpass 미러 순차 시도
  const servers = [
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.fr/api/interpreter',
    'https://overpass-api.de/api/interpreter',
  ]
  let res: Response | null = null
  for (const server of servers) {
    try {
      res = await fetch(`${server}?data=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(8000) })
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('json')) break
      res = null
    } catch { res = null }
  }
  if (!res) return []
  const data = await res.json()
  const latN = parseFloat(lat), lngN = parseFloat(lng)
  return (data.elements || [])
    .map((el: any) => ({
      id: `osm_${el.id}`,
      name: el.tags?.name || el.tags?.['name:ko'] || '버스정류장',
      lat: el.lat,
      lng: el.lon,
      distance: dist(latN, lngN, el.lat, el.lon),
      ref: el.tags?.ref || '',
      kakaoUrl: `https://map.kakao.com/link/search/${encodeURIComponent(el.tags?.name || '버스정류장')}`,
    }))
    .filter((s: any) => s.distance <= 600)
    .sort((a: any, b: any) => a.distance - b.distance)
    .slice(0, 12)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const op = searchParams.get('op') || 'nearby'
  const lat = searchParams.get('lat') || ''
  const lng = searchParams.get('lng') || ''

  if (op === 'nearby') {
    try {
      const stops = await getOSMStops(lat, lng)
      return NextResponse.json({ stops, source: 'osm' })
    } catch (e: any) {
      return NextResponse.json({ stops: [], error: e.message })
    }
  }

  return NextResponse.json({ error: 'invalid op' })
}
