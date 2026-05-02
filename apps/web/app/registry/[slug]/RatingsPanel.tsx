"use client";

import { useEffect, useState } from "react";
import { Stars } from "../../components/Stars";
import { VerifiedBadge } from "../../components/VerifiedBadge";
import { getSupabaseAccessToken } from "../../../lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface Rating {
  id: string;
  stars: number;
  body: string | null;
  publisherName: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RatingsResponse {
  averageStars: number | null;
  ratingCount: number;
  ratings: Rating[];
}

export default function RatingsPanel({ slug }: { slug: string }) {
  const [data, setData] = useState<RatingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [stars, setStars] = useState(5);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/kits/${slug}/ratings`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void getSupabaseAccessToken().then((t) => setSignedIn(!!t));
  }, [slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const token = await getSupabaseAccessToken();
      if (!token) {
        setError("Sign in to leave a review.");
        return;
      }
      const res = await fetch(`${API_URL}/api/kits/${slug}/ratings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stars, body: body.trim() || undefined }),
      });
      const out = await res.json();
      if (!res.ok) {
        setError(out.message || "Failed to submit rating.");
        return;
      }
      setBody("");
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to submit rating.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-panel" id="ratings" style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
        <h3 style={{ fontSize: "1.1rem" }}>Ratings & Reviews</h3>
        <Stars value={data?.averageStars ?? null} count={data?.ratingCount} size="md" />
      </div>

      {signedIn ? (
        <form onSubmit={submit} style={{ marginBottom: "1.5rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Your rating:</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStars(n)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1.4rem",
                  color: n <= stars ? "#ffb340" : "var(--text-tertiary)",
                  padding: 0,
                  lineHeight: 1,
                }}
                aria-label={`${n} stars`}
              >
                {n <= stars ? "★" : "☆"}
              </button>
            ))}
          </div>
          <textarea
            className="input"
            placeholder="Optional: share what worked or what tripped you up…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={3}
            style={{ width: "100%", resize: "vertical", marginBottom: "0.5rem" }}
          />
          {error && (
            <p style={{ color: "var(--danger)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>{error}</p>
          )}
          <button type="submit" className="btn btn-sm" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Review"}
          </button>
        </form>
      ) : (
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
          <a href="/auth" style={{ color: "var(--accent)" }}>Sign in</a> to rate this kit.
        </p>
      )}

      {loading ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-tertiary)" }}>Loading reviews…</p>
      ) : !data || data.ratings.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-tertiary)" }}>No reviews yet — be the first.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {data.ratings.map((r) => (
            <div key={r.id} style={{ paddingBottom: "0.75rem", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                <a href={`/publishers/${r.publisherName}`} style={{ color: "var(--accent)", fontSize: "0.85rem" }}>
                  @{r.publisherName}
                </a>
                <VerifiedBadge verified={r.verified} />
                <span style={{ color: "#ffb340", fontSize: "0.9rem" }}>
                  {"★".repeat(r.stars)}
                  <span style={{ color: "var(--text-tertiary)" }}>{"☆".repeat(5 - r.stars)}</span>
                </span>
                <span style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", marginLeft: "auto" }}>
                  {new Date(r.updatedAt).toLocaleDateString()}
                </span>
              </div>
              {r.body && (
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                  {r.body}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
