import { NextRequest, NextResponse } from 'next/server'

// 경찰청_범죄 발생 지역별 현황 API
// data.go.kr에서 "경찰청 범죄발생" 검색 후 활용신청 필요
const KEY = process.env.PUBLIC_DATA_API_KEY || ''

const SIDO_CODE: Record<string, string> = {
  '서울': '110000', '부산': '210000', '대구': '220000', '인천': '230000',
  '광주': '240000', '대전': '250000', '울산': '260000', '세종': '290000',
  '경기': '410000', '강원': '420000', '충북': '430000', '충남': '440000',
  '전북': '450000', '전남': '460000', '경북': '470000', '경남': '480000',
  '제주': '500000',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sido = searchParams.get('sido') || '서울'
  const sidonm = SIDO_CODE[sido] ? sido : '서울'

  try {
    // 경찰청 5대 범죄 통계 API
    const url = `https://apis.data.go.kr/1320000/AnctCrimeStatsService/getAnctCrimeStatsList?serviceKey=${KEY}&sidoCd=${SIDO_CODE[sidonm] || '250000'}&numOfRows=10&pageNo=1&type=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
    const data = await res.json()

    if (data?.response?.body?.items) {
      const items = data.response.body.items.item || []
      return NextResponse.json({ stats: items, sido })
    }
    return NextResponse.json({ stats: [], sido, error: 'no data' })
  } catch (e: any) {
    return NextResponse.json({ stats: [], error: e.message })
  }
}
