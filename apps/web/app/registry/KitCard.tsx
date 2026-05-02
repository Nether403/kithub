"use client";

import Link from "next/link";
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

  const goToPublisher = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (kit.publisherName) router.push(`/publishers/${kit.publisherName}`);
  };

  return (
    <Link
      href={`/registry/${kit.slug}`}
      className="kit-card"
      aria-label={`${kit.title} by ${kit.publisherName ?? "unknown"} — view kit details`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <span className="kit-id-eyebrow">
          {kit.publisherName ? (
            <>
              {kit.publisherName}
              <span className="kit-id-slash">/</span>
              {kit.slug}
            </>
          ) : (
            kit.slug
          )}
        </span>
        <h3>{kit.title}</h3>
        {kit.publisherName && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            by{" "}
            <button
              type="button"
              onClick={goToPublisher}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') goToPublisher(e); }}
              className="link-button"
              aria-label={`View publisher @${kit.publisherName}`}
            >
              @{kit.publisherName}
            </button>
            <VerifiedBadge verified={verified} />
          </span>
        )}
        <p style={{ marginTop: '0.5rem' }}>{kit.summary}</p>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Stars value={kit.averageStars ?? null} count={kit.ratingCount} size="sm" />
          {[...new Set(kit.tags)].map((tag: string) => (
            <span key={tag} className="tag-chip">#{tag}</span>
          ))}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: '0.85rem', letterSpacing: '0.04em' }}>
          v{kit.version}
        </div>
        <ScoreBadge score={kit.score} />
        <div className="stat-counter">
          {Number(kit.installs).toLocaleString()} installs
        </div>
      </div>
    </Link>
  );
}

export function TrendingCard({ kit }: { kit: KitData }) {
  const router = useRouter();
  const verified = !!kit.publisherVerifiedAt;

  const goToPublisher = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (kit.publisherName) router.push(`/publishers/${kit.publisherName}`);
  };

  return (
    <Link
      href={`/registry/${kit.slug}`}
      className="glass-panel trending-card"
      aria-label={`${kit.title} by ${kit.publisherName ?? "unknown"} — view kit details`}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <span className="kit-id-eyebrow">
        {kit.publisherName ? (
          <>
            {kit.publisherName}
            <span className="kit-id-slash">/</span>
            {kit.slug}
          </>
        ) : (
          kit.slug
        )}
      </span>
      <div style={{ marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>{kit.title}</h3>
        {kit.publisherName && (
          <span style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={goToPublisher}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') goToPublisher(e); }}
              className="link-button"
              aria-label={`View publisher @${kit.publisherName}`}
            >
              @{kit.publisherName}
            </button>
            <VerifiedBadge verified={verified} />
          </span>
        )}
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.85rem', lineHeight: '1.55' }}>
        {kit.summary?.slice(0, 100)}{kit.summary?.length > 100 ? '...' : ''}
      </p>
      <div style={{ marginBottom: '0.5rem' }}>
        <Stars value={kit.averageStars ?? null} count={kit.ratingCount} size="sm" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="stat-counter">{Number(kit.installs).toLocaleString()} installs</span>
        <ScoreBadge score={kit.score} />
      </div>
    </Link>
  );
}
