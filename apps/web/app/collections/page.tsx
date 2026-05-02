import Link from "next/link";
import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface CollectionSummary {
  slug: string;
  title: string;
  description: string;
  curator: string;
  emoji: string;
  kitCount: number;
  totalInstalls: number;
  averageStars: number | null;
  featured: boolean;
}

export const metadata: Metadata = {
  title: "Collections — SkillKitHub",
  description: "Curated stacks of agent kits, ready for your harness in one shot.",
};

async function getCollections(): Promise<CollectionSummary[]> {
  try {
    const res = await fetch(`${API_URL}/api/collections`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.collections ?? [];
  } catch {
    return [];
  }
}

export default async function CollectionsPage() {
  const collections = await getCollections();

  return (
    <main className="container" style={{ paddingTop: "4rem", paddingBottom: "4rem", minHeight: "70vh" }}>
      <div style={{ marginBottom: "3rem" }}>
        <div className="eyebrow">
          <span className="eyebrow-num">/</span>
          <span className="eyebrow-bar" />
          <span>Curated Stacks</span>
        </div>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", marginBottom: "0.5rem" }}>
          Curated <span className="gradient-text">Collections</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", maxWidth: "640px" }}>
          Trusted bundles of kits handpicked for a workflow — install the whole stack into your agent in one shot.
        </p>
      </div>

      {collections.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <p style={{ color: "var(--text-secondary)" }}>No collections published yet.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: "1.25rem" }}>
          {collections.map((c) => (
            <Link
              key={c.slug}
              href={`/collections/${c.slug}`}
              className={`glass-panel collection-card${c.featured ? " collection-card-featured" : ""}`}
              style={{ textDecoration: "none", color: "inherit", display: "block", cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "0.85rem" }}>
                <span className="collection-emoji" aria-hidden="true">{c.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "0.15rem", letterSpacing: "-0.02em" }}>{c.title}</h3>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    by {c.curator}
                  </span>
                </div>
                {c.featured && <span className="featured-pill">Featured</span>}
              </div>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.25rem", lineHeight: 1.55 }}>
                {c.description}
              </p>
              <div style={{ display: "flex", gap: "1rem", fontSize: "0.78rem", color: "var(--text-tertiary)", flexWrap: "wrap", fontFamily: "var(--font-mono)", paddingTop: "0.85rem", borderTop: "1px solid var(--border)" }}>
                <span>{c.kitCount} kit{c.kitCount === 1 ? "" : "s"}</span>
                <span>{Number(c.totalInstalls).toLocaleString()} installs</span>
                {c.averageStars !== null && <span style={{ color: "#ffb340" }}>★ {c.averageStars.toFixed(1)} avg</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
