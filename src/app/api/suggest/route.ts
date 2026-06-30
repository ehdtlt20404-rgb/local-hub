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
  const sidoFull = SIDO_FULL[sido] || ''

  const toItem = (d: any, type: 'place' | 'address') => ({
    name: type === 'place' ? d.place_name : d.address_name,
    lat: parseFloat(d.y),
    lng: parseFloat(d.x),
    province: type === 'place'
      ? (d.address_name || '').split(' ')[0]
      : (d.address?.region_1depth_name || d.road_address?.region_1depth_name || (d.address_name || '').split(' ')[0] || ''),
    category: type === 'place' ? (d.category_group_name || '') : '',
    type,
  })

  const seen = new Set<string>()
  const dedup = (items: any[]) => items.filter(i => {
    const key = `${i.lat.toFixed(4)}_${i.lng.toFixed(4)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const isLocal = (item: any) => {
    if (!sidoFull) return true
    const p = item.province || ''
    return p.startsWith(sido) || p.startsWith(sidoFull) || p.includes(sido)
  }

  try {
    if (sidoFull) {
      // 지역이 선택된 경우: sido 범위 내에서만 검색
      const [kwSido, addrSido] = await Promise.all([
        fetch(
          `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(`${sidoFull} ${q}`)}&size=7`,
          { headers, signal: AbortSignal.timeout(4000) }
        ).then(r => r.json()).catch(() => ({ documents: [] })),
        fetch(
          `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(`${sidoFull} ${q}`)}&size=7`,
          { headers, signal: AbortSignal.timeout(4000) }
        ).then(r => r.json()).catch(() => ({ documents: [] })),
      ])

      const kwItems = (kwSido.documents || []).map((d: any) => toItem(d, 'place')).filter(isLocal)
      const addrItems = (addrSido.documents || []).map((d: any) => toItem(d, 'address')).filter(isLocal)

      const local = dedup([...kwItems, ...addrItems])

      if (local.length > 0) {
        return NextResponse.json(local.slice(0, 7))
      }

      // 로컬 결과 없으면 sido 없이 검색하되 결과에 지역 표시 (타 지역 명시)
      const [kwGlobal, addrGlobal] = await Promise.all([
        fetch(
          `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=5`,
          { headers, signal: AbortSignal.timeout(4000) }
        ).then(r => r.json()).catch(() => ({ documents: [] })),
        fetch(
          `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(q)}&size=5`,
          { headers, signal: AbortSignal.timeout(4000) }
        ).then(r => r.json()).catch(() => ({ documents: [] })),
      ])

      const globalItems = dedup([
        ...(kwGlobal.documents || []).map((d: any) => toItem(d, 'place')),
        ...(addrGlobal.documents || []).map((d: any) => toItem(d, 'address')),
      ])

      // 타 지역 결과임을 표시
      return NextResponse.json(globalItems.slice(0, 7).map(i => ({ ...i, otherRegion: true })))
    }

    // 지역 미선택: 전국 검색
    const [kwGlobal, addrGlobal] = await Promise.all([
      fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=7`,
        { headers, signal: AbortSignal.timeout(4000) }
      ).then(r => r.json()).catch(() => ({ documents: [] })),
      fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(q)}&size=7`,
        { headers, signal: AbortSignal.timeout(4000) }
      ).then(r => r.json()).catch(() => ({ documents: [] })),
    ])

    const all = dedup([
      ...(kwGlobal.documents || []).map((d: any) => toItem(d, 'place')),
      ...(addrGlobal.documents || []).map((d: any) => toItem(d, 'address')),
    ])

    return NextResponse.json(all.slice(0, 7))
  } catch {
    return NextResponse.json([])
  }
}
