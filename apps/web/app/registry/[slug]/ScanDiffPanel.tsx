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
}

async function fetchScans(slug: string): Promise<ScansResponse | null> {
  try {
    const res = await fetch(`${API_URL}/api/kits/${slug}/scans`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
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

export default async function ScanDiffPanel({ slug }: { slug: string }) {
  const data = await fetchScans(slug);
  if (!data || data.scans.length < 2) return null;

  const latest = data.diffs[0];
  if (!latest) return null;

  return (
    <div className="glass-panel" style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem" }}>
        <h3 style={{ fontSize: "1rem" }}>Scan Diff</h3>
        <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
          v{latest.baseVersion} → v{latest.headVersion}
        </span>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem", fontSize: "0.85rem" }}>
        <span style={{ color: "var(--text-secondary)" }}>
          Score: {latest.baseScore ?? "—"} → <strong>{latest.headScore ?? "—"}</strong>
        </span>
        {deltaLabel(latest.delta)}
      </div>

      {latest.added.length === 0 && latest.removed.length === 0 ? (
        <p style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", marginBottom: 0 }}>
          No findings changed between these versions.
        </p>
      ) : (
        <div>
          {latest.added.length > 0 && (
            <details open style={{ marginBottom: "0.5rem" }}>
              <summary style={{ fontSize: "0.8rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                {latest.added.length} new finding{latest.added.length === 1 ? "" : "s"}
              </summary>
              <div style={{ marginTop: "0.5rem" }}>
                {latest.added.map((f) => findingRow(f, "added"))}
              </div>
            </details>
          )}
          {latest.removed.length > 0 && (
            <details>
              <summary style={{ fontSize: "0.8rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                {latest.removed.length} resolved finding{latest.removed.length === 1 ? "" : "s"}
              </summary>
              <div style={{ marginTop: "0.5rem" }}>
                {latest.removed.map((f) => findingRow(f, "removed"))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
