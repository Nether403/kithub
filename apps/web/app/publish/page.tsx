"use client";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function PublishPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  const handleValidate = () => {
    setError("");
    // Quick client-side validation
    if (!raw.includes("---")) {
      setError("Your kit.md must start with YAML frontmatter delimiters (---)");
      return;
    }
    if (!raw.includes("schema:")) {
      setError("Missing 'schema: kit/1.0' in frontmatter");
      return;
    }

    // Extract basic info for preview
    const slugMatch = raw.match(/slug:\s*["']?([a-z0-9-]+)/);
    const titleMatch = raw.match(/title:\s*["']?(.+?)["']?\s*$/m);
    const versionMatch = raw.match(/version:\s*["']?(\d+\.\d+\.\d+)/);
    const sections = ["Goal", "When to Use", "Setup", "Steps", "Constraints", "Safety Notes"];
    const foundSections = sections.filter(s => raw.includes(`## ${s}`));

    setPreview({
      slug: slugMatch?.[1] || "unknown",
      title: titleMatch?.[1] || "Untitled Kit",
      version: versionMatch?.[1] || "0.0.0",
      sectionsFound: foundSections.length,
      sectionsTotal: sections.length,
      missingSections: sections.filter(s => !raw.includes(`## ${s}`)),
      charCount: raw.length,
    });

    setStep(2);
  };

  const handlePublish = async () => {
    setError("");
    setLoading(true);

    const token = localStorage.getItem("kithub_token");
    if (!token) {
      setError("You must be signed in to publish. Go to /auth first.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/kits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rawMarkdown: raw }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || "Publish failed");

      setResult(data);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: '0.5rem' }}>
        Publish a Kit
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '1rem' }}>
        Three steps: paste, validate, scan & publish.
      </p>

      {/* Step Indicator */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem' }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{
            flex: 1,
            height: '3px',
            borderRadius: '2px',
            background: step >= s ? 'var(--accent)' : 'var(--border)',
            transition: 'background 0.3s ease',
          }} />
        ))}
      </div>

      {/* ── Step 1: Paste ──────────────────────────────────── */}
      {step === 1 && (
        <div style={{ animation: 'fadeInUp 0.4s ease-out' }}>
          <div className="glass-panel">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>1. Paste Your Kit.md</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Paste the complete contents of your kit.md file below. Must include YAML frontmatter and all 6 required body sections.
            </p>

            <textarea
              className="input"
              style={{ minHeight: '350px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: '1.7', resize: 'vertical' }}
              placeholder={'---\nschema: "kit/1.0"\nslug: my-awesome-kit\ntitle: My Awesome Kit\nsummary: ...\nversion: 1.0.0\nmodel:\n  provider: openai\n  name: gpt-4o-2024-11-20\n  hosting: hosted\ntags: [automation]\ntools: [firecrawl]\nskills: [web-scraping]\n---\n\n## Goal\n...\n\n## When to Use\n...\n\n## Setup\n...\n\n## Steps\n...\n\n## Constraints\n...\n\n## Safety Notes\n...'}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />

            {error && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: 'var(--radius-xs)', background: 'rgba(255,77,106,0.08)', color: 'var(--danger)', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button onClick={handleValidate} className="btn" disabled={!raw.trim()}>
                Validate →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Validate ───────────────────────────────── */}
      {step === 2 && preview && (
        <div style={{ animation: 'fadeInUp 0.4s ease-out' }}>
          <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>2. Validation Preview</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label>Slug</label>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: 'var(--accent)' }}>
                  {preview.slug}
                </div>
              </div>
              <div>
                <label>Version</label>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>
                  v{preview.version}
                </div>
              </div>
              <div>
                <label>Title</label>
                <div style={{ fontSize: '1rem' }}>
                  {preview.title}
                </div>
              </div>
              <div>
                <label>Body Sections</label>
                <div style={{ fontSize: '1rem' }}>
                  <span style={{ color: preview.sectionsFound === preview.sectionsTotal ? 'var(--accent)' : 'var(--warning)' }}>
                    {preview.sectionsFound}/{preview.sectionsTotal}
                  </span> found
                </div>
              </div>
            </div>

            {preview.missingSections.length > 0 && (
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-xs)', background: 'rgba(255,179,64,0.08)', color: 'var(--warning)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                ⚠ Missing sections: {preview.missingSections.join(", ")}
              </div>
            )}

            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              {preview.charCount.toLocaleString()} characters
            </div>
          </div>

          {error && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: 'var(--radius-xs)', background: 'rgba(255,77,106,0.08)', color: 'var(--danger)', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => { setStep(1); setError(""); }} className="btn btn-secondary">
              ← Edit
            </button>
            <button onClick={handlePublish} className="btn" disabled={loading}>
              {loading ? "Scanning & Publishing..." : "Scan & Publish →"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Results ────────────────────────────────── */}
      {step === 3 && result && (
        <div style={{ animation: 'fadeInUp 0.4s ease-out' }}>
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              {result.status === "published" ? "✅" : "🚫"}
            </div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
              {result.status === "published" ? "Kit Published!" : "Publication Blocked"}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
              {result.status === "published"
                ? `${result.slug} v${result.version} is now live on the registry.`
                : "Address the findings below and resubmit."}
            </p>

            {/* Score */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                border: `3px solid ${result.scan.score >= 9 ? 'var(--accent)' : result.scan.score >= 7 ? 'var(--warning)' : 'var(--danger)'}`,
                fontFamily: 'var(--font-mono)',
                fontSize: '1.75rem',
                fontWeight: 900,
                color: result.scan.score >= 9 ? 'var(--accent)' : result.scan.score >= 7 ? 'var(--warning)' : 'var(--danger)',
              }}>
                {result.scan.score}
              </div>
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginTop: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                Safety Score
              </div>
            </div>

            {/* Findings */}
            {result.scan.findings.length > 0 && (
              <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Findings</h3>
                {result.scan.findings.map((f: any, i: number) => (
                  <div key={i} style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-xs)',
                    background: f.type === 'error' ? 'rgba(255,77,106,0.08)' : f.type === 'warning' ? 'rgba(255,179,64,0.08)' : 'rgba(0,232,143,0.08)',
                    marginBottom: '0.5rem',
                    fontSize: '0.85rem',
                    color: f.type === 'error' ? 'var(--danger)' : f.type === 'warning' ? 'var(--warning)' : 'var(--accent)',
                  }}>
                    {f.type === 'error' ? '✕ ' : f.type === 'warning' ? '⚠ ' : '💡 '}{f.message}
                  </div>
                ))}
              </div>
            )}

            {/* Tips */}
            {result.scan.tips.length > 0 && (
              <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Tips</h3>
                {result.scan.tips.map((tip: string, i: number) => (
                  <div key={i} style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-xs)',
                    background: 'rgba(255,255,255,0.03)',
                    marginBottom: '0.5rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                  }}>
                    → {tip}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              {result.status === "published" ? (
                <a href={`/registry/${result.slug}`} className="btn">View in Registry →</a>
              ) : (
                <button onClick={() => { setStep(1); setError(""); setResult(null); }} className="btn">
                  Edit & Retry
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
