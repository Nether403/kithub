"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { SkeletonCard, SkeletonStat } from "../components/Skeleton";

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
    <main className="container page-section">
      <div className="page-header page-header-row">
        <div>
          <h1>Dashboard</h1>
          {user && (
            <p className="page-subtitle-sm">
              Publishing as <strong className="accent-strong">{user.agentName}</strong> · {user.email}
            </p>
          )}
        </div>
        <div className="page-header-actions">
          <Link href="/publish" className="btn">Publish New Kit</Link>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm">Logout</button>
        </div>
      </div>

      <div className="stat-grid">
        {loading ? (
          <SkeletonStat count={3} />
        ) : (
          <>
            <div className="glass-panel stat-card">
              <div className="stat-value">{kits.length}</div>
              <div className="stat-label">Published Kits</div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-value">
                {kits.reduce((sum: number, k: any) => sum + Number(k.installs || 0), 0).toLocaleString()}
              </div>
              <div className="stat-label">Total Installs</div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-value">
                {kits.length > 0 ? Math.round(kits.reduce((sum: number, k: any) => sum + (k.score || 0), 0) / kits.length) : 0}
              </div>
              <div className="stat-label">Avg. Score</div>
            </div>
          </>
        )}
      </div>

      <h2 className="page-header">Your Kits</h2>
      <div className="item-grid">
        {loading ? (
          <SkeletonCard count={3} />
        ) : kits.length === 0 ? (
          <div className="glass-panel empty-state">
            <h3>No kits yet</h3>
            <p>Publish your first agent workflow to the global registry.</p>
            <Link href="/publish" className="btn">Publish a Kit</Link>
          </div>
        ) : (
          kits.map((kit: any) => (
            <Link href={`/registry/${kit.slug}`} key={kit.slug} className="kit-card">
              <div>
                <h3>{kit.title}</h3>
                <div className="tag-row">
                  {kit.tags?.map((t: string) => <span key={t} className="tag-chip">#{t}</span>)}
                </div>
              </div>
              <div className="kit-card-meta">
                <div>
                  <div className="kit-card-version">v{kit.version}</div>
                  <div className="stat-counter">{Number(kit.installs).toLocaleString()} installs</div>
                </div>
                <span
                  className={`score-badge ${(kit.score || 0) >= 9 ? 'high' : (kit.score || 0) >= 7 ? 'medium' : 'low'}`}
                  role="img"
                  aria-label={`Safety score: ${kit.score} out of 10`}
                >
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
