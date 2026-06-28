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

// 정류소 이름으로 nodeId 검색 (여러 변형 시도)
async function getNodeId(nodeName: string): Promise<{ nodeId: string; foundName: string } | null> {
  // 검색할 이름 변형 목록 (긴 것 → 짧은 것 순)
  const variants = [
    nodeName,
    nodeName.replace(/\(.*?\)/g, '').trim(),        // 괄호 제거
    nodeName.replace(/(네거리|사거리|앞|역|정류장).*/, '$1'), // 접미사까지만
    nodeName.slice(0, Math.ceil(nodeName.length * 0.6)), // 앞 60%
    nodeName.slice(0, 4),                            // 앞 4글자
  ].filter((v, i, arr) => v.length >= 2 && arr.indexOf(v) === i)

  for (const name of variants) {
    try {
      const res = await axios.get(
        'https://apis.data.go.kr/6300000/BusSttnInfoInqireService/getSttnThrghRouteList',
        { params: { serviceKey: KEY, nodeNm: name, _type: 'json' }, timeout: 8000 }
      )
      const items = parseItems(res.data)
      if (items.length > 0) {
        const nodeId = items[0].nodeid || items[0].nodeId
        const foundName = items[0].nodenm || items[0].nodeNm || name
        if (nodeId) return { nodeId, foundName }
      }
    } catch { continue }
  }
  return null
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
    let foundName = nodeName

    if (!nodeId && nodeName) {
      const found = await getNodeId(nodeName)
      if (!found) {
        return NextResponse.json({ arrivals: [], error: `'${nodeName}' 정류장을 찾을 수 없어요` })
      }
      nodeId = found.nodeId
      foundName = found.foundName
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

    return NextResponse.json({ arrivals: result, nodeId, foundName })
  } catch (e: any) {
    return NextResponse.json({ arrivals: [], error: e.message })
  }
}
