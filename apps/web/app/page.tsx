const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface RegistryStats {
  totalKits: number;
  totalInstalls: number;
  totalPublishers: number;
  totalCollections: number;
}

async function getStats(): Promise<RegistryStats> {
  const fallback: RegistryStats = { totalKits: 0, totalInstalls: 0, totalPublishers: 0, totalCollections: 0 };
  try {
    const [kitsRes, collectionsRes] = await Promise.all([
      fetch(`${API_URL}/api/kits?limit=1`, { cache: "no-store" }).catch(() => null),
      fetch(`${API_URL}/api/collections`, { cache: "no-store" }).catch(() => null),
    ]);
    let totalKits = 0;
    let totalInstalls = 0;
    let totalPublishers = 0;
    let totalCollections = 0;

    if (kitsRes?.ok) {
      const data = await kitsRes.json();
      totalKits = data.total ?? 0;
    }
    if (collectionsRes?.ok) {
      const data = await collectionsRes.json();
      const collections = data.collections ?? [];
      totalCollections = collections.length;
      totalInstalls = collections.reduce((s: number, c: { totalInstalls?: number }) => s + (c.totalInstalls ?? 0), 0);
      const curators = new Set<string>(collections.map((c: { curator?: string }) => c.curator ?? "").filter(Boolean));
      totalPublishers = curators.size;
    }
    return { totalKits, totalInstalls, totalPublishers, totalCollections };
  } catch {
    return fallback;
  }
}

function formatStat(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return n.toLocaleString();
}

export default async function Home() {
  const stats = await getStats();

  return (
    <main>
      <section className="hero">
        <div className="container">
          <div className="status-pill" role="status" aria-label="Registry status">
            <span className="status-pill-dot" aria-hidden="true" />
            <span>Live Registry</span>
            <span className="status-pill-divider">·</span>
            <span className="status-pill-meta">
              {formatStat(stats.totalKits)} kit{stats.totalKits === 1 ? "" : "s"} indexed
            </span>
          </div>

          <h1>
            Workflows &amp; Skills for<br />
            Every <span className="accent-word">AI Agent</span>
          </h1>
          <p className="hero-subtitle">
            The universal registry for reusable agent workflows (Kits) and expert instruction sets (Skills). Works with Cursor, Claude, Codex, and any compatible agent.
          </p>

          <div className="hero-ctas">
            <a href="/registry" className="btn">Browse Kits</a>
            <a href="/skills" className="btn btn-secondary btn-secondary-visible">Explore Skills</a>
          </div>

          <div className="hero-stats" role="list" aria-label="Registry statistics">
            <div className="hero-stat" role="listitem">
              <div className="hero-stat-value">{formatStat(stats.totalKits)}</div>
              <span className="hero-stat-label">Kits</span>
            </div>
            <div className="hero-stat" role="listitem">
              <div className="hero-stat-value">{formatStat(stats.totalCollections)}</div>
              <span className="hero-stat-label">Collections</span>
            </div>
            <div className="hero-stat" role="listitem">
              <div className="hero-stat-value">{formatStat(stats.totalPublishers)}</div>
              <span className="hero-stat-label">Publishers</span>
            </div>
            <div className="hero-stat" role="listitem">
              <div className="hero-stat-value">{formatStat(stats.totalInstalls)}</div>
              <span className="hero-stat-label">Installs</span>
            </div>
          </div>

          <div className="install-primary page-narrow">
            <div className="glass-panel">
              <h3>Agent-First Quick Start</h3>
              <p className="step-description">
                Tell your agent (Cursor, Claude Code, Codex) to run this one prompt:
              </p>
              <div className="terminal-block">
                Fetch the SkillKitHub kit at <strong>skillkithub.com/registry/weekly-earnings-preview</strong> and follow its specification.<span className="cursor"></span>
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
          <div className="eyebrow">
            <span className="eyebrow-num">01</span>
            <span className="eyebrow-bar" />
            <span>Workflow</span>
          </div>
          <h2>How It Works</h2>
          <p>Three steps from discovery to autonomous execution.</p>
        </div>

        <div className="steps-flow">
          <div className="step-item">
            <span className="step-number">1</span>
            <h4>Discover</h4>
            <p>Browse kits and skills or let your agent search by intent. Everything is versioned and safety-scanned.</p>
          </div>
          <div className="step-item">
            <span className="step-number">2</span>
            <h4>Install</h4>
            <p>One prompt. Your agent writes target-specific files (CLAUDE.md, AGENTS.md, .cursor/) automatically.</p>
          </div>
          <div className="step-item">
            <span className="step-number">3</span>
            <h4>Adapt</h4>
            <p>When friction arises, agents inherit community &quot;learnings&quot;&mdash;pre-solved edge cases that save tokens and time.</p>
          </div>
        </div>
      </section>

      <section className="container">
        <div className="section-header">
          <div className="eyebrow">
            <span className="eyebrow-num">02</span>
            <span className="eyebrow-bar" />
            <span>Platform</span>
          </div>
          <h2>Built for Production Agents</h2>
          <p>Six guarantees that turn brittle prompts into reliable infrastructure.</p>
        </div>

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
          <div className="glass-panel feature-card feature-card-purple">
            <div className="feature-icon-styled feature-icon-purple" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            </div>
            <h3>Expert Skills</h3>
            <p>
              Curated instruction sets that teach any AI agent specialized capabilities &mdash; from SQL optimization to UI design. Universal and agent-agnostic.
            </p>
          </div>
          <div className="glass-panel feature-card feature-card-blue">
            <div className="feature-icon-styled feature-icon-blue" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a9 9 0 0 1 9 9c0 3.9-2.5 7.2-6 8.5M12 2a9 9 0 0 0-9 9c0 3.9 2.5 7.2 6 8.5M12 2v20"/><path d="M2 12h20"/></svg>
            </div>
            <h3>All Agents Welcome</h3>
            <p>
              Works with Cursor, Claude Code, Codex, and any compatible agent. One registry, every environment.
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
