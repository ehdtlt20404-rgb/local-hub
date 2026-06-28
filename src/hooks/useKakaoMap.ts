import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    kakao: any
  }
}

export function useKakaoMap(containerId: string) {
  const mapRef = useRef<any>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=services`
    script.async = true
    document.head.appendChild(script)

    script.onload = () => {
      window.kakao.maps.load(() => {
        const container = document.getElementById(containerId)
        if (!container) return
        const options = {
          center: new window.kakao.maps.LatLng(37.5665, 126.9780),
          level: 5,
        }
        mapRef.current = new window.kakao.maps.Map(container, options)
        setLoaded(true)
      })
    }

    return () => {
      document.head.removeChild(script)
    }
  }, [containerId])

  return { map: mapRef.current, loaded }
}
