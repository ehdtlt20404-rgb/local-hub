import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = '동네허브 - 우리 동네 생활정보 한눈에'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* 배경 장식 */}
        <div style={{ position: 'absolute', top: 60, left: 80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(59,130,246,0.08)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: 40, right: 60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(139,92,246,0.08)', display: 'flex' }} />

        {/* 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 32 }}>
          <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 20, padding: '14px 16px', display: 'flex' }}>
            <span style={{ fontSize: 36 }}>📍</span>
          </div>
          <span style={{ fontSize: 64, fontWeight: 900, color: 'white', letterSpacing: '-2px' }}>동네허브</span>
        </div>

        {/* 슬로건 */}
        <p style={{ fontSize: 30, color: '#94a3b8', fontWeight: 500, marginBottom: 48, letterSpacing: '-0.5px' }}>
          우리 동네 생활정보 한눈에
        </p>

        {/* 기능 태그 */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 900 }}>
          {['🌤 날씨·미세먼지', '🏘 부동산 실거래가', '🏢 편의시설', '🍽 맛집', '🚌 버스·교통', '⭐ 즐겨찾기'].map(tag => (
            <div key={tag} style={{
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 50, padding: '10px 20px', fontSize: 20, color: '#e2e8f0', display: 'flex',
            }}>{tag}</div>
          ))}
        </div>

        {/* URL */}
        <p style={{ position: 'absolute', bottom: 36, fontSize: 18, color: '#475569', letterSpacing: '0.05em' }}>
          dongnehub.com
        </p>
      </div>
    ),
    { ...size }
  )
}
