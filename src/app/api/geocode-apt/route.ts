import { NextRequest, NextResponse } from 'next/server'

const PROP_KEYWORD: Record<string, string> = {
  apt: '아파트', villa: '빌라', house: '주택', officetel: '오피스텔',
}

async function searchKakao(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=5`,
      { headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` }, signal: AbortSignal.timeout(4000) }
    )
    const data = await res.json()
    const docs: any[] = data.documents || []
    if (!docs.length) return null
    // 주거 카테고리 우선 (AG2=아파트, SW8=지하철 제외)
    const best = docs.find(d => ['AG2', 'BK9'].includes(d.category_group_code))
      || docs.find(d => d.category_name?.includes('주거') || d.category_name?.includes('부동산'))
      || docs[0]
    return { lat: parseFloat(best.y), lng: parseFloat(best.x) }
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('q') || ''
  const dong = searchParams.get('dong') || ''
  const propType = searchParams.get('propType') || 'apt'
  if (!name) return NextResponse.json({ lat: null, lng: null })

  const keyword = PROP_KEYWORD[propType] || ''

  // 순서대로 시도: 이름+동+유형 → 이름+동 → 이름+유형 → 이름만
  const queries = [
    dong ? `${name} ${dong} ${keyword}` : `${name} ${keyword}`,
    dong ? `${name} ${dong}` : null,
    keyword !== '아파트' ? `${name} 아파트` : null,
    name,
  ].filter(Boolean) as string[]

  for (const q of queries) {
    const result = await searchKakao(q)
    if (result) return NextResponse.json(result)
  }

  return NextResponse.json({ lat: null, lng: null })
}
