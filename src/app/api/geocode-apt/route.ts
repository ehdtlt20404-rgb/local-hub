import { NextRequest, NextResponse } from 'next/server'

const PROP_KEYWORD: Record<string, string> = {
  apt: '아파트', villa: '빌라', house: '주택', officetel: '오피스텔',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const propType = searchParams.get('propType') || 'apt'
  if (!q) return NextResponse.json({ lat: null, lng: null })

  // 건물명 + 동 이름 + 유형 키워드 조합으로 정확도 향상
  const keyword = PROP_KEYWORD[propType] || ''
  const query = keyword && !q.includes(keyword) ? `${q} ${keyword}` : q

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=3`,
      { headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` }, signal: AbortSignal.timeout(4000) }
    )
    const data = await res.json()
    // 카테고리로 가장 정확한 결과 선택 (아파트 > 주거 > 첫번째)
    const docs: any[] = data.documents || []
    const best = docs.find(d => d.category_group_code === 'AG2') // 아파트
      || docs.find(d => d.category_name?.includes('주거'))
      || docs[0]
    if (!best) return NextResponse.json({ lat: null, lng: null })
    return NextResponse.json({ lat: parseFloat(best.y), lng: parseFloat(best.x) })
  } catch { return NextResponse.json({ lat: null, lng: null }) }
}
