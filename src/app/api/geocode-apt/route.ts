import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  if (!q) return NextResponse.json({ lat: null, lng: null })
  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=1`,
      { headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` }, signal: AbortSignal.timeout(4000) }
    )
    const data = await res.json()
    const doc = data.documents?.[0]
    if (!doc) return NextResponse.json({ lat: null, lng: null })
    return NextResponse.json({ lat: parseFloat(doc.y), lng: parseFloat(doc.x) })
  } catch { return NextResponse.json({ lat: null, lng: null }) }
}
