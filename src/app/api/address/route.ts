import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  if (!lat || !lng) return NextResponse.json({ error: 'no coords' }, { status: 400 })

  try {
    const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: { lat, lon: lng, format: 'json', 'accept-language': 'ko' },
      headers: { 'User-Agent': 'DongneHub/1.0' }
    })
    const addr = res.data?.address
    const parts = [addr?.city || addr?.town || addr?.village, addr?.suburb || addr?.neighbourhood, addr?.road].filter(Boolean)
    return NextResponse.json({ address: parts.join(' ') || res.data?.display_name })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
