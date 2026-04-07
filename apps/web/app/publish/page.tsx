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
    if (!raw.includes("---")) {
      setError("Your kit.md must start with YAML frontmatter delimiters (---)");
      return;
    }
    if (!raw.includes("schema:")) {
      setError("Missing 'schema: kit/1.0' in frontmatter");
      return;
    }

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

  const scoreClass = (score: number) =>
    score >= 9 ? "score-circle-high" : score >= 7 ? "score-circle-medium" : "score-circle-low";

  return (
    <main className="container page-section page-narrow">
      <div className="page-header">
        <h1>Publish a Kit</h1>
        <p className="page-subtitle">Three steps: paste, validate, scan & publish.</p>
      </div>

      <div className="step-indicator" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3} aria-label="Publish progress">
        {[1, 2, 3].map(s => (
          <div key={s} className={`step-bar ${step >= s ? "step-bar-active" : "step-bar-inactive"}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="step-panel">
          <div className="glass-panel">
            <h2 className="step-heading">1. Paste Your Kit.md</h2>
            <p className="step-description">
              Paste the complete contents of your kit.md file below. Must include YAML frontmatter and all 6 required body sections.
            </p>

            <textarea
              className="input input-mono"
              placeholder={'---\nschema: "kit/1.0"\nslug: my-awesome-kit\ntitle: My Awesome Kit\nsummary: ...\nversion: 1.0.0\nmodel:\n  provider: openai\n  name: gpt-4o-2024-11-20\n  hosting: hosted\ntags: [automation]\ntools: [firecrawl]\nskills: [web-scraping]\n---\n\n## Goal\n...\n\n## When to Use\n...\n\n## Setup\n...\n\n## Steps\n...\n\n## Constraints\n...\n\n## Safety Notes\n...'}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              aria-label="Kit markdown content"
            />

            {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}


            <div className="flex-end">
              <button onClick={handleValidate} className="btn" disabled={!raw.trim()}>
                Validate →
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && preview && (
        <div className="step-panel">
          <div className="glass-panel step-panel-spaced">
            <h2 className="step-heading" style={{ marginBottom: '1.5rem' }}>2. Validation Preview</h2>

            <div className="grid-2col">
              <div>
                <label>Slug</label>
                <div className="grid-2col-value-accent">{preview.slug}</div>
              </div>
              <div>
                <label>Version</label>
                <div className="grid-2col-value">v{preview.version}</div>
              </div>
              <div>
                <label>Title</label>
                <div className="grid-2col-value">{preview.title}</div>
              </div>
              <div>
                <label>Body Sections</label>
                <div className="grid-2col-value">
                  <span style={{ color: preview.sectionsFound === preview.sectionsTotal ? 'var(--accent)' : 'var(--warning)' }}>
                    {preview.sectionsFound}/{preview.sectionsTotal}
                  </span> found
                </div>
              </div>
            </div>

            {preview.missingSections.length > 0 && (
              <div className="alert alert-warning">
                ⚠ Missing sections: {preview.missingSections.join(", ")}
              </div>
            )}

            <div className="mono-sm form-hint">
              {preview.charCount.toLocaleString()} characters
            </div>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <div className="flex-between">
            <button onClick={() => { setStep(1); setError(""); }} className="btn btn-secondary">
              ← Edit
            </button>
            <button onClick={handlePublish} className="btn" disabled={loading}>
              {loading ? "Scanning & Publishing..." : "Scan & Publish →"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className="step-panel">
          <div className="glass-panel result-centered">
            <div className="result-icon" aria-hidden="true">
              {result.status === "published" ? "✅" : "🚫"}
            </div>
            <h2 className="result-title">
              {result.status === "published" ? "Kit Published!" : "Publication Blocked"}
            </h2>
            <p className="result-description">
              {result.status === "published"
                ? `${result.slug} v${result.version} is now live on the registry.`
                : "Address the findings below and resubmit."}
            </p>

            <div className="step-panel-spaced" style={{ marginBottom: '2rem' }}>
              <div className={`score-circle ${scoreClass(result.scan.score)}`}>
                {result.scan.score}
              </div>
              <div className="score-label">Safety Score</div>
            </div>

            {result.scan.findings.length > 0 && (
              <div className="findings-section">
                <h3>Findings</h3>
                {result.scan.findings.map((f: any, i: number) => (
                  <div key={i} className={`alert ${f.type === 'error' ? 'alert-error' : f.type === 'warning' ? 'alert-warning' : 'alert-success'}`}>
                    {f.type === 'error' ? '✕ ' : f.type === 'warning' ? '⚠ ' : '💡 '}{f.message}
                  </div>
                ))}
              </div>
            )}

            {result.scan.tips.length > 0 && (
              <div className="findings-section">
                <h3>Tips</h3>
                {result.scan.tips.map((tip: string, i: number) => (
                  <div key={i} className="alert alert-info">→ {tip}</div>
                ))}
              </div>
            )}

            <div className="result-actions">
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
