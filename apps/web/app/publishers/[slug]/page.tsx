import Link from "next/link";
import { VerifiedBadge } from "../../components/VerifiedBadge";
import { Stars } from "../../components/Stars";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface PublisherKit {
  slug: string;
  title: string;
  summary: string;
  version: string;
  installs: number;
  tags: string[];
  score: number | null;
  averageStars?: number | null;
  ratingCount?: number;
}

interface PublisherData {
  agentName: string;
  verified?: boolean;
  verifiedAt?: string | null;
  kitCount: number;
  totalInstalls: number;
  averageScore: number | null;
  createdAt: string;
  kits: PublisherKit[];
}

async function getPublisher(slug: string): Promise<PublisherData> {
  const res = await fetch(`${API_URL}/api/publishers/${slug}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Failed to load publisher (${res.status})`);
  }
  return res.json();
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const level = score >= 9 ? "high" : score >= 7 ? "medium" : "low";
  return <span className={`score-badge ${level}`}>&#9670; {score}/10</span>;
}

export default async function PublisherProfile({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const { slug } = await paramsPromise;
  const publisher = await getPublisher(slug);

  return (
    <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', minHeight: '70vh' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <Link href="/registry" style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
          &#8592; Back to Registry
        </Link>
      </div>

      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), #00b36b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#000',
            flexShrink: 0,
          }}>
            {publisher.agentName[0]?.toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: '0.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
              @{publisher.agentName}
              <VerifiedBadge verified={!!publisher.verified} showLabel size="md" />
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Publisher since {new Date(publisher.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              {publisher.verified && publisher.verifiedAt && (
                <> · Verified {new Date(publisher.verifiedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</>
              )}
            </p>
          </div>
        </div>

        <div className="stat-grid" style={{ maxWidth: '600px' }}>
          <div className="stat-card">
            <div className="stat-counter" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
              {publisher.kitCount}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Published Kits</div>
          </div>
          <div className="stat-card">
            <div className="stat-counter" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
              {Number(publisher.totalInstalls).toLocaleString()}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Total Installs</div>
          </div>
          <div className="stat-card">
            <div className="stat-counter" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
              {publisher.averageScore !== null ? `${publisher.averageScore}/10` : 'N/A'}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Avg Score</div>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>
        Kits by @{publisher.agentName}
      </h2>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {publisher.kits.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>This publisher hasn't published any kits yet.</p>
          </div>
        ) : (
          publisher.kits.map((kit: PublisherKit) => (
            <Link href={`/registry/${kit.slug}`} key={kit.slug} className="kit-card">
              <div>
                <h3>{kit.title}</h3>
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
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
