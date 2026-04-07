"use client";

export default function RegistryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="container page-section" style={{ textAlign: "center", paddingTop: "6rem" }}>
      <div className="glass-panel" style={{ maxWidth: 520, margin: "0 auto", padding: "3rem 2rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Failed to load registry</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
          We couldn't load the kit directory right now. Please try again in a moment.
        </p>
        <button className="btn" onClick={() => reset()}>
          Try Again
        </button>
      </div>
    </main>
  );
}
