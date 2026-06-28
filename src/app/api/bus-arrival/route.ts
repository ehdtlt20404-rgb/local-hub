import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

const KEY = process.env.PUBLIC_DATA_API_KEY!

function parseItems(data: any): any[] {
  try {
    const body = data?.response?.body
    const items = body?.items?.item
    if (!items) return []
    return Array.isArray(items) ? items : [items]
  } catch { return [] }
}

// 정류소 이름으로 nodeId 검색
async function getNodeId(nodeName: string): Promise<string | null> {
  try {
    const res = await axios.get(
      'https://apis.data.go.kr/6300000/BusSttnInfoInqireService/getSttnThrghRouteList',
      {
        params: { serviceKey: KEY, nodeNm: nodeName, _type: 'json' },
        timeout: 8000,
      }
    )
    const items = parseItems(res.data)
    if (items.length === 0) return null
    return items[0].nodeid || items[0].nodeId || null
  } catch { return null }
}

// nodeId로 도착 정보 조회
async function getArrivals(nodeId: string): Promise<any[]> {
  try {
    const res = await axios.get(
      'https://apis.data.go.kr/6300000/BusArrivalInfoInqireService/getSttnAcctoArvlPrearngeInfoList',
      {
        params: { serviceKey: KEY, nodeId, _type: 'json' },
        timeout: 8000,
      }
    )
    return parseItems(res.data)
  } catch { return [] }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const nodeName = searchParams.get('name') || ''
  const nodeIdParam = searchParams.get('nodeId') || ''

  try {
    let nodeId = nodeIdParam

    if (!nodeId && nodeName) {
      const found = await getNodeId(nodeName)
      if (!found) {
        return NextResponse.json({ arrivals: [], error: `'${nodeName}' 정류장을 찾을 수 없어요` })
      }
      nodeId = found
    }

    if (!nodeId) return NextResponse.json({ arrivals: [], error: 'nodeId 없음' })

    const arrivals = await getArrivals(nodeId)

    const result = arrivals.map(a => ({
      routeNo: a.routeno || a.routeNo || '?',
      arrTime: a.arrtime ?? a.arrTime ?? null,      // 초 단위
      arrPrevSttnCnt: a.arrprevstationcnt ?? a.arrPrevStationCnt ?? null, // 남은 정류장 수
      vehicleNo: a.vehicleno || '',
    }))
    .filter(a => a.arrTime !== null)
    .sort((a, b) => (a.arrTime ?? 999999) - (b.arrTime ?? 999999))

    return NextResponse.json({ arrivals: result, nodeId })
  } catch (e: any) {
    return NextResponse.json({ arrivals: [], error: e.message })
  }
}
