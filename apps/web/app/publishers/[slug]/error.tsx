"use client";

export default function PublisherError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="container" style={{ paddingTop: '6rem', paddingBottom: '4rem', minHeight: '60vh' }}>
      <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '3rem 2rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Publisher not found</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          {error.message || "We couldn't find this publisher. They may not exist or may have been removed."}
        </p>
        <button onClick={reset} className="btn">Try Again</button>
      </div>
    </main>
  );
}
