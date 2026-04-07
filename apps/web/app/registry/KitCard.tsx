"use client";

import { useRouter } from "next/navigation";

interface KitData {
  slug: string;
  title: string;
  summary: string;
  publisherName?: string | null;
  version: string;
  installs: number;
  tags: string[];
  score: number | null;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const level = score >= 9 ? "high" : score >= 7 ? "medium" : "low";
  return <span className={`score-badge ${level}`}>&#9670; {score}/10</span>;
}

export function KitCard({ kit }: { kit: KitData }) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/registry/${kit.slug}`);
  };

  const handlePublisherClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/publishers/${kit.publisherName}`);
  };

  return (
    <div className="kit-card" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      <div>
        <h3>{kit.title}</h3>
        {kit.publisherName && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            by{" "}
            <span
              onClick={handlePublisherClick}
              style={{ color: 'var(--accent)', cursor: 'pointer' }}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePublisherClick(e as unknown as React.MouseEvent); }}
            >
              @{kit.publisherName}
            </span>
          </span>
        )}
        <p>{kit.summary}</p>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {[...new Set(kit.tags)].map((tag: string) => (
            <span key={tag} className="tag-chip">#{tag}</span>
          ))}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
          v{kit.version}
        </div>
        <ScoreBadge score={kit.score} />
        <div className="stat-counter" style={{ marginTop: '0.5rem' }}>
          {Number(kit.installs).toLocaleString()} installs
        </div>
      </div>
    </div>
  );
}

export function TrendingCard({ kit }: { kit: KitData }) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/registry/${kit.slug}`);
  };

  const handlePublisherClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/publishers/${kit.publisherName}`);
  };

  return (
    <div
      className="glass-panel"
      onClick={handleCardClick}
      style={{ cursor: 'pointer', display: 'block' }}
    >
      <div style={{ marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>{kit.title}</h3>
        {kit.publisherName && (
          <span
            onClick={handlePublisherClick}
            style={{ fontSize: '0.8rem', color: 'var(--accent)', cursor: 'pointer' }}
            role="link"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') handlePublisherClick(e as unknown as React.MouseEvent); }}
          >
            @{kit.publisherName}
          </span>
        )}
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: '1.5' }}>
        {kit.summary?.slice(0, 100)}{kit.summary?.length > 100 ? '...' : ''}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="stat-counter">{Number(kit.installs).toLocaleString()} installs</span>
        <ScoreBadge score={kit.score} />
      </div>
    </div>
  );
}
