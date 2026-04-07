"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SkeletonCard, SkeletonStat } from "../components/Skeleton";
import { useToast } from "../components/Toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  return res.json();
}

export default function Dashboard() {
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email: string; agentName: string } | null>(null);
  const [unpublishSlug, setUnpublishSlug] = useState<string | null>(null);
  const [unpublishing, setUnpublishing] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  const fetchKits = () => {
    const token = localStorage.getItem("kithub_token");
    if (!token) return;

    fetch(`${API_URL}/api/kits/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(body => {
            throw new Error(body.message || `Request failed (${res.status})`);
          });
        }
        return res.json();
      })
      .then(data => {
        setKits(data.kits || []);
        setLoading(false);
      })
      .catch((err) => {
        showToast(err.message || "Failed to load your kits", "error");
        setKits([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    const token = localStorage.getItem("kithub_token");
    const storedUser = localStorage.getItem("kithub_user");

    if (!token) {
      showToast("Please sign in to continue", "warning");
      setTimeout(() => { window.location.href = "/auth"; }, 1500);
      return;
    }

    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch {}
    }

    fetchKits();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("kithub_token");
    localStorage.removeItem("kithub_user");
    window.location.href = "/auth";
  };

  const handleUnpublish = async () => {
    if (!unpublishSlug) return;
    setUnpublishing(true);
    const token = localStorage.getItem("kithub_token");

    try {
      const res = await fetch(`${API_URL}/api/kits/${unpublishSlug}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unpublish failed");
      showToast(`"${unpublishSlug}" has been unpublished`, "success");
      setUnpublishSlug(null);
      fetchKits();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setUnpublishing(false);
    }
  };

  const totalInstalls = kits.reduce((sum: number, k: any) => sum + Number(k.installs || 0), 0);
  const avgScore = kits.length > 0 ? Math.round(kits.reduce((sum: number, k: any) => sum + (k.score || 0), 0) / kits.length) : 0;

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
              <div className="stat-context">
                {kits.length === 0 ? "Get started by publishing your first kit" : `${kits.length} kit${kits.length === 1 ? "" : "s"} live on the registry`}
              </div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-value">
                {totalInstalls.toLocaleString()}
              </div>
              <div className="stat-label">Total Installs</div>
              <div className="stat-context">
                {totalInstalls === 0 ? "Installs will appear as agents use your kits" : "Across all published kits"}
              </div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-value">{avgScore}</div>
              <div className="stat-label">Avg. Score</div>
              <div className="stat-context">
                {avgScore >= 9 ? "Excellent safety rating" : avgScore >= 7 ? "Good — review findings to improve" : avgScore > 0 ? "Needs attention — check scan results" : "Score appears after publishing"}
              </div>
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
            <div key={kit.slug} className="kit-card kit-card-managed">
              <Link href={`/registry/${kit.slug}`} className="kit-card-link">
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
              <div className="kit-card-actions">
                <Link href={`/publish?edit=${kit.slug}`} className="btn btn-sm btn-secondary">Edit</Link>
                <button
                  onClick={(e) => { e.preventDefault(); setUnpublishSlug(kit.slug); }}
                  className="btn btn-sm btn-danger"
                >
                  Unpublish
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {unpublishSlug && (
        <div className="modal-overlay" onClick={() => !unpublishing && setUnpublishSlug(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <h3>Unpublish Kit</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>
              Are you sure you want to unpublish <strong>"{unpublishSlug}"</strong>? This will remove it from the public registry. This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                onClick={() => setUnpublishSlug(null)}
                className="btn btn-secondary"
                disabled={unpublishing}
              >
                Cancel
              </button>
              <button
                onClick={handleUnpublish}
                className="btn btn-danger"
                disabled={unpublishing}
              >
                {unpublishing ? "Unpublishing..." : "Unpublish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
