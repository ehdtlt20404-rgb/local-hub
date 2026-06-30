import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

const CATEGORY_MAP: Record<string, string> = {
  pharmacy: 'PM9',
  hospital: 'HP8',
  convenience: 'CS2',
  cafe: 'CE7',
  subway: 'SW8',
  bank: 'BK9',
  school: 'SC4',
}

// 카테고리 코드 없이 키워드 검색을 쓰는 타입
const KEYWORD_MAP: Record<string, string> = {
  park: '공원',
  police: '파출소 지구대',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat') || '37.5665'
  const lng = searchParams.get('lng') || '126.9780'
  const type = searchParams.get('type') || 'pharmacy'

  const key = process.env.KAKAO_REST_API_KEY
  const headers = { Authorization: `KakaoAK ${key}` }

  try {
    let items: any[] = []

    if (KEYWORD_MAP[type]) {
      const res = await axios.get('https://dapi.kakao.com/v2/local/search/keyword.json', {
        headers,
        params: { query: KEYWORD_MAP[type], x: lng, y: lat, radius: 1500, size: 15, sort: 'distance' },
        timeout: 8000,
      })
      items = res.data?.documents || []
    } else if (CATEGORY_MAP[type]) {
      const res = await axios.get('https://dapi.kakao.com/v2/local/search/category.json', {
        headers,
        params: { category_group_code: CATEGORY_MAP[type], x: lng, y: lat, radius: 1000, size: 15 },
        timeout: 8000,
      })
      items = res.data?.documents || []
    }

    const places = items.map((el: any) => ({
      id: el.id,
      name: el.place_name,
      lat: parseFloat(el.y),
      lng: parseFloat(el.x),
      type,
      address: el.road_address_name || el.address_name,
      distance: el.distance,
      phone: el.phone || '',
      url: el.place_url || '',
    }))

    return NextResponse.json({ places })
  } catch (e: any) {
    return NextResponse.json({ places: [], error: e.message })
  }
}
