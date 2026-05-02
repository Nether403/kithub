import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Stars } from "../../components/Stars";
import { VerifiedBadge } from "../../components/VerifiedBadge";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const WEB_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://skillkithub.com";

interface CollectionKit {
  slug: string;
  title: string;
  summary: string;
  publisherName: string | null;
  publisherVerifiedAt?: string | null;
  version: string;
  installs: number;
  tags: string[];
  score: number | null;
  averageStars: number | null;
  ratingCount: number;
}

interface CollectionDetail {
  slug: string;
  title: string;
  description: string;
  curator: string;
  emoji: string;
  featured: boolean;
  kits: CollectionKit[];
  createdAt: string;
  updatedAt: string;
}

async function getCollection(slug: string): Promise<CollectionDetail | null> {
  try {
    const res = await fetch(`${API_URL}/api/collections/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getCollectionInstall(slug: string): Promise<{ instructions: string; installUrls: string[] } | null> {
  try {
    const res = await fetch(`${API_URL}/api/collections/${slug}/install`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await paramsPromise;
  const c = await getCollection(slug);
  if (!c) return { title: "Collection Not Found — SkillKitHub" };
  return {
    title: `${c.title} — SkillKitHub Collection`,
    description: c.description,
  };
}

export default async function CollectionDetailPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const { slug } = await paramsPromise;
  const c = await getCollection(slug);
  if (!c) notFound();

  const install = await getCollectionInstall(slug);
  const installInstructions =
    install?.instructions ??
    `Fetch and install each kit in this curated collection (in order). For each URL, follow the kit spec to set it up.\n\n` +
      c.kits.map((k, i) => `${i + 1}. ${WEB_URL}/registry/${k.slug}`).join("\n");

  return (
    <main className="container" style={{ paddingTop: "3rem", paddingBottom: "4rem", minHeight: "70vh" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Link
          href="/collections"
          style={{
            color: "var(--text-tertiary)",
            fontSize: "0.8rem",
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.05em",
          }}
        >
          ← Back to Collections
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <span style={{ fontSize: "3rem" }}>{c.emoji}</span>
        <div>
          <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", marginBottom: "0.25rem" }}>{c.title}</h1>
          <p style={{ color: "var(--text-tertiary)", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}>
            curated by {c.curator}
          </p>
        </div>
      </div>
      <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", marginBottom: "2.5rem", maxWidth: "780px" }}>
        {c.description}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "2.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Kits in this stack</h2>
          <div style={{ display: "grid", gap: "1rem" }}>
            {c.kits.map((k, i) => (
              <Link key={k.slug} href={`/registry/${k.slug}`} className="kit-card">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.75rem",
                        color: "var(--text-tertiary)",
                        background: "var(--surface)",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "var(--radius-xs)",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 style={{ margin: 0 }}>{k.title}</h3>
                  </div>
                  {k.publisherName && (
                    <span
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--text-secondary)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}
                    >
                      by <span style={{ color: "var(--accent)" }}>@{k.publisherName}</span>
                      <VerifiedBadge verified={!!k.publisherVerifiedAt} />
                    </span>
                  )}
                  <p style={{ marginTop: "0.5rem" }}>{k.summary}</p>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      marginTop: "0.5rem",
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <Stars value={k.averageStars} count={k.ratingCount} size="sm" />
                    {[...new Set(k.tags)].map((tag) => (
                      <span key={tag} className="tag-chip">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--accent)",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    v{k.version}
                  </div>
                  <div className="stat-counter">{Number(k.installs).toLocaleString()} installs</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="sidebar-sticky" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="glass-panel">
              <h3 style={{ marginBottom: "0.75rem" }}>⚡ Install Stack</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                Paste this into your agent (Cursor, Claude Code, OpenClaw, Codex):
              </p>
              <div className="terminal-block" style={{ fontSize: "0.75rem", whiteSpace: "pre-wrap" }}>
                {installInstructions}
              </div>
            </div>

            <div className="glass-panel">
              <h3 style={{ fontSize: "1rem", marginBottom: "1rem" }}>Stack Stats</h3>
              <ul
                style={{
                  listStyle: "none",
                  fontSize: "0.9rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                  padding: 0,
                  margin: 0,
                }}
              >
                <li style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Kits</span>
                  <strong>{c.kits.length}</strong>
                </li>
                <li style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Total Installs</span>
                  <strong>{c.kits.reduce((s, k) => s + k.installs, 0).toLocaleString()}</strong>
                </li>
                <li style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Curator</span>
                  <strong>{c.curator}</strong>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
