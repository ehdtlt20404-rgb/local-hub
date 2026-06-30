import { NextRequest, NextResponse } from 'next/server'

const SIDO_FULL: Record<string, string> = {
  '서울': '서울', '부산': '부산', '대구': '대구', '인천': '인천',
  '광주': '광주', '대전': '대전', '울산': '울산', '세종': '세종',
  '경기': '경기', '강원': '강원', '충북': '충청북도', '충남': '충청남도',
  '전북': '전라북도', '전남': '전라남도', '경북': '경상북도', '경남': '경상남도', '제주': '제주',
}

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams
  const q = params.get('q')?.trim()
  const sido = params.get('sido') || ''
  if (!q) return NextResponse.json([])

  const headers = { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` }
  const signal = AbortSignal.timeout(4000)

  // sido가 있으면 현재 지역 기반으로 검색 (주소 + 키워드 동시 호출)
  const sidoFull = SIDO_FULL[sido] || ''
  const queryWithSido = sidoFull ? `${sidoFull} ${q}` : q

  try {
    const [addrRes, kwRes] = await Promise.all([
      fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(queryWithSido)}&size=5`,
        { headers, signal }
      ).then(r => r.json()).catch(() => ({ documents: [] })),
      fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(queryWithSido)}&size=5`,
        { headers, signal }
      ).then(r => r.json()).catch(() => ({ documents: [] })),
    ])

    const addrItems = (addrRes.documents || []).map((d: any) => ({
      name: d.address_name,
      lat: parseFloat(d.y),
      lng: parseFloat(d.x),
      province: d.address?.region_1depth_name || d.road_address?.region_1depth_name || '',
      type: 'address',
    }))

    const kwItems = (kwRes.documents || []).map((d: any) => ({
      name: d.place_name,
      lat: parseFloat(d.y),
      lng: parseFloat(d.x),
      province: (d.address_name || '').split(' ')[0] || '',
      category: d.category_group_name || '',
      type: 'place',
    }))

    // 주소 결과 우선, 이후 장소 결과 추가 (중복 좌표 제거)
    const seen = new Set<string>()
    const merged: any[] = []
    for (const item of [...addrItems, ...kwItems]) {
      const key = `${item.lat.toFixed(4)}_${item.lng.toFixed(4)}`
      if (!seen.has(key)) {
        seen.add(key)
        merged.push(item)
      }
    }

    // sido 기반 우선 정렬 (현재 선택 지역이 맨 앞)
    if (sidoFull) {
      merged.sort((a, b) => {
        const aMatch = a.province.includes(sido) || a.province.includes(sidoFull) ? 0 : 1
        const bMatch = b.province.includes(sido) || b.province.includes(sidoFull) ? 0 : 1
        return aMatch - bMatch
      })
    }

    // sido 지역 결과가 없으면 전국 검색으로 보완
    const hasLocalResult = merged.some(i => sidoFull && (i.province.includes(sido) || i.province.includes(sidoFull)))
    if (!hasLocalResult && sidoFull) {
      const [addrRes2, kwRes2] = await Promise.all([
        fetch(
          `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(q)}&size=5`,
          { headers, signal: AbortSignal.timeout(3000) }
        ).then(r => r.json()).catch(() => ({ documents: [] })),
        fetch(
          `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=5`,
          { headers, signal: AbortSignal.timeout(3000) }
        ).then(r => r.json()).catch(() => ({ documents: [] })),
      ])
      const fallback = [
        ...(addrRes2.documents || []).map((d: any) => ({ name: d.address_name, lat: parseFloat(d.y), lng: parseFloat(d.x), province: d.address?.region_1depth_name || '', type: 'address' })),
        ...(kwRes2.documents || []).map((d: any) => ({ name: d.place_name, lat: parseFloat(d.y), lng: parseFloat(d.x), province: (d.address_name || '').split(' ')[0] || '', category: d.category_group_name || '', type: 'place' })),
      ]
      for (const item of fallback) {
        const key = `${item.lat.toFixed(4)}_${item.lng.toFixed(4)}`
        if (!seen.has(key)) { seen.add(key); merged.push(item) }
      }
    }

    return NextResponse.json(merged.slice(0, 7))
  } catch {
    return NextResponse.json([])
  }
}
