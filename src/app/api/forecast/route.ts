import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const nx = searchParams.get('nx') || '60'
  const ny = searchParams.get('ny') || '127'

  // 한국 시간 (UTC+9)
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const baseDate = now.toISOString().slice(0, 10).replace(/-/g, '')
  // 단기예보 발표시각: 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300 (10분 후부터 사용 가능)
  const hours = [2, 5, 8, 11, 14, 17, 20, 23]
  const kh = now.getUTCHours()
  const km = now.getUTCMinutes()
  const adjustedHour = km < 10 ? (kh === 0 ? 23 : kh - 1) : kh
  const baseHour = [...hours].reverse().find(h => h <= adjustedHour) ?? 23
  const baseTime = String(baseHour).padStart(2, '0') + '00'
  const actualDate = (adjustedHour < baseHour)
    ? new Date(Date.now() + 9 * 60 * 60 * 1000 - 86400000).toISOString().slice(0, 10).replace(/-/g, '')
    : baseDate

  try {
    const res = await axios.get('https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst', {
      params: {
        serviceKey: process.env.PUBLIC_DATA_API_KEY,
        numOfRows: 300,
        pageNo: 1,
        dataType: 'JSON',
        base_date: actualDate,
        base_time: baseTime,
        nx, ny,
      },
    })

    const items: any[] = res.data?.response?.body?.items?.item || []

    // 날짜별로 그룹핑
    const byDate: Record<string, Record<string, string>> = {}
    items.forEach((item: any) => {
      const date = item.fcstDate
      if (!byDate[date]) byDate[date] = {}
      if (!byDate[date][item.category]) {
        byDate[date][item.category] = item.fcstValue
      }
    })

    const forecast = Object.entries(byDate).slice(0, 5).map(([date, data]) => ({
      date,
      tempMax: data['TMX'] ?? data['TMP'] ?? '--',
      tempMin: data['TMN'] ?? '--',
      sky: data['SKY'] ?? '1',
      pty: data['PTY'] ?? '0',
      pop: data['POP'] ?? '0',
    }))

    return NextResponse.json({ forecast })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
