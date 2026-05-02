"use client";

import Link from "next/link";
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
  const verified = !!kit.publisherVerifiedAt;
  return (
    <article className="kit-card kit-card-stretched">
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
        <h3>
          <Link
            href={`/registry/${kit.slug}`}
            className="kit-card-title-link"
            aria-label={`${kit.title} — view kit details`}
          >
            {kit.title}
          </Link>
        </h3>
        {kit.publisherName && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            by{" "}
            <Link
              href={`/publishers/${kit.publisherName}`}
              className="kit-publisher-link"
              aria-label={`View publisher @${kit.publisherName}`}
            >
              @{kit.publisherName}
            </Link>
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
    </article>
  );
}

export function TrendingCard({ kit }: { kit: KitData }) {
  const verified = !!kit.publisherVerifiedAt;
  return (
    <article className="glass-panel trending-card kit-card-stretched">
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
        <h3 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>
          <Link
            href={`/registry/${kit.slug}`}
            className="kit-card-title-link"
            aria-label={`${kit.title} — view kit details`}
          >
            {kit.title}
          </Link>
        </h3>
        {kit.publisherName && (
          <span style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Link
              href={`/publishers/${kit.publisherName}`}
              className="kit-publisher-link"
              aria-label={`View publisher @${kit.publisherName}`}
            >
              @{kit.publisherName}
            </Link>
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
    </article>
  );
}
