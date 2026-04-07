export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="container">
          <h1>The USB-C for AI</h1>
          <p className="hero-subtitle">
            A global registry of reusable, versioned workflows that any AI agent can discover, install, and run — no custom integration required.
          </p>

          <div className="hero-ctas">
            <a href="/registry" className="btn">Browse Registry</a>
            <a href="/publish" className="btn btn-secondary btn-secondary-visible">Publish a Kit</a>
          </div>

          <div className="install-primary page-narrow">
            <div className="glass-panel">
              <h3>⚡ Agent-First Quick Start</h3>
              <p className="step-description">
                Tell your agent (Cursor, Claude Code, OpenClaw) to run this one prompt:
              </p>
              <div className="terminal-block">
                Fetch the KitHub kit at <strong>kithub.com/registry/weekly-earnings-preview</strong> and follow its specification.<span className="cursor"></span>
              </div>
              <p className="mono-sm form-hint mt-1">Your agent handles discovery, preflight checks, and installation autonomously.</p>
            </div>
          </div>

          <div className="install-legacy page-narrow">
            <details>
              <summary>Manual CLI fallback (headless environments)</summary>
              <div className="terminal-block">
                npx @kithub/cli install weekly-earnings-preview --target=claude-code
              </div>
            </details>
          </div>
        </div>
      </section>

      <section className="container">
        <div className="section-header">
          <h2>How It Works</h2>
          <p>Three steps from discovery to autonomous execution.</p>
        </div>

        <div className="steps-flow">
          <div className="step-item">
            <span className="step-number">1</span>
            <h4>Discover</h4>
            <p>Browse the registry or let your agent search by intent. Every kit is versioned and safety-scanned.</p>
          </div>
          <div className="step-item">
            <span className="step-number">2</span>
            <h4>Install</h4>
            <p>One prompt. Your agent writes target-specific files (CLAUDE.md, AGENTS.md, .cursor/) automatically.</p>
          </div>
          <div className="step-item">
            <span className="step-number">3</span>
            <h4>Adapt</h4>
            <p>When friction arises, agents inherit community &quot;learnings&quot;—pre-solved edge cases that save tokens and time.</p>
          </div>
        </div>
      </section>

      <section className="container">
        <div className="feature-grid">
          <div className="glass-panel feature-card feature-card-green">
            <div className="feature-icon-styled feature-icon-green" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            </div>
            <h3>Immutable Kits</h3>
            <p>
              Versioned, harness-agnostic workflow packages. A kit encapsulates model, tools, skills, and troubleshooting data in the kit/1.0 standard.
            </p>
          </div>
          <div className="glass-panel feature-card feature-card-blue">
            <div className="feature-icon-styled feature-icon-blue" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a9 9 0 0 1 9 9c0 3.9-2.5 7.2-6 8.5M12 2a9 9 0 0 0-9 9c0 3.9 2.5 7.2 6 8.5M12 2v20"/><path d="M2 12h20"/></svg>
            </div>
            <h3>Communal Intelligence</h3>
            <p>
              Agents proactively download &quot;learnings&quot;—community-submitted solutions that prevent redundant token-burning on solved problems.
            </p>
          </div>
          <div className="glass-panel feature-card feature-card-amber">
            <div className="feature-icon-styled feature-icon-amber" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h3>Safe by Design</h3>
            <p>
              Every kit undergoes automated safety scanning: secret detection, destructive pattern flagging, and diagnostic scoring from 1 to 10.
            </p>
          </div>
          <div className="glass-panel feature-card feature-card-purple">
            <div className="feature-icon-styled feature-icon-purple" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
            </div>
            <h3>Universal Targets</h3>
            <p>
              Install payloads adapt to your harness: Claude Code, Cursor, Codex, MCP, or generic. One kit, every environment.
            </p>
          </div>
          <div className="glass-panel feature-card feature-card-rose">
            <div className="feature-icon-styled feature-icon-rose" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
            </div>
            <h3>Resource Bindings</h3>
            <p>
              Credentials are never stored in kits. Pointer-only references resolve at runtime via 1Password, env vars, or vault.
            </p>
          </div>
          <div className="glass-panel feature-card feature-card-cyan">
            <div className="feature-icon-styled feature-icon-cyan" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
            </div>
            <h3>Agent Analytics</h3>
            <p>
              Track installs, security scores, and learnings per kit. See which workflows drive real value across the community.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
