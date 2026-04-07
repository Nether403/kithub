import Link from "next/link";
import { SortSelector } from "./SortSelector";
import { Pagination } from "./Pagination";
import { KitCard, TrendingCard } from "./KitCard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface KitListItem {
  slug: string;
  title: string;
  summary: string;
  publisherName?: string | null;
  version: string;
  installs: number;
  tags: string[];
  score: number | null;
}

interface KitsResponse {
  kits: KitListItem[];
  total: number;
  page: number;
  totalPages: number;
}

async function getKits(params: { q?: string; tag?: string; sort?: string; page?: string }): Promise<KitsResponse> {
  const urlParams = new URLSearchParams();
  if (params.q) urlParams.set("q", params.q);
  if (params.tag) urlParams.set("tag", params.tag);
  if (params.sort) urlParams.set("sort", params.sort);
  if (params.page) urlParams.set("page", params.page);
  urlParams.set("limit", "20");
  const qs = urlParams.toString();
  const res = await fetch(`${API_URL}/api/kits${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Failed to load kits (${res.status})`);
  }
  return res.json();
}

async function getTrending(): Promise<KitListItem[]> {
  try {
    const res = await fetch(`${API_URL}/api/kits/trending`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.kits || [];
  } catch {
    return [];
  }
}

export default async function Registry({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; sort?: string; page?: string }>;
}) {
  const params = await searchParams;
  const [kitsData, trending] = await Promise.all([
    getKits(params),
    getTrending(),
  ]);
  const { kits, total, page, totalPages } = kitsData;
  const currentSort = params.sort || "newest";

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

      <form style={{ display: 'flex', gap: '0.75rem', marginBottom: '2.5rem' }}>
        <input
          name="q"
          type="text"
          className="input"
          placeholder="Search kits by title, tag, or intent..."
          defaultValue={params.q}
          style={{ flex: 1 }}
        />
        {params.sort && <input type="hidden" name="sort" value={params.sort} />}
        <button type="submit" className="btn">Search</button>
      </form>

      {trending.length > 0 && !params.q && (
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--accent)' }}>&#9650;</span> Trending Kits
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {trending.map((kit) => (
              <TrendingCard key={kit.slug} kit={kit} />
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {total} kit{total !== 1 ? 's' : ''} found
        </span>
        <SortSelector currentSort={currentSort} searchParams={params} />
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {kits.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              No kits found. Try a different search or{" "}
              <Link href="/publish" style={{ color: 'var(--accent)' }}>publish the first one</Link>.
            </p>
          </div>
        ) : (
          kits.map((kit) => (
            <KitCard key={kit.slug} kit={kit} />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} searchParams={params} />
      )}
    </main>
  );
}
