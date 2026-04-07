"use client";

export default function KitDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="container page-section" style={{ textAlign: "center", paddingTop: "6rem" }}>
      <div className="glass-panel" style={{ maxWidth: 520, margin: "0 auto", padding: "3rem 2rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Failed to load kit</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
          We couldn't load this kit's details. It may not exist or there was a temporary issue.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <button className="btn" onClick={() => reset()}>
            Try Again
          </button>
          <a href="/registry" className="btn btn-secondary">
            Back to Registry
          </a>
        </div>
      </div>
    </main>
  );
}
