import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const nx = searchParams.get('nx') || '60'
  const ny = searchParams.get('ny') || '127'

  // 한국 시간 (UTC+9)
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const baseDate = now.toISOString().slice(0, 10).replace(/-/g, '')
  // 초단기실황: 매시각 정시 발표, 40분 전까지 전 시각 사용
  const kh = now.getUTCHours()
  const km = now.getUTCMinutes()
  const baseHour = km < 40 ? (kh === 0 ? 23 : kh - 1) : kh
  const baseTime = String(baseHour).padStart(2, '0') + '00'
  const actualDate = (km < 40 && kh === 0)
    ? new Date(Date.now() + 9 * 60 * 60 * 1000 - 86400000).toISOString().slice(0, 10).replace(/-/g, '')
    : baseDate

  try {
    const res = await axios.get('https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst', {
      params: {
        serviceKey: process.env.PUBLIC_DATA_API_KEY,
        numOfRows: 10,
        pageNo: 1,
        dataType: 'JSON',
        base_date: actualDate,
        base_time: baseTime,
        nx,
        ny,
      },
    })

    const items = res.data?.response?.body?.items?.item || []
    const data: Record<string, string> = {}
    items.forEach((item: any) => {
      data[item.category] = item.obsrValue
    })

    return NextResponse.json({
      temp: data['T1H'] ?? '--',        // 기온
      humidity: data['REH'] ?? '--',    // 습도
      rain: data['RN1'] ?? '0',         // 강수량
      wind: data['WSD'] ?? '--',        // 풍속
      sky: data['PTY'] ?? '0',          // 강수형태
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
