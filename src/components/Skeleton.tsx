export function SkeletonCard({ height = 72 }: { height?: number }) {
  return (
    <div style={{
      height, borderRadius: 12,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  )
}

export function SkeletonList({ count = 4, height = 72 }: { count?: number; height?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} height={height} />)}
    </div>
  )
}
