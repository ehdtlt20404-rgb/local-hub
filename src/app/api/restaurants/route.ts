import { NextRequest, NextResponse } from 'next/server'

const CATEGORY_MAP: Record<string, string> = {
  restaurant: 'FD6',
  cafe: 'CE7',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat') || '37.5665'
  const lng = searchParams.get('lng') || '126.9780'
  const type = searchParams.get('type') || 'restaurant'
  const radius = searchParams.get('radius') || '500'

  const key = process.env.KAKAO_REST_API_KEY
  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=${CATEGORY_MAP[type]}&x=${lng}&y=${lat}&radius=${radius}&size=15&sort=distance`,
      { headers: { Authorization: `KakaoAK ${key}` }, signal: AbortSignal.timeout(6000) }
    )
    const data = await res.json()
    const places = (data.documents || []).map((d: any) => ({
      id: d.id,
      name: d.place_name,
      category: d.category_name?.split(' > ').slice(-1)[0] || '',
      address: d.road_address_name || d.address_name,
      distance: parseInt(d.distance),
      phone: d.phone,
      url: d.place_url,
    }))
    return NextResponse.json({ places })
  } catch (e: any) {
    return NextResponse.json({ places: [], error: e.message })
  }
}
