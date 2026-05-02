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
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", marginBottom: "0.5rem" }}>
          Curated Collections
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>
          Trusted bundles of kits handpicked for a workflow — install the whole stack into your agent in one shot.
        </p>
      </div>

      {collections.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <p style={{ color: "var(--text-secondary)" }}>No collections published yet.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
          {collections.map((c) => (
            <Link
              key={c.slug}
              href={`/collections/${c.slug}`}
              className="glass-panel"
              style={{ textDecoration: "none", color: "inherit", display: "block", cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "1.75rem" }}>{c.emoji}</span>
                <div>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "0.15rem" }}>{c.title}</h3>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                    by {c.curator}
                  </span>
                </div>
                {c.featured && (
                  <span
                    style={{
                      marginLeft: "auto",
                      background: "rgba(0,232,143,0.12)",
                      color: "var(--accent)",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "999px",
                      fontSize: "0.7rem",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Featured
                  </span>
                )}
              </div>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: 1.5 }}>
                {c.description}
              </p>
              <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", color: "var(--text-tertiary)", flexWrap: "wrap" }}>
                <span>{c.kitCount} kit{c.kitCount === 1 ? "" : "s"}</span>
                <span>{Number(c.totalInstalls).toLocaleString()} installs</span>
                {c.averageStars !== null && <span>★ {c.averageStars.toFixed(1)} avg</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
