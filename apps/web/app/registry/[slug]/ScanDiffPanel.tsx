"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface ScanFinding {
  type: "error" | "warning" | "tip";
  message: string;
  location?: string;
}

interface Diff {
  baseVersion: string | null;
  baseScore: number | null;
  headVersion: string;
  headScore: number | null;
  delta: number | null;
  added: ScanFinding[];
  removed: ScanFinding[];
  unchanged: ScanFinding[];
}

interface ScansResponse {
  slug: string;
  scans: Array<{ version: string; score: number | null; findings: ScanFinding[]; createdAt: string }>;
  diffs: Diff[];
  versions: string[];
}

function deltaLabel(delta: number | null) {
  if (delta === null) return null;
  const sign = delta > 0 ? "+" : "";
  const color = delta > 0 ? "var(--accent)" : delta < 0 ? "var(--danger)" : "var(--text-tertiary)";
  return (
    <span style={{ color, fontFamily: "var(--font-mono)", fontWeight: 600 }}>
      {sign}{delta} pts
    </span>
  );
}

function findingRow(f: ScanFinding, kind: "added" | "removed" | "unchanged") {
  const baseColor =
    f.type === "error" ? "var(--danger)" : f.type === "warning" ? "var(--warning)" : "var(--accent)";
  const prefix = kind === "added" ? "+" : kind === "removed" ? "−" : "·";
  return (
    <div
      key={`${kind}-${f.type}-${f.message}`}
      style={{
        fontSize: "0.78rem",
        color: kind === "removed" ? "var(--text-tertiary)" : baseColor,
        textDecoration: kind === "removed" ? "line-through" : "none",
        opacity: kind === "unchanged" ? 0.6 : 1,
        padding: "0.25rem 0.5rem",
        fontFamily: "var(--font-mono)",
      }}
    >
      <span style={{ marginRight: "0.5rem" }}>{prefix}</span>
      [{f.type}] {f.message}
    </div>
  );
}

export default function ScanDiffPanel({ slug }: { slug: string }) {
  const [data, setData] = useState<ScansResponse | null>(null);
  const [diff, setDiff] = useState<Diff | null>(null);
  const [base, setBase] = useState<string>("");
  const [head, setHead] = useState<string>("");
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/kits/${slug}/scans`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ScansResponse | null) => {
        if (!d || d.scans.length < 2) {
          setData(d);
          return;
        }
        setData(d);
        // Default: latest two versions
        const initialHead = d.versions[0] ?? "";
        const initialBase = d.versions[1] ?? "";
        setHead(initialHead);
        setBase(initialBase);
        setDiff(d.diffs[0] ?? null);
      })
      .catch(() => setError("Failed to load scan history"));
  }, [slug]);

  useEffect(() => {
    if (!data || !base || !head || base === head) return;
    setLoading(true);
    setError(null);
    fetch(`${API_URL}/api/kits/${slug}/scans?base=${encodeURIComponent(base)}&head=${encodeURIComponent(head)}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d: ScansResponse = await r.json();
        setDiff(d.diffs[0] ?? null);
      })
      .catch(() => setError("Could not load that diff."))
      .finally(() => setLoading(false));
  }, [base, head, slug, data]);

  if (!data || data.scans.length < 2) return null;

  return (
    <div className="glass-panel" style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h3 style={{ fontSize: "1rem", margin: 0 }}>Scan Diff</h3>
        <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
          {data.scans.length} releases
        </span>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", alignItems: "center", flexWrap: "wrap", fontSize: "0.8rem" }}>
        <label style={{ color: "var(--text-secondary)" }}>Base</label>
        <select
          value={base}
          onChange={(e) => setBase(e.target.value)}
          className="input"
          style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}
          aria-label="Base version"
        >
          {data.versions.map((v) => (
            <option key={v} value={v} disabled={v === head}>v{v}</option>
          ))}
        </select>
        <span style={{ color: "var(--text-tertiary)" }}>→</span>
        <label style={{ color: "var(--text-secondary)" }}>Head</label>
        <select
          value={head}
          onChange={(e) => setHead(e.target.value)}
          className="input"
          style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}
          aria-label="Head version"
        >
          {data.versions.map((v) => (
            <option key={v} value={v} disabled={v === base}>v{v}</option>
          ))}
        </select>
        {loading && <span style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>loading…</span>}
      </div>

      {error && (
        <p style={{ color: "var(--danger)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>{error}</p>
      )}

      {diff && (
        <>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem", fontSize: "0.85rem" }}>
            <span style={{ color: "var(--text-secondary)" }}>
              Score: {diff.baseScore ?? "—"} → <strong>{diff.headScore ?? "—"}</strong>
            </span>
            {deltaLabel(diff.delta)}
          </div>

          {diff.added.length === 0 && diff.removed.length === 0 ? (
            <p style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", marginBottom: 0 }}>
              No findings changed between v{diff.baseVersion} and v{diff.headVersion}.
            </p>
          ) : (
            <div>
              {diff.added.length > 0 && (
                <details open style={{ marginBottom: "0.5rem" }}>
                  <summary style={{ fontSize: "0.8rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                    {diff.added.length} new finding{diff.added.length === 1 ? "" : "s"}
                  </summary>
                  <div style={{ marginTop: "0.5rem" }}>
                    {diff.added.map((f) => findingRow(f, "added"))}
                  </div>
                </details>
              )}
              {diff.removed.length > 0 && (
                <details>
                  <summary style={{ fontSize: "0.8rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                    {diff.removed.length} resolved finding{diff.removed.length === 1 ? "" : "s"}
                  </summary>
                  <div style={{ marginTop: "0.5rem" }}>
                    {diff.removed.map((f) => findingRow(f, "removed"))}
                  </div>
                </details>
              )}
            </div>
          )}

          {diff.unchanged.length > 0 && (
            <div style={{ marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setShowUnchanged((v) => !v)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-tertiary)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  padding: 0,
                }}
              >
                {showUnchanged ? "▼" : "▶"} {diff.unchanged.length} unchanged finding{diff.unchanged.length === 1 ? "" : "s"}
              </button>
              {showUnchanged && (
                <div style={{ marginTop: "0.5rem" }}>
                  {diff.unchanged.map((f) => findingRow(f, "unchanged"))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
