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

  try {
    // 3가지 검색을 동시에 실행
    // 1) 건물명/장소명 그대로 검색 (sido 없이) → 하랑캐슬, 스타벅스 등
    // 2) 주소 검색 (sido 포함) → 괴정동, 서구 등 동네 검색
    // 3) 건물명 + sido 검색 → 지역 내 동명이인 건물 우선
    const [kwRaw, addrWithSido, kwWithSido] = await Promise.all([
      fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=5`,
        { headers, signal: AbortSignal.timeout(4000) }
      ).then(r => r.json()).catch(() => ({ documents: [] })),

      fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(sidoFull ? `${sidoFull} ${q}` : q)}&size=5`,
        { headers, signal: AbortSignal.timeout(4000) }
      ).then(r => r.json()).catch(() => ({ documents: [] })),

      sidoFull ? fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(`${sidoFull} ${q}`)}&size=5`,
        { headers, signal: AbortSignal.timeout(4000) }
      ).then(r => r.json()).catch(() => ({ documents: [] })) : Promise.resolve({ documents: [] }),
    ])

    // 결과 파싱
    const toItem = (d: any, type: 'place' | 'address') => ({
      name: type === 'place' ? d.place_name : d.address_name,
      lat: parseFloat(d.y),
      lng: parseFloat(d.x),
      province: type === 'place'
        ? (d.address_name || '').split(' ')[0]
        : (d.address?.region_1depth_name || d.road_address?.region_1depth_name || ''),
      category: type === 'place' ? (d.category_group_name || '') : '',
      type,
    })

    const kwItems = (kwRaw.documents || []).map((d: any) => toItem(d, 'place'))
    const addrItems = (addrWithSido.documents || []).map((d: any) => toItem(d, 'address'))
    const kwSidoItems = (kwWithSido.documents || []).map((d: any) => toItem(d, 'place'))

    // 중복 제거 (위경도 기준)
    const seen = new Set<string>()
    const dedup = (items: any[]) => items.filter(i => {
      const key = `${i.lat.toFixed(4)}_${i.lng.toFixed(4)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // 현재 sido 지역 결과인지 확인
    const isLocal = (item: any) =>
      sidoFull && (item.province.includes(sido) || item.province.includes(sidoFull))

    // 합치기: 현재 지역 결과 먼저, 그 다음 전국 결과
    // 순서: 지역 키워드(sido+q) → 지역 주소 → 전국 키워드
    const localKw = dedup(kwSidoItems.filter(isLocal))
    const localAddr = dedup(addrItems.filter(isLocal))
    const globalKw = dedup(kwItems)
    const restAddr = dedup(addrItems)

    const merged = [...localKw, ...localAddr, ...globalKw, ...restAddr]

    return NextResponse.json(merged.slice(0, 7))
  } catch {
    return NextResponse.json([])
  }
}
