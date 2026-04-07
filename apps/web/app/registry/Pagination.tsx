"use client";

import Link from "next/link";

function buildPageUrl(page: number, searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (searchParams.q) params.set("q", searchParams.q);
  if (searchParams.tag) params.set("tag", searchParams.tag);
  if (searchParams.sort) params.set("sort", searchParams.sort);
  params.set("page", String(page));
  return `/registry?${params.toString()}`;
}

export function Pagination({ currentPage, totalPages, searchParams }: {
  currentPage: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
}) {
  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '2.5rem', flexWrap: 'wrap' }}>
      {currentPage > 1 && (
        <Link href={buildPageUrl(currentPage - 1, searchParams)} className="btn btn-secondary btn-sm">
          Previous
        </Link>
      )}

      {pages.map(p => (
        <Link
          key={p}
          href={buildPageUrl(p, searchParams)}
          className={`btn btn-sm ${p === currentPage ? '' : 'btn-secondary'}`}
          style={p === currentPage ? { pointerEvents: 'none' } : {}}
        >
          {p}
        </Link>
      ))}

      {currentPage < totalPages && (
        <Link href={buildPageUrl(currentPage + 1, searchParams)} className="btn btn-secondary btn-sm">
          Next
        </Link>
      )}
    </div>
  );
}
