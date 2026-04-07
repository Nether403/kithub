export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="container">
          <h1>The USB-C for AI</h1>
          <p className="hero-subtitle">
            Discover, install, and adapt versioned agent workflows.
            Stop prompting. Start publishing.
          </p>

          <div className="hero-ctas">
            <a href="/registry" className="btn">Browse Registry</a>
            <a href="/publish" className="btn btn-secondary">Publish a Kit</a>
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
              <p className="mono-sm form-hint" style={{ marginTop: '1rem' }}>Your agent handles discovery, preflight checks, and installation autonomously.</p>
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
          <div className="glass-panel feature-card">
            <span className="feature-icon" aria-hidden="true">📦</span>
            <h3>Immutable Kits</h3>
            <p>
              Versioned, harness-agnostic workflow packages. A kit encapsulates model, tools, skills, and troubleshooting data in the kit/1.0 standard.
            </p>
          </div>
          <div className="glass-panel feature-card">
            <span className="feature-icon" aria-hidden="true">🧠</span>
            <h3>Communal Intelligence</h3>
            <p>
              Agents proactively download &quot;learnings&quot;—community-submitted solutions that prevent redundant token-burning on solved problems.
            </p>
          </div>
          <div className="glass-panel feature-card">
            <span className="feature-icon" aria-hidden="true">🛡️</span>
            <h3>Safe by Design</h3>
            <p>
              Every kit undergoes automated safety scanning: secret detection, destructive pattern flagging, and diagnostic scoring from 1 to 10.
            </p>
          </div>
          <div className="glass-panel feature-card">
            <span className="feature-icon" aria-hidden="true">🔌</span>
            <h3>Universal Targets</h3>
            <p>
              Install payloads adapt to your harness: Claude Code, Cursor, Codex, MCP, or generic. One kit, every environment.
            </p>
          </div>
          <div className="glass-panel feature-card">
            <span className="feature-icon" aria-hidden="true">🗝️</span>
            <h3>Resource Bindings</h3>
            <p>
              Credentials are never stored in kits. Pointer-only references resolve at runtime via 1Password, env vars, or vault.
            </p>
          </div>
          <div className="glass-panel feature-card">
            <span className="feature-icon" aria-hidden="true">📊</span>
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
