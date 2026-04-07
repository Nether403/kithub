"use client";
import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface VersionEntry {
  id: string;
  version: string;
  conformanceLevel: string;
  rawMarkdown: string;
  createdAt: string;
  scan: { score: number; status: string; findings: any[] } | null;
}

export default function VersionHistory({ slug }: { slug: string }) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/kits/${slug}/versions`)
      .then(res => res.json())
      .then(data => {
        setVersions(data.versions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
          Version History
        </h2>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading versions...</div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
          Version History
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No previous versions available.</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <div className="glass-panel" style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
        Version History
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {versions.map((v, idx) => {
          const isExpanded = expandedId === v.id;
          const scoreBadgeClass = (v.scan?.score ?? 0) >= 9 ? "high" : (v.scan?.score ?? 0) >= 7 ? "medium" : "low";

          return (
            <div key={v.id}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : v.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  background: isExpanded ? 'rgba(0,232,143,0.04)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isExpanded ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: '0.9rem', fontWeight: 600 }}>
                    v{v.version}
                  </span>
                  {idx === 0 && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '999px',
                      background: 'rgba(0,232,143,0.1)',
                      color: 'var(--accent)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Latest
                    </span>
                  )}
                  <span className="tag-chip" style={{ fontSize: '0.7rem' }}>{v.conformanceLevel}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {v.scan && (
                    <span className={`score-badge ${scoreBadgeClass}`} style={{ fontSize: '0.75rem' }}>
                      ◆ {v.scan.score}/10
                    </span>
                  )}
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                    {formatDate(v.createdAt)}
                  </span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div style={{
                  border: '1px solid var(--border)',
                  borderTop: 'none',
                  borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
                  padding: '1rem',
                  background: 'rgba(0,0,0,0.15)',
                }}>
                  {v.scan && v.scan.findings && v.scan.findings.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Scan Results</h4>
                      {v.scan.findings.map((f: any, fi: number) => (
                        <div key={fi} style={{
                          padding: '0.4rem 0.6rem',
                          borderRadius: 'var(--radius-xs)',
                          background: f.type === 'error' ? 'rgba(255,77,106,0.08)' : f.type === 'warning' ? 'rgba(255,179,64,0.08)' : 'rgba(0,232,143,0.08)',
                          marginBottom: '0.35rem',
                          fontSize: '0.8rem',
                          color: f.type === 'error' ? 'var(--danger)' : f.type === 'warning' ? 'var(--warning)' : 'var(--accent)',
                        }}>
                          {f.type === 'error' ? '✕' : f.type === 'warning' ? '⚠' : '💡'} {f.message}
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Raw Markdown</h4>
                    <pre style={{
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      lineHeight: '1.6',
                      color: '#aaa',
                      maxHeight: '400px',
                      overflow: 'auto',
                      padding: '0.75rem',
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: 'var(--radius-xs)',
                      margin: 0,
                    }}>
                      {v.rawMarkdown}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
