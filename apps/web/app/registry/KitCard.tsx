"use client";

import { useRouter } from "next/navigation";
import { Stars } from "../components/Stars";
import { VerifiedBadge } from "../components/VerifiedBadge";

interface KitData {
  slug: string;
  title: string;
  summary: string;
  publisherName?: string | null;
  publisherVerifiedAt?: string | null;
  version: string;
  installs: number;
  tags: string[];
  score: number | null;
  averageStars?: number | null;
  ratingCount?: number;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const level = score >= 9 ? "high" : score >= 7 ? "medium" : "low";
  return <span className={`score-badge ${level}`}>&#9670; {score}/10</span>;
}

export function KitCard({ kit }: { kit: KitData }) {
  const router = useRouter();
  const verified = !!kit.publisherVerifiedAt;

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
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
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
            <VerifiedBadge verified={verified} />
          </span>
        )}
        <p>{kit.summary}</p>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Stars value={kit.averageStars ?? null} count={kit.ratingCount} size="sm" />
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
  const verified = !!kit.publisherVerifiedAt;

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
          <span style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <span
              onClick={handlePublisherClick}
              style={{ color: 'var(--accent)', cursor: 'pointer' }}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePublisherClick(e as unknown as React.MouseEvent); }}
            >
              @{kit.publisherName}
            </span>
            <VerifiedBadge verified={verified} />
          </span>
        )}
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: '1.5' }}>
        {kit.summary?.slice(0, 100)}{kit.summary?.length > 100 ? '...' : ''}
      </p>
      <div style={{ marginBottom: '0.5rem' }}>
        <Stars value={kit.averageStars ?? null} count={kit.ratingCount} size="sm" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="stat-counter">{Number(kit.installs).toLocaleString()} installs</span>
        <ScoreBadge score={kit.score} />
      </div>
    </div>
  );
}
