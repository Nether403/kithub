"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { SkeletonCard, SkeletonStat } from "../components/Skeleton";
import { useToast } from "../components/Toast";
import AnalyticsDrawer from "../components/Analytics";
import {
  getSupabaseUser,
  getUserDisplayName,
  signOutWithSupabase,
} from "../../lib/auth";
import { fetchWithSupabaseAuth } from "../../lib/api";

export default function Dashboard() {
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email: string; agentName: string } | null>(null);
  const [unpublishSlug, setUnpublishSlug] = useState<string | null>(null);
  const [unpublishing, setUnpublishing] = useState(false);
  const [analyticsSlug, setAnalyticsSlug] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const supabaseUser = await getSupabaseUser();
        if (!supabaseUser) {
          showToast("Please sign in to continue", "warning");
          setTimeout(() => {
            window.location.href = "/auth";
          }, 1500);
          return;
        }

        if (!cancelled) {
          setUser({
            email: supabaseUser.email ?? "",
            agentName: getUserDisplayName(supabaseUser),
          });
        }

        const data = await fetchWithSupabaseAuth("/api/kits/mine");
        if (!cancelled) {
          setKits(data.kits || []);
          setLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to load your kits";
          showToast(message, "error");
          setKits([]);
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const refreshKits = async () => {
    try {
      const data = await fetchWithSupabaseAuth("/api/kits/mine");
      setKits(data.kits || []);
      setLoading(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load your kits";
      showToast(message, "error");
      setKits([]);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOutWithSupabase().catch(() => null);
    window.location.href = "/auth";
  };

  const handleUnpublish = async () => {
    if (!unpublishSlug) return;
    setUnpublishing(true);

    try {
      await fetchWithSupabaseAuth(`/api/kits/${unpublishSlug}`, {
        method: "DELETE",
      });
      showToast(`"${unpublishSlug}" has been unpublished`, "success");
      setUnpublishSlug(null);
      await refreshKits();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unpublish failed",
        "error",
      );
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
                <button
                  onClick={(e) => { e.preventDefault(); setAnalyticsSlug(kit.slug); }}
                  className="btn btn-sm btn-secondary"
                >
                  Analytics
                </button>
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

      {analyticsSlug && (
        <AnalyticsDrawer slug={analyticsSlug} onClose={() => setAnalyticsSlug(null)} />
      )}

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
