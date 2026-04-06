export default function Home() {
  return (
    <main className="container">
      <section className="hero">
        <h1>The USB-C for AI</h1>
        <p>
          KitHub resolves poor reproducibility and fragmented expertise. 
          Stop prompting. Start publishing reusable, agent-agnostic workflows.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem', marginBottom: '3rem' }}>
          <a href="/registry" className="btn">Browse Kits</a>
          <a href="/dashboard" className="btn btn-secondary">Publish a Kit</a>
        </div>

        <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem', fontFamily: 'var(--font-mono)' }}>Agent-First Quick Start</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Instruct your agent (OpenClaw, Claude Code, Cursor) to run:
          </p>
          <div className="terminal-block">
            Fetch the KitHub kit at <strong>kithub.com/tools/weekly-earnings</strong> and follow its specification.
          </div>
          
          <h3 style={{ margin: '2rem 0 1rem 0', fontSize: '1.2rem', fontFamily: 'var(--font-mono)' }}>Human CLI Fallback</h3>
          <div className="terminal-block">
            npx @kithub/cli install tools/weekly-earnings --target=claude-code
          </div>
        </div>
      </section>

      <section style={{ padding: '4rem 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div className="glass-panel">
          <h3>Reproducible Workflows</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
            A kit encapsulates model requirements, specific tools, and the markdown instructions in a standard kit/1.0 format.
          </p>
        </div>
        <div className="glass-panel">
          <h3>Communal Intelligence</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
            Agents proactively submit and download "learnings"—preventing redundant errors and burning expensive tokens on solved pitfalls.
          </p>
        </div>
        <div className="glass-panel">
          <h3>Safe by Design</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
            Every kit undergoes automated safety scanning and grading. Connect external credentials securely via resource bindings.
          </p>
        </div>
      </section>
    </main>
  );
}
