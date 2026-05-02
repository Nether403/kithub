import Link from "next/link";
import { Stars } from "../../components/Stars";
import { VerifiedBadge } from "../../components/VerifiedBadge";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface RelatedKit {
  slug: string;
  title: string;
  summary: string;
  publisherName?: string | null;
  publisherVerifiedAt?: string | null;
  installs: number;
  averageStars?: number | null;
  ratingCount?: number;
  tags: string[];
}

async function fetchRelated(slug: string): Promise<{ kits: RelatedKit[]; mode: string }> {
  try {
    const res = await fetch(`${API_URL}/api/kits?related_to=${slug}&limit=4`, { cache: "no-store" });
    if (!res.ok) return { kits: [], mode: "none" };
    const data = await res.json();
    return { kits: data.kits ?? [], mode: data.mode ?? "none" };
  } catch {
    return { kits: [], mode: "none" };
  }
}

export default async function RelatedKits({ slug }: { slug: string }) {
  const { kits, mode } = await fetchRelated(slug);
  if (kits.length === 0) return null;

  return (
    <div className="glass-panel" style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
        <h3 style={{ fontSize: "1rem" }}>Related Kits</h3>
        <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
          via {mode === "embedding" ? "semantic similarity" : mode === "tags" ? "shared tags" : "discovery"}
        </span>
      </div>
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {kits.map((k) => (
          <Link
            key={k.slug}
            href={`/registry/${k.slug}`}
            style={{
              padding: "0.75rem",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              textDecoration: "none",
              color: "inherit",
              display: "block",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
              <strong style={{ fontSize: "0.95rem" }}>{k.title}</strong>
              <Stars value={k.averageStars ?? null} count={k.ratingCount} size="sm" showCount={false} />
            </div>
            {k.publisherName && (
              <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.15rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                @{k.publisherName}
                <VerifiedBadge verified={!!k.publisherVerifiedAt} size="sm" />
                <span style={{ marginLeft: "auto" }}>{Number(k.installs).toLocaleString()} installs</span>
              </div>
            )}
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.5rem", lineHeight: 1.4 }}>
              {k.summary?.slice(0, 110)}
              {k.summary && k.summary.length > 110 ? "…" : ""}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
