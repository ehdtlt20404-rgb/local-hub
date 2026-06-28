import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

const KEY = process.env.PUBLIC_DATA_API_KEY!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name') || '판암역'

  try {
    const BASE = 'https://apis.data.go.kr/6300000'
    const candidates = [
      `${BASE}/BusSttnInfoInqireService/getSttnNoList`,
      `${BASE}/BusSttnInfoInqireService/getSttnThrghRouteList`,
      `${BASE}/BusSttnInfoInqireService/getBusStationList`,
      `${BASE}/BusArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList`,
      `${BASE}/BusArrivalInfoInqireService/getSttnAcctoArvlPrearngeInfoList`,
    ]

    const results: any[] = []
    for (const endpoint of candidates) {
      try {
        const url = `${endpoint}?serviceKey=${KEY}&nodeNm=${encodeURIComponent(name)}&_type=json&numOfRows=5`
        const res = await axios.get(url, { timeout: 6000 })
        results.push({ endpoint, status: res.status, data: res.data })
      } catch (e: any) {
        results.push({ endpoint, status: e.response?.status, error: e.response?.data || e.message })
      }
    }

    return NextResponse.json({ results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, response: e.response?.data })
  }
}
