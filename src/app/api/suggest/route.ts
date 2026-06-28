import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q')?.trim()
  if (!q) return NextResponse.json([])

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(q)}&size=5`,
      { headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` }, signal: AbortSignal.timeout(3000) }
    )
    const data = await res.json()
    const items = (data.documents || []).map((d: any) => ({
      name: d.address_name,
      lat: parseFloat(d.y),
      lng: parseFloat(d.x),
      province: d.address?.region_1depth_name || '',
    }))

    if (items.length === 0) {
      const res2 = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=5`,
        { headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` }, signal: AbortSignal.timeout(3000) }
      )
      const data2 = await res2.json()
      return NextResponse.json(
        (data2.documents || []).slice(0, 5).map((d: any) => ({
          name: d.address_name || d.place_name,
          lat: parseFloat(d.y),
          lng: parseFloat(d.x),
          province: d.address_name?.split(' ')[0] || '',
        }))
      )
    }

    return NextResponse.json(items)
  } catch {
    return NextResponse.json([])
  }
}
