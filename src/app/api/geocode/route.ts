import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  if (!q) return NextResponse.json({ error: 'no query' }, { status: 400 })

  try {
    const res = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: `${q} 대한민국`, format: 'json', limit: 1, addressdetails: 1 },
      headers: { 'User-Agent': 'DongneHub/1.0' }
    })
    const result = res.data[0]
    if (!result) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      display_name: result.display_name,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
