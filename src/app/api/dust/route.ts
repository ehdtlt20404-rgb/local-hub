import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sidoName = searchParams.get('sido') || '서울'

  try {
    const res = await axios.get('https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty', {
      params: {
        serviceKey: process.env.PUBLIC_DATA_API_KEY,
        returnType: 'json',
        numOfRows: 30,
        pageNo: 1,
        sidoName,
        ver: '1.0',
      },
    })

    const items = res.data?.response?.body?.items || []
    return NextResponse.json({ items: items.slice(0, 5) })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
