import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface SkillDetail {
  slug: string;
  title: string;
  emoji: string;
  category: string;
  summary: string;
  description: string;
  installCount: number;
  tags: string[];
  publisherName: string | null;
  createdAt: string;
  updatedAt: string;
}

async function getSkill(slug: string): Promise<SkillDetail | null> {
  try {
    const res = await fetch(`${API_URL}/api/skills/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const skill = await getSkill(slug);
  if (!skill) return { title: "Skill Not Found" };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://skillkithub.com";
  return {
    title: `${skill.emoji} ${skill.title} — SkillKitHub`,
    description: skill.summary,
    openGraph: {
      title: `${skill.emoji} ${skill.title} — Agent Skill`,
      description: skill.summary,
      url: `${baseUrl}/skills/${skill.slug}`,
      siteName: "SkillKitHub",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${skill.emoji} ${skill.title}`,
      description: skill.summary,
    },
  };
}

function renderDescription(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} style={{
          fontSize: '1.3rem',
          marginTop: '2rem',
          marginBottom: '0.75rem',
          color: '#fff',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '0.5rem',
        }}>
          {line.replace('## ', '')}
        </h2>
      );
    } else if (line.startsWith('- ')) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i]!.startsWith('- ')) {
        listItems.push(lines[i]!.replace('- ', ''));
        i++;
      }
      elements.push(
        <ul key={`list-${i}`} style={{
          paddingLeft: '1.5rem',
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
          lineHeight: '1.8',
          marginBottom: '1rem',
        }}>
          {listItems.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      );
      continue;
    } else if (line.trim() === '') {
      // skip
    } else {
      elements.push(
        <p key={i} style={{
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
          lineHeight: '1.7',
          marginBottom: '0.75rem',
        }}>
          {line}
        </p>
      );
    }
    i++;
  }

  return elements;
}

export default async function SkillDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const skill = await getSkill(slug);

  if (!skill) {
    notFound();
  }

  return (
    <main className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '800px' }}>
      <Link href="/skills" className="btn-back" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        color: 'var(--text-secondary)',
        fontSize: '0.875rem',
        marginBottom: '2rem',
        textDecoration: 'none',
      }}>
        &larr; All Skills
      </Link>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '3rem' }}>{skill.emoji}</span>
          <div>
            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', marginBottom: '0.25rem' }}>
              {skill.title}
            </h1>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent)',
                background: 'var(--accent-dim)',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {skill.category}
              </span>
              {skill.publisherName && (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                  by {skill.publisherName}
                </span>
              )}
            </div>
          </div>
        </div>

        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '1.1rem',
          lineHeight: '1.6',
          marginBottom: '1.5rem',
        }}>
          {skill.summary}
        </p>

        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              {skill.installCount.toLocaleString()}
            </span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>installs</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {skill.tags.map((tag) => (
            <Link
              key={tag}
              href={`/skills?tag=${tag}`}
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-tertiary)',
                background: 'rgba(255,255,255,0.04)',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-xs)',
                fontFamily: 'var(--font-mono)',
                textDecoration: 'none',
                border: '1px solid var(--border)',
                transition: 'border-color 0.2s',
              }}
            >
              #{tag}
            </Link>
          ))}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        {renderDescription(skill.description)}
      </div>
    </main>
  );
}
