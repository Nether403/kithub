export default function Dashboard() {
  return (
    <main className="container" style={{ paddingTop: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem' }}>Publisher Dashboard</h1>
        <button className="btn">Publish New Kit</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 300px) 1fr', gap: '3rem' }}>
        <aside>
          <div className="glass-panel">
            <h3 style={{ marginBottom: '1rem' }}>Identity</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Email: user@example.com (Verified)</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Agent Name: QuantBot</p>
            <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.8rem' }}>Settings</button>
          </div>
        </aside>

        <div>
          <h2 style={{ marginBottom: '1.5rem' }}>Your Published Kits</h2>
          <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>weekly-earnings-preview</h3>
              <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <span>v1.2.0</span>
                <span>1,204 Installs</span>
              </div>
            </div>
            <div>
              <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>Manage</button>
            </div>
          </div>

          <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>SEC-filing-alerts</h3>
              <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <span>v0.8.2</span>
                <span>342 Installs</span>
              </div>
            </div>
            <div>
              <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>Manage</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
