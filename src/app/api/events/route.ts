import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const areaCode = searchParams.get('areaCode') || '1'

  try {
    const res = await axios.get('https://apis.data.go.kr/B551011/KorService1/searchFestival1', {
      params: {
        serviceKey: process.env.PUBLIC_DATA_API_KEY,
        numOfRows: 10,
        pageNo: 1,
        MobileOS: 'ETC',
        MobileApp: 'DongneHub',
        _type: 'json',
        areaCode,
        eventStartDate: new Date().toISOString().slice(0,10).replace(/-/g,''),
        arrange: 'A',
      }
    })

    const items = res.data?.response?.body?.items?.item || []
    return NextResponse.json({ events: Array.isArray(items) ? items : [items] })
  } catch (e: any) {
    return NextResponse.json({ events: [], error: e.message }, { status: 200 })
  }
}
