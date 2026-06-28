'use client'

interface Props {
  lat: number
  lng: number
  onClose: () => void
}

export default function RoadView({ lat, lng, onClose }: Props) {
  const src = `https://maps.google.com/maps?q=&layer=c&cbll=${lat},${lng}&cbp=12,90,0,0,0&ie=UTF8&output=embed`

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 900, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🛣</span>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>거리뷰</span>
          <span style={{ fontSize: 11, color: '#64748b' }}>{lat.toFixed(4)}°N · {lng.toFixed(4)}°E</span>
        </div>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8, padding: '6px 14px', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>✕ 닫기</button>
      </div>

      <div style={{ position: 'relative', width: '100%', maxWidth: 900, borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', height: 500 }}>
        <iframe
          src={src}
          width="100%"
          height="100%"
          style={{ border: 'none', display: 'block' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <p style={{ marginTop: 10, fontSize: 11, color: '#334155' }}>지도를 클릭해 위치를 바꾼 뒤 로드뷰 버튼을 다시 누르세요</p>
    </div>
  )
}
