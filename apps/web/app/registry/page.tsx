import Link from "next/link";

// Mock data based on PRD requirements
const mockKits = [
  { slug: "weekly-earnings-preview", title: "Weekly Earnings Preview", summary: "Automated job for earnings report tracking", version: "1.2.0", installs: 1204, tags: ["finance", "scheduling"] },
  { slug: "slack-summarizer", title: "Slack Channel Summarizer", summary: "Generates semantic daily digests of your team's Slack", version: "0.9.5", installs: 853, tags: ["comms", "summary"] },
  { slug: "github-pr-reviewer", title: "Autonomous PR Reviewer", summary: "Checks structural changes and runs security scan", version: "2.1.0", installs: 3042, tags: ["engineering", "security"] },
];

export default function Registry() {
  return (
    <main className="container" style={{ paddingTop: '4rem' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Kit Directory</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.2rem' }}>
        Search, explore, and install agent workflows. Safe by design.
      </p>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <input 
          type="text" 
          placeholder="Search by title, tag, or intent..." 
          style={{ flex: 1, padding: '1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', fontSize: '1rem', fontFamily: 'var(--font-sans)' }}
        />
        <button className="btn">Search</button>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {mockKits.map(kit => (
          <Link href={`/registry/${kit.slug}`} key={kit.slug}>
            <div className="glass-panel" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{kit.title}</h3>
                <p style={{ color: 'var(--text-secondary)' }}>{kit.summary}</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  {kit.tags.map(tag => (
                    <span key={tag} style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>#{tag}</span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', marginBottom: '0.5rem' }}>v{kit.version}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{kit.installs.toLocaleString()} installs</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
