export function SkeletonCard({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skeleton-card" aria-hidden="true" />
      ))}
    </>
  );
}

export function SkeletonStat({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-panel skeleton skeleton-stat" aria-hidden="true" />
      ))}
    </>
  );
}

export function SkeletonText() {
  return (
    <div aria-hidden="true">
      <div className="skeleton skeleton-heading" />
      <div className="skeleton skeleton-text" />
      <div className="skeleton skeleton-text-short" />
    </div>
  );
}
