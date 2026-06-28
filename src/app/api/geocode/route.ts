import { NextRequest, NextResponse } from 'next/server'

const SIDO_MAP: Record<string, string> = {
  '서울': '서울특별시', '부산': '부산광역시', '대구': '대구광역시',
  '인천': '인천광역시', '광주': '광주광역시', '대전': '대전광역시',
  '울산': '울산광역시', '세종': '세종특별자치시', '경기': '경기도',
  '강원': '강원도', '충북': '충청북도', '충남': '충청남도',
  '전북': '전라북도', '전남': '전라남도', '경북': '경상북도',
  '경남': '경상남도', '제주': '제주특별자치도',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  if (!q) return NextResponse.json({ error: 'no query' }, { status: 400 })

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=1`,
      { headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` }, signal: AbortSignal.timeout(5000) }
    )
    const data = await res.json()
    const doc = data.documents?.[0]
    if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 })

    // 시도 추출: address_name 에서 첫 단어
    const addressName: string = doc.address_name || doc.road_address_name || ''
    let province = ''
    for (const [short, full] of Object.entries(SIDO_MAP)) {
      if (addressName.startsWith(full) || addressName.startsWith(short)) {
        province = short
        break
      }
    }

    return NextResponse.json({
      lat: parseFloat(doc.y),
      lng: parseFloat(doc.x),
      display_name: doc.place_name || addressName,
      province,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
