import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const nx = searchParams.get('nx') || '60'
  const ny = searchParams.get('ny') || '127'

  // 한국 시간 (UTC+9)
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const km = kst.getUTCMinutes()
  const kh = kst.getUTCHours()
  // 초단기실황: 매시각 40분 이후 제공, 그 전엔 이전 시각 사용
  const baseHour = km < 40 ? (kh === 0 ? 23 : kh - 1) : kh
  const needPrevDay = km < 40 && kh === 0
  const baseKst = needPrevDay ? new Date(Date.now() + 9 * 60 * 60 * 1000 - 86400000) : kst
  const actualDate = baseKst.toISOString().slice(0, 10).replace(/-/g, '')
  const baseTime = String(baseHour).padStart(2, '0') + '00'

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
