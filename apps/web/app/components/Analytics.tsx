"use client";
import { useState, useEffect } from "react";
import { fetchWithSupabaseAuth } from "../../lib/api";

interface DailyMetric {
  date: string;
  count: number;
}

interface TargetBreakdown {
  target: string;
  count: number;
}

interface AnalyticsData {
  slug: string;
  totalInstalls: number;
  totalViews: number;
  dailyInstalls: DailyMetric[];
  dailyViews: DailyMetric[];
  byTarget: TargetBreakdown[];
}

const TARGET_COLORS: Record<string, string> = {
  "claude-code": "#7c3aed",
  codex: "#10b981",
  cursor: "#00e88f",
  generic: "#3b82f6",
  mcp: "#f97316",
  openclaw: "#f59e0b",
  windsurf: "#ec4899",
  cline: "#06b6d4",
};

function getTargetColor(target: string): string {
  return TARGET_COLORS[target] || "#6b7280";
}

function MiniBarChart({ data, emptyLabel }: { data: DailyMetric[]; emptyLabel: string }) {
  if (data.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-tertiary)", fontSize: "0.85rem" }}>
        {emptyLabel}
      </div>
    );
  }

  const today = new Date();
  const allDays: DailyMetric[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0]!;
    const existing = data.find((r) => r.date === dateStr);
    allDays.push({ date: dateStr, count: existing?.count ?? 0 });
  }

  const maxCount = Math.max(...allDays.map((d) => d.count), 1);

  return (
    <div>
      <svg viewBox="0 0 300 100" style={{ width: "100%", height: "120px" }} preserveAspectRatio="none">
        {allDays.map((d, i) => {
          const height = (d.count / maxCount) * 80;
          return (
            <g key={d.date}>
              <rect
                x={i * (300 / allDays.length) + 1}
                y={90 - height}
                width={300 / allDays.length - 2}
                height={height}
                rx={1.5}
                fill="var(--accent)"
                opacity={0.8}
              >
                <title>{d.date}: {d.count} install{d.count !== 1 ? "s" : ""}</title>
              </rect>
            </g>
          );
        })}
        <line x1="0" y1="90" x2="300" y2="90" stroke="var(--border)" strokeWidth="0.5" />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>
        <span>{allDays[0]!.date.slice(5)}</span>
        <span>{allDays[allDays.length - 1]!.date.slice(5)}</span>
      </div>
    </div>
  );
}

function TargetBreakdownList({ data, total }: { data: TargetBreakdown[]; total: number }) {
  if (data.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "1rem 0", color: "var(--text-tertiary)", fontSize: "0.85rem" }}>
        No target data yet
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {data.map((t) => {
        const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
        const color = getTargetColor(t.target);
        return (
          <div key={t.target}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
              <span style={{ color: "var(--text-primary)" }}>{t.target}</span>
              <span style={{ color: "var(--text-tertiary)" }}>{t.count.toLocaleString()} ({pct}%)</span>
            </div>
            <div style={{ height: "6px", background: "var(--glass-bg)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "3px", transition: "width 0.3s ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsDrawer({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchWithSupabaseAuth(`/api/kits/${slug}/analytics`)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 90vw)",
          maxHeight: "85vh",
          overflowY: "auto",
          margin: "auto",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.3rem", margin: 0 }}>Analytics: {slug}</h2>
          <button onClick={onClose} className="btn btn-secondary btn-sm" aria-label="Close analytics">
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-secondary)" }}>
            Loading analytics...
          </div>
        ) : error ? (
          <div className="alert alert-error">{error}</div>
        ) : data ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ textAlign: "center", padding: "1rem", borderRadius: "var(--radius-sm)", background: "var(--glass-bg)" }}>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--accent)" }}>
                  {data.totalInstalls.toLocaleString()}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-tertiary)" }}>Total Installs</div>
              </div>
              <div style={{ textAlign: "center", padding: "1rem", borderRadius: "var(--radius-sm)", background: "var(--glass-bg)" }}>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {data.totalViews.toLocaleString()}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-tertiary)" }}>Total Views</div>
              </div>
            </div>

            <div style={{ marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "0.95rem", marginBottom: "0.75rem", color: "var(--text-secondary)" }}>
                Installs — Last 30 Days
              </h3>
              <MiniBarChart data={data.dailyInstalls} emptyLabel="No install data yet" />
            </div>

            <div style={{ marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "0.95rem", marginBottom: "0.75rem", color: "var(--text-secondary)" }}>
                Views — Last 30 Days
              </h3>
              <MiniBarChart data={data.dailyViews} emptyLabel="No view data yet" />
            </div>

            <div>
              <h3 style={{ fontSize: "0.95rem", marginBottom: "0.75rem", color: "var(--text-secondary)" }}>
                By Install Target
              </h3>
              <TargetBreakdownList data={data.byTarget} total={data.totalInstalls} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
