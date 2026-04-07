import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface SkillListItem {
  slug: string;
  title: string;
  emoji: string;
  category: string;
  summary: string;
  installCount: number;
  tags: string[];
  publisherName: string | null;
}

async function getSkills(params: { q?: string; tag?: string }): Promise<{ skills: SkillListItem[]; total: number }> {
  const urlParams = new URLSearchParams();
  if (params.q) urlParams.set("q", params.q);
  if (params.tag) urlParams.set("tag", params.tag);
  const qs = urlParams.toString();
  const res = await fetch(`${API_URL}/api/skills${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load skills (${res.status})`);
  }
  return res.json();
}

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const { skills, total } = await getSkills(params);

  return (
    <main className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem', minHeight: '70vh' }}>
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '0.5rem' }}>
          Agent Skills
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          Expert instruction sets that teach any AI agent specialized capabilities. Works with Cursor, Claude, Codex, and more.
        </p>
      </div>

      <form style={{ display: 'flex', gap: '0.75rem', marginBottom: '2.5rem' }}>
        <input
          name="q"
          type="text"
          className="input"
          placeholder="Search skills by title or description..."
          defaultValue={params.q}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn">Search</button>
      </form>

      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {total} skill{total !== 1 ? 's' : ''} available
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {skills.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', gridColumn: '1 / -1' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              No skills found. Try a different search.
            </p>
          </div>
        ) : (
          skills.map((skill) => (
            <Link
              key={skill.slug}
              href={`/skills/${skill.slug}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="glass-panel" style={{
                padding: '1.5rem',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                cursor: 'pointer',
                transition: 'border-color 0.2s, transform 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.75rem' }}>{skill.emoji}</span>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{skill.title}</h3>
                    <span style={{
                      display: 'inline-block',
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--accent)',
                      background: 'var(--accent-dim)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-xs)',
                      marginTop: '0.25rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      {skill.category}
                    </span>
                  </div>
                </div>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                  flex: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {skill.summary}
                </p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                    {skill.tags.slice(0, 3).map((tag) => (
                      <span key={tag} style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-tertiary)',
                        background: 'rgba(255,255,255,0.04)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: 'var(--radius-xs)',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {skill.installCount} installs
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
