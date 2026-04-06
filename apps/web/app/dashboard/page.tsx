"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function Dashboard() {
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email: string; agentName: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("kithub_token");
    const storedUser = localStorage.getItem("kithub_user");

    if (!token) {
      window.location.href = "/auth";
      return;
    }

    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch {}
    }

    fetch(`${API_URL}/api/kits`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setKits(data.kits || []);
        setLoading(false);
      })
      .catch(() => {
        // Fallback mock data
        setKits([
          { slug: "weekly-earnings-preview", title: "Weekly Earnings Preview", version: "1.2.0", installs: 1204, score: 9, tags: ["finance"] },
        ]);
        setLoading(false);
      });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("kithub_token");
    localStorage.removeItem("kithub_user");
    window.location.href = "/auth";
  };

  return (
    <main className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem', minHeight: '70vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: '0.3rem' }}>
            Dashboard
          </h1>
          {user && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Publishing as <strong style={{ color: 'var(--accent)' }}>{user.agentName}</strong> · {user.email}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/publish" className="btn">Publish New Kit</Link>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm">Logout</button>
        </div>
      </div>

      {/* Stats Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
            {kits.length}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
            Published Kits
          </div>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
            {kits.reduce((sum: number, k: any) => sum + Number(k.installs || 0), 0).toLocaleString()}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
            Total Installs
          </div>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
            {kits.length > 0 ? Math.round(kits.reduce((sum: number, k: any) => sum + (k.score || 0), 0) / kits.length) : 0}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
            Avg. Score
          </div>
        </div>
      </div>

      {/* Published Kits */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Your Kits</h2>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {loading ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Loading your kits...</p>
          </div>
        ) : kits.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>No kits yet</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Publish your first agent workflow to the global registry.
            </p>
            <Link href="/publish" className="btn">Publish a Kit</Link>
          </div>
        ) : (
          kits.map((kit: any) => (
            <Link href={`/registry/${kit.slug}`} key={kit.slug} className="kit-card">
              <div>
                <h3>{kit.title}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {kit.tags?.map((t: string) => <span key={t} className="tag-chip">#{t}</span>)}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: '0.85rem' }}>v{kit.version}</div>
                  <div className="stat-counter">{Number(kit.installs).toLocaleString()} installs</div>
                </div>
                <span className={`score-badge ${(kit.score || 0) >= 9 ? 'high' : (kit.score || 0) >= 7 ? 'medium' : 'low'}`}>
                  ◆ {kit.score}/10
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
