import Link from "next/link";
import type { Metadata } from "next";
import VersionHistory from "./VersionHistory";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function getKit(slug: string) {
  const res = await fetch(`${API_URL}/api/kits/${slug}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Failed to load kit (${res.status})`);
  }
  return res.json();
}

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await paramsPromise;
  try {
    const kit = await getKit(slug);
    const title = `${kit.title} — KitHub`;
    const description = kit.summary || `Install the ${kit.title} agent workflow kit from KitHub.`;
    const url = `https://kithub.com/registry/${slug}`;

    const ogImage = `${process.env.NEXT_PUBLIC_BASE_URL || "https://kithub.com"}/og-default.svg`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        url,
        siteName: "KitHub",
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: `${kit.title} — KitHub`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImage],
      },
    };
  } catch {
    return {
      title: "Kit Not Found — KitHub",
      description: "This kit could not be found on the KitHub registry.",
    };
  }
}

export default async function KitDetail({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const { slug } = await paramsPromise;
  const kit = await getKit(slug);

  const scoreBadgeClass = (kit.scan?.score ?? 0) >= 9 ? "high" : (kit.scan?.score ?? 0) >= 7 ? "medium" : "low";

  const bodyContent = kit.rawMarkdown?.split(/^---[\s\S]*?---/m)[1] || kit.rawMarkdown || "";

  return (
    <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <Link href="/registry" style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
          ← Back to Registry
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '0.5rem' }}>{kit.title}</h1>
          {kit.publisherName && (
            <p style={{ marginBottom: '0.5rem' }}>
              <Link href={`/publishers/${kit.publisherName}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.9rem' }}>
                @{kit.publisherName}
              </Link>
            </p>
          )}
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '1rem' }}>
            {kit.summary}
          </p>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: '0.9rem' }}>v{kit.version}</span>
            <span className={`score-badge ${scoreBadgeClass}`}>◆ {kit.scan?.score}/10</span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
              {kit.conformanceLevel} conformance
            </span>
            {[...new Set(kit.tags as string[])].map((tag: string) => (
              <span key={tag} className="tag-chip">#{tag}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2.5rem' }}>
        <div>
          <div className="glass-panel" style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
              Kit Specification
            </h2>
            <div style={{ fontFamily: 'var(--font-sans)', color: '#ccc', fontSize: '0.95rem', lineHeight: '1.75' }}>
              <pre style={{
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                fontFamily: 'var(--font-sans)',
                margin: 0,
              }}>
                {bodyContent.trim()}
              </pre>
            </div>
          </div>

          <VersionHistory slug={slug} />
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem' }}>Community Learnings</h3>
              <span className="stat-counter">{kit.learningsCount ?? 0} available</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Learnings are community-submitted solutions to edge cases — rate limits, runtime conflicts, and platform-specific quirks.
            </p>
            <a href={`/registry/${slug}#submit-learning`} className="btn btn-secondary btn-sm">
              Submit a Learning
            </a>
          </div>
        </div>

        <div>
          <div className="sidebar-sticky" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="install-primary">
              <div className="glass-panel">
                <h3>⚡ Agent Installation</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Paste this to Cursor, Claude Code, or OpenClaw:
                </p>
                <div className="terminal-block" style={{ fontSize: '0.8rem' }}>
                  Fetch the KitHub kit at <strong>kithub.com/registry/{slug}</strong> and follow it.<span className="cursor"></span>
                </div>

                <div className="install-legacy" style={{ marginTop: '1rem' }}>
                  <details>
                    <summary>CLI fallback</summary>
                    <div className="terminal-block" style={{ fontSize: '0.75rem' }}>
                      npx @kithub/cli install {slug} --target=claude-code
                    </div>
                  </details>
                </div>
              </div>
            </div>

            <div className="glass-panel">
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Stats & Safety</h3>
              <ul style={{ listStyle: 'none', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Installs</span>
                  <strong>{Number(kit.installs).toLocaleString()}</strong>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Security Score</span>
                  <span className={`score-badge ${scoreBadgeClass}`}>◆ {kit.scan?.score}/10</span>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Learnings</span>
                  <strong>{kit.learningsCount ?? 0}</strong>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Conformance</span>
                  <span className="tag-chip">{kit.conformanceLevel}</span>
                </li>
              </ul>
            </div>

            {kit.scan?.findings?.length > 0 && (
              <div className="glass-panel">
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Scanner Notes</h3>
                {kit.scan.findings.map((f: any, i: number) => (
                  <div key={i} style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-xs)',
                    background: f.type === 'error' ? 'rgba(255,77,106,0.08)' : f.type === 'warning' ? 'rgba(255,179,64,0.08)' : 'rgba(0,232,143,0.08)',
                    marginBottom: '0.5rem',
                    fontSize: '0.8rem',
                    color: f.type === 'error' ? 'var(--danger)' : f.type === 'warning' ? 'var(--warning)' : 'var(--accent)',
                  }}>
                    {f.type === 'error' ? '✕' : f.type === 'warning' ? '⚠' : '💡'} {f.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
