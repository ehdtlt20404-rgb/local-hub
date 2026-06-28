import { NextRequest, NextResponse } from 'next/server'

const SIDO_LAWD: Record<string, string> = {
  '서울': '11110', '부산': '26110', '대구': '27110', '인천': '28110',
  '광주': '29110', '대전': '30110', '울산': '31110', '세종': '36110',
  '경기': '41111', '강원': '42110', '충북': '43111', '충남': '44131',
  '전북': '45111', '전남': '46110', '경북': '47111', '경남': '48121',
  '제주': '50110',
}

// propertyType → { trade endpoint, rent endpoint }
const ENDPOINTS: Record<string, { trade: string; rent: string }> = {
  apt:      { trade: 'RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev',  rent: 'RTMSDataSvcAptRent/getRTMSDataSvcAptRent' },
  villa:    { trade: 'RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade',           rent: 'RTMSDataSvcRHRent/getRTMSDataSvcRHRent' },
  house:    { trade: 'RTMSDataSvcSHTrade/getRTMSDataSvcSHTrade',           rent: 'RTMSDataSvcSHRent/getRTMSDataSvcSHRent' },
  officetel:{ trade: 'RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade',       rent: 'RTMSDataSvcOffiRent/getRTMSDataSvcOffiRent' },
}

// 유형별 건물명 태그 (API마다 다름)
const NAME_TAG: Record<string, string> = {
  apt: 'aptNm', villa: 'mhouseNm', house: 'bdNm', officetel: 'offiNm',
}

async function getRegionFromCoords(lat: string, lng: string) {
  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}`,
      { headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` }, signal: AbortSignal.timeout(5000) }
    )
    const data = await res.json()
    const region = data.documents?.find((d: any) => d.region_type === 'B')
    if (!region) return null
    return { lawdCd: region.code.slice(0, 5), dongName: region.region_3depth_name || '' }
  } catch { return null }
}

function getYm(offsetMonths: number) {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const d = new Date(now.getUTCFullYear(), now.getUTCMonth() - offsetMonths, 1)
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getTag(str: string, tag: string) {
  const m = str.match(new RegExp('<' + tag + '>([^<]*)<\\/' + tag + '>'))
  return m ? m[1].trim() : ''
}

async function fetchItems(lawdCd: string, ym: string, propType: string, dealType: string) {
  const key = process.env.PUBLIC_DATA_API_KEY || ''
  const ep = ENDPOINTS[propType]?.[dealType as 'trade' | 'rent']
  if (!ep) return []
  const nameTag = NAME_TAG[propType] || 'aptNm'
  const url = `https://apis.data.go.kr/1613000/${ep}?serviceKey=${key}&LAWD_CD=${lawdCd}&DEAL_YMD=${ym}&numOfRows=999&pageNo=1`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const xml = await res.text()
    if (!xml.includes('<item>')) return []
    return (xml.match(/<item>[\s\S]*?<\/item>/g) || []).map(item => {
      const nm = getTag(item, nameTag) || getTag(item, 'aptNm') || '(이름없음)'
      if (dealType === 'rent') {
        const monthly = getTag(item, '월세금액') || getTag(item, 'monthlyRent') || '0'
        const lease = getTag(item, '보증금액') || getTag(item, 'leaseAmount') || getTag(item, '전세금') || '0'
        const isMonthly = parseInt(monthly.replace(/,/g, '')) > 0
        return {
          dealType: isMonthly ? '월세' : '전세',
          propType,
          aptNm: nm,
          aptDong: getTag(item, 'aptDong').trim(),
          dealAmount: isMonthly
            ? `보${lease.replace(/,/g, '')}·월${monthly.replace(/,/g, '')}`
            : lease.replace(/,/g, ''),
          excluUseAr: getTag(item, 'excluUseAr'),
          floor: getTag(item, 'floor'),
          buildYear: getTag(item, 'buildYear'),
          dealYear: getTag(item, 'dealYear'),
          dealMonth: getTag(item, 'dealMonth'),
          dealDay: getTag(item, 'dealDay'),
          umdNm: getTag(item, 'umdNm'),
        }
      } else {
        return {
          dealType: '매매',
          propType,
          aptNm: nm,
          aptDong: getTag(item, 'aptDong').trim(),
          dealAmount: getTag(item, 'dealAmount').replace(/,/g, ''),
          excluUseAr: getTag(item, 'excluUseAr'),
          floor: getTag(item, 'floor'),
          buildYear: getTag(item, 'buildYear'),
          dealYear: getTag(item, 'dealYear'),
          dealMonth: getTag(item, 'dealMonth'),
          dealDay: getTag(item, 'dealDay'),
          umdNm: getTag(item, 'umdNm'),
        }
      }
    })
  } catch { return [] }
}

function sortByDate(items: any[]) {
  return items.sort((a, b) => {
    const da = `${a.dealYear}${String(a.dealMonth).padStart(2,'0')}${String(a.dealDay).padStart(2,'0')}`
    const db = `${b.dealYear}${String(b.dealMonth).padStart(2,'0')}${String(b.dealDay).padStart(2,'0')}`
    return db.localeCompare(da)
  })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sido = searchParams.get('sido') || '서울'
  const aptNm = searchParams.get('aptNm')
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const dealType = searchParams.get('dealType') || 'trade'   // trade | rent
  const propType = searchParams.get('propType') || 'apt'     // apt | villa | house | officetel

  const region = lat && lng ? await getRegionFromCoords(lat, lng) : null
  const lawdCd = region?.lawdCd || SIDO_LAWD[sido] || '11110'
  const filterDong = region?.dongName || null

  try {
    if (aptNm) {
      // 5년(60개월) - 10개월씩 배치 처리
      const months = Array.from({ length: 60 }, (_, i) => getYm(i))
      const batchSize = 10
      const all: any[] = []
      for (let i = 0; i < months.length; i += batchSize) {
        const batch = months.slice(i, i + batchSize)
        const results = await Promise.all(batch.map(ym => fetchItems(lawdCd, ym, propType, dealType)))
        all.push(...results.flat().filter((item: any) => item.aptNm === aptNm))
      }
      return NextResponse.json({ items: sortByDate(all), sido, lawdCd, filterDong })
    } else {
      const [m0, m1, m2] = await Promise.all([
        fetchItems(lawdCd, getYm(0), propType, dealType),
        fetchItems(lawdCd, getYm(1), propType, dealType),
        fetchItems(lawdCd, getYm(2), propType, dealType),
      ])
      const all = [...m0, ...m1, ...m2]
      const filtered = filterDong
        ? all.filter(i => i.umdNm && i.umdNm.includes(filterDong.replace('동', '')))
        : all
      const combined = sortByDate(filtered)
      const latestByApt = new Map<string, any>()
      for (const item of combined) {
        if (!latestByApt.has(item.aptNm)) latestByApt.set(item.aptNm, item)
      }
      const deduped = Array.from(latestByApt.values()).sort((a, b) => a.aptNm.localeCompare(b.aptNm, 'ko'))
      const ym = m0.length ? getYm(0) : m1.length ? getYm(1) : getYm(2)
      return NextResponse.json({ items: deduped, dealYmd: ym, sido, lawdCd, filterDong })
    }
  } catch (e: any) {
    return NextResponse.json({ items: [], error: e.message })
  }
}
