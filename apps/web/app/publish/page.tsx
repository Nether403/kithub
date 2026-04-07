"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function PublishPage() {
  const searchParams = useSearchParams();
  const editSlug = searchParams.get("edit");

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editSlug) return;
    setEditLoading(true);
    fetch(`${API_URL}/api/kits/${editSlug}`)
      .then(res => {
        if (!res.ok) throw new Error("Kit not found");
        return res.json();
      })
      .then(data => {
        if (data.rawMarkdown) {
          setRaw(data.rawMarkdown);
        }
        setEditLoading(false);
      })
      .catch(() => {
        setEditLoading(false);
      });
  }, [editSlug]);

  const handleFileRead = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === "string") setRaw(text);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileRead(file);
  }, [handleFileRead]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

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

  const isEditMode = !!editSlug;

  return (
    <main className="container page-section page-narrow">
      <div className="page-header">
        <h1>{isEditMode ? `Update Kit: ${editSlug}` : "Publish a Kit"}</h1>
        <p className="page-subtitle">
          {isEditMode
            ? "Edit the markdown below and publish a new release."
            : "Three steps: paste, validate, scan & publish."}
        </p>
      </div>

      <div className="step-indicator" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3} aria-label="Publish progress">
        {[1, 2, 3].map(s => (
          <div key={s} className="step-indicator-item">
            <div className={`step-bar ${step >= s ? "step-bar-active" : "step-bar-inactive"}`} />
            <span className={`step-indicator-label ${step >= s ? "step-indicator-label-active" : ""}`}>
              {["Paste", "Validate", "Publish"][s - 1]}
            </span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="step-panel">
          <div className="glass-panel">
            <h2 className="step-heading">
              {isEditMode ? "1. Edit Your Kit.md" : "1. Paste Your Kit.md"}
            </h2>
            <p className="step-description">
              {isEditMode
                ? "The current kit markdown is loaded below. Make your changes, then bump the version number before publishing."
                : "Paste the complete contents of your kit.md file below, or drag and drop a file. Must include YAML frontmatter and all 6 required body sections."}
            </p>

            {editLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                Loading kit content...
              </div>
            ) : (
              <>
                {!isEditMode && (
                  <div
                    className={`drop-zone ${dragOver ? "drop-zone-active" : ""} ${raw ? "drop-zone-has-content" : ""}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => !raw && fileInputRef.current?.click()}
                  >
                    {!raw ? (
                      <div className="drop-zone-placeholder">
                        <span className="drop-zone-icon" aria-hidden="true">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        </span>
                        <span>Drag & drop your kit.md file here, or click to browse</span>
                        <span className="drop-zone-hint">or paste your content in the editor below</span>
                      </div>
                    ) : null}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".md,.markdown,.txt"
                      className="drop-zone-input"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileRead(file);
                      }}
                    />
                  </div>
                )}

                <textarea
                  className="input input-mono"
                  placeholder={'---\nschema: "kit/1.0"\nslug: my-awesome-kit\ntitle: My Awesome Kit\nsummary: ...\nversion: 1.0.0\nmodel:\n  provider: openai\n  name: gpt-4o-2024-11-20\n  hosting: hosted\ntags: [automation]\ntools: [firecrawl]\nskills: [web-scraping]\n---\n\n## Goal\n...\n\n## When to Use\n...\n\n## Setup\n...\n\n## Steps\n...\n\n## Constraints\n...\n\n## Safety Notes\n...'}
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  aria-label="Kit markdown content"
                />
              </>
            )}

            {error && <div className="alert alert-error mt-1">{error}</div>}

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
            <h2 className="step-heading-spaced">2. Validation Preview</h2>

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
                  <span className={preview.sectionsFound === preview.sectionsTotal ? 'accent-strong' : 'warning-strong'}>
                    {preview.sectionsFound}/{preview.sectionsTotal}
                  </span> found
                </div>
              </div>
            </div>

            {preview.missingSections.length > 0 && (
              <div className="alert alert-warning">
                Missing sections: {preview.missingSections.join(", ")}
              </div>
            )}

            <div className="mono-sm form-hint">
              {preview.charCount.toLocaleString()} characters
            </div>
          </div>

          {error && <div className="alert alert-error mb-1">{error}</div>}

          <div className="flex-between">
            <button onClick={() => { setStep(1); setError(""); }} className="btn btn-secondary">
              ← Edit
            </button>
            <button onClick={handlePublish} className="btn btn-publish" disabled={loading}>
              {loading ? (
                <>
                  <span className="btn-spinner" aria-hidden="true" />
                  Scanning & Publishing...
                </>
              ) : isEditMode ? "Scan & Update →" : "Scan & Publish →"}
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
              {result.status === "published"
                ? (isEditMode ? "Kit Updated!" : "Kit Published!")
                : "Publication Blocked"}
            </h2>
            <p className="result-description">
              {result.status === "published"
                ? `${result.slug} v${result.version} is now live on the registry.`
                : "Address the findings below and resubmit."}
            </p>

            <div className="mb-2">
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
