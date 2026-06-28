'use client'
import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window { kakao: any }
}

interface Props {
  lat: number
  lng: number
  onMapClick?: (lat: number, lng: number) => void
}

function loadKakaoScript(key: string): Promise<void> {
  return new Promise((resolve) => {
    if (window.kakao?.maps) { resolve(); return }

    const existing = document.getElementById('kakao-sdk')
    if (existing) {
      const wait = setInterval(() => {
        if (window.kakao?.maps) { clearInterval(wait); resolve() }
      }, 100)
      return
    }

    const script = document.createElement('script')
    script.id = 'kakao-sdk'
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false`
    script.onload = () => {
      window.kakao.maps.load(() => resolve())
    }
    document.head.appendChild(script)
  })
}

export default function KakaoMap({ lat, lng, onMapClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY!
    loadKakaoScript(key).then(() => setReady(true))
  }, [])

  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return

    const pos = new window.kakao.maps.LatLng(lat, lng)
    mapRef.current = new window.kakao.maps.Map(containerRef.current, {
      center: pos,
      level: 5,
    })
    markerRef.current = new window.kakao.maps.Marker({
      position: pos,
      map: mapRef.current,
    })

    if (onMapClick) {
      window.kakao.maps.event.addListener(mapRef.current, 'click', (e: any) => {
        const latlng = e.latLng
        markerRef.current?.setPosition(latlng)
        onMapClick(latlng.getLat(), latlng.getLng())
      })
    }
  }, [ready])

  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return
    const pos = new window.kakao.maps.LatLng(lat, lng)
    mapRef.current.setCenter(pos)
    markerRef.current?.setPosition(pos)
  }, [lat, lng])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {!ready && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#e5e7eb', fontSize: 14, color: '#6b7280'
        }}>
          지도 불러오는 중...
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
