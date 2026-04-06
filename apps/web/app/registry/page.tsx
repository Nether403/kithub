import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function getKits(q?: string, tag?: string) {
  try {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tag) params.set("tag", tag);
    const qs = params.toString();
    const res = await fetch(`${API_URL}/api/kits${qs ? `?${qs}` : ""}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("API unavailable");
    return res.json();
  } catch {
    // Fallback mock data when API isn't running
    return {
      kits: [
        { slug: "weekly-earnings-preview", title: "Weekly Earnings Preview", summary: "Automated job for earnings report tracking", version: "1.2.0", installs: 1204, tags: ["finance", "scheduling"], score: 9 },
        { slug: "slack-summarizer", title: "Slack Channel Summarizer", summary: "Generates semantic daily digests of your team's Slack", version: "0.9.5", installs: 853, tags: ["comms", "summary"], score: 8 },
        { slug: "github-pr-reviewer", title: "Autonomous PR Reviewer", summary: "Checks structural changes and runs security scans on PRs", version: "2.1.0", installs: 3042, tags: ["engineering", "security"], score: 10 },
      ],
    };
  }
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const level = score >= 9 ? "high" : score >= 7 ? "medium" : "low";
  return <span className={`score-badge ${level}`}>◆ {score}/10</span>;
}

export default async function Registry({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const { kits } = await getKits(params.q, params.tag);

  return (
    <main className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem', minHeight: '70vh' }}>
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '0.5rem' }}>
          Kit Directory
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          Search, explore, and install agent workflows. Safe by design.
        </p>
      </div>

      {/* Search */}
      <form style={{ display: 'flex', gap: '0.75rem', marginBottom: '2.5rem' }}>
        <input
          name="q"
          type="text"
          className="input"
          placeholder="Search kits by title, tag, or intent..."
          defaultValue={params.q}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn">Search</button>
      </form>

      {/* Results */}
      <div style={{ display: 'grid', gap: '1rem' }}>
        {kits.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              No kits found. Try a different search or{" "}
              <Link href="/publish" style={{ color: 'var(--accent)' }}>publish the first one</Link>.
            </p>
          </div>
        ) : (
          kits.map((kit: any) => (
            <Link href={`/registry/${kit.slug}`} key={kit.slug} className="kit-card">
              <div>
                <h3>{kit.title}</h3>
                <p>{kit.summary}</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  {kit.tags?.map((tag: string) => (
                    <span key={tag} className="tag-chip">#{tag}</span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  v{kit.version}
                </div>
                <ScoreBadge score={kit.score} />
                <div className="stat-counter" style={{ marginTop: '0.5rem' }}>
                  {Number(kit.installs).toLocaleString()} installs
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
