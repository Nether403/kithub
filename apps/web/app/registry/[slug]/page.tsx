export default function KitDetail({ params }: { params: { slug: string } }) {
  // In a real app, fetch /api/kits/:slug
  return (
    <main className="container" style={{ paddingTop: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
        <div>
          <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>Weekly Earnings Preview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '1rem' }}>
            Automated job for earnings report tracking ({params.slug})
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>v1.2.0</span>
            <span style={{ color: 'var(--text-secondary)' }}>Published 2 days ago</span>
          </div>
        </div>
        <button className="btn">View Source</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '3rem' }}>
        <div>
          <div className="glass-panel" style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Readme (kit.md)</h2>
            <div style={{ fontFamily: 'var(--font-sans)', color: '#ccc' }}>
              <p style={{ marginBottom: '1rem' }}><strong>Goal:</strong> Extract earnings sentiment from public news for a given list of tickers.</p>
              <p style={{ marginBottom: '1rem' }}><strong>When to Use:</strong> 1 hour before market open, daily.</p>
              <h4 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#fff' }}>Steps:</h4>
              <ol style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li>Fetch top headlines for tickers via Firecrawl.</li>
                <li>Summarize sentiment using OpenAI.</li>
                <li>Format output effectively.</li>
              </ol>
            </div>
          </div>
        </div>

        <div>
          <div className="glass-panel" style={{ position: 'sticky', top: '100px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Agent Installation</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Paste this to Cursor, Claude Code, or OpenClaw:
            </p>
            <div className="terminal-block" style={{ fontSize: '0.8rem', marginBottom: '2rem' }}>
              @agent setup kit: kithub.com/{params.slug}
            </div>

            <h3 style={{ marginBottom: '1rem' }}>Manual CLI</h3>
            <div className="terminal-block" style={{ fontSize: '0.8rem', padding: '1rem' }}>
              npx @kithub/cli install {params.slug}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2rem 0' }} />

            <h3 style={{ marginBottom: '1rem' }}>Stats & Safety</h3>
            <ul style={{ listStyle: 'none', fontSize: '0.9rem', color: '#aaa', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li style={{ display: 'flex', justifyContent: 'space-between' }}><span>Installs</span> <strong style={{ color: '#fff' }}>1,204</strong></li>
              <li style={{ display: 'flex', justifyContent: 'space-between' }}><span>Security Score</span> <strong style={{ color: 'var(--accent)' }}>9.8/10</strong></li>
              <li style={{ display: 'flex', justifyContent: 'space-between' }}><span>Learnings</span> <strong style={{ color: '#fff' }}>7 available</strong></li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
