"use client";

import { useRouter } from "next/navigation";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "installs", label: "Most Installed" },
  { value: "score", label: "Highest Score" },
];

export function SortSelector({ currentSort, searchParams }: { currentSort: string; searchParams: Record<string, string | undefined> }) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams();
    if (searchParams.q) params.set("q", searchParams.q);
    if (searchParams.tag) params.set("tag", searchParams.tag);
    params.set("sort", e.target.value);
    router.push(`/registry?${params.toString()}`);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <label htmlFor="sort-select" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Sort by:</label>
      <select
        id="sort-select"
        className="input"
        value={currentSort}
        onChange={handleChange}
        style={{ width: 'auto', minWidth: '150px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
      >
        {SORT_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
