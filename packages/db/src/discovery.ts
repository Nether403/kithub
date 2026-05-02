import { eq, sql, inArray, and, desc } from "drizzle-orm";
import * as schema from "./schema";
import {
  buildEmbeddingInput,
  cosineSimilarity,
  generateEmbedding,
  hashInput,
  isEmbeddingsEnabled,
  warnIfDisabled,
  EMBEDDING_MODEL_NAME,
} from "./embeddings";
import type { db as DbType } from "./index";

type Db = NonNullable<typeof DbType>;

// ── Embedding Storage ────────────────────────────────────────────

export async function upsertKitEmbedding(
  db: Db,
  args: {
    kitSlug: string;
    releaseId?: string | null;
    title: string;
    summary: string;
    tags: string[];
    body?: string;
  }
): Promise<{ status: "stored" | "skipped" | "unchanged" | "disabled"; reason?: string }> {
  if (!isEmbeddingsEnabled()) {
    warnIfDisabled("upsertKitEmbedding");
    return { status: "disabled" };
  }

  const input = buildEmbeddingInput(args);
  if (!input) return { status: "skipped", reason: "empty input" };

  const newHash = hashInput(input, EMBEDDING_MODEL_NAME);

  const [existing] = await db
    .select()
    .from(schema.kitEmbeddings)
    .where(eq(schema.kitEmbeddings.kitSlug, args.kitSlug))
    .limit(1);

  if (existing && existing.inputHash === newHash && existing.model === EMBEDDING_MODEL_NAME) {
    return { status: "unchanged" };
  }

  const result = await generateEmbedding(input);
  if (!result) return { status: "skipped", reason: "embedding generation returned null" };

  if (existing) {
    await db
      .update(schema.kitEmbeddings)
      .set({
        vector: result.vector,
        model: result.model,
        inputHash: result.inputHash,
        releaseId: args.releaseId ?? existing.releaseId,
      })
      .where(eq(schema.kitEmbeddings.kitSlug, args.kitSlug));
  } else {
    await db.insert(schema.kitEmbeddings).values({
      kitSlug: args.kitSlug,
      releaseId: args.releaseId ?? null,
      model: result.model,
      inputHash: result.inputHash,
      vector: result.vector,
    });
  }

  return { status: "stored" };
}

// ── Semantic Search ──────────────────────────────────────────────

export interface SemanticSearchHit {
  slug: string;
  similarity: number;
}

export async function semanticSearchKits(
  db: Db,
  query: string,
  options: { limit?: number; excludeSlug?: string } = {}
): Promise<{ hits: SemanticSearchHit[]; available: boolean }> {
  if (!isEmbeddingsEnabled()) {
    warnIfDisabled("semanticSearchKits");
    return { hits: [], available: false };
  }

  const trimmed = query.trim();
  if (!trimmed) return { hits: [], available: true };

  const queryEmbedding = await generateEmbedding(trimmed);
  if (!queryEmbedding) return { hits: [], available: false };

  const rows = await db
    .select({
      kitSlug: schema.kitEmbeddings.kitSlug,
      vector: schema.kitEmbeddings.vector,
    })
    .from(schema.kitEmbeddings)
    .innerJoin(schema.kits, eq(schema.kits.slug, schema.kitEmbeddings.kitSlug))
    .where(sql`${schema.kits.unpublishedAt} IS NULL`);

  const scored: SemanticSearchHit[] = [];
  for (const row of rows) {
    if (options.excludeSlug && row.kitSlug === options.excludeSlug) continue;
    const sim = cosineSimilarity(queryEmbedding.vector, row.vector);
    scored.push({ slug: row.kitSlug, similarity: sim });
  }
  scored.sort((a, b) => b.similarity - a.similarity);

  return { hits: scored.slice(0, options.limit ?? 20), available: true };
}

export async function getRelatedKits(
  db: Db,
  kitSlug: string,
  limit = 6
): Promise<{ hits: SemanticSearchHit[]; mode: "embedding" | "tags" | "none" }> {
  // Try embedding-based first
  const [target] = await db
    .select()
    .from(schema.kitEmbeddings)
    .where(eq(schema.kitEmbeddings.kitSlug, kitSlug))
    .limit(1);

  if (target && isEmbeddingsEnabled()) {
    const all = await db
      .select({ kitSlug: schema.kitEmbeddings.kitSlug, vector: schema.kitEmbeddings.vector })
      .from(schema.kitEmbeddings)
      .innerJoin(schema.kits, eq(schema.kits.slug, schema.kitEmbeddings.kitSlug))
      .where(sql`${schema.kits.unpublishedAt} IS NULL`);

    const scored: SemanticSearchHit[] = [];
    for (const row of all) {
      if (row.kitSlug === kitSlug) continue;
      scored.push({ slug: row.kitSlug, similarity: cosineSimilarity(target.vector, row.vector) });
    }
    scored.sort((a, b) => b.similarity - a.similarity);
    if (scored.length > 0) {
      return { hits: scored.slice(0, limit), mode: "embedding" };
    }
  }

  // Fallback: tag overlap
  const targetTags = await db
    .select({ tag: schema.kitTags.tag })
    .from(schema.kitTags)
    .where(eq(schema.kitTags.kitSlug, kitSlug));

  if (targetTags.length === 0) return { hits: [], mode: "none" };

  const tagList = targetTags.map((t) => t.tag);

  const overlap = await db
    .select({
      kitSlug: schema.kitTags.kitSlug,
      shared: sql<number>`count(*)`.as("shared"),
    })
    .from(schema.kitTags)
    .innerJoin(schema.kits, eq(schema.kits.slug, schema.kitTags.kitSlug))
    .where(
      and(
        inArray(schema.kitTags.tag, tagList),
        sql`${schema.kitTags.kitSlug} != ${kitSlug}`,
        sql`${schema.kits.unpublishedAt} IS NULL`
      )
    )
    .groupBy(schema.kitTags.kitSlug)
    .orderBy(sql`count(*) desc`)
    .limit(limit);

  return {
    hits: overlap.map((r) => ({ slug: r.kitSlug, similarity: Number(r.shared) / tagList.length })),
    mode: overlap.length > 0 ? "tags" : "none",
  };
}

// ── Ratings ──────────────────────────────────────────────────────

export interface RatingSummary {
  averageStars: number | null;
  ratingCount: number;
}

export async function getRatingsSummary(db: Db, kitSlug: string): Promise<RatingSummary> {
  const [row] = await db
    .select({
      avg: sql<number>`avg(${schema.kitRatings.stars})`,
      count: sql<number>`count(*)`,
    })
    .from(schema.kitRatings)
    .where(eq(schema.kitRatings.kitSlug, kitSlug));

  const count = Number(row?.count ?? 0);
  const avg = row?.avg !== null && row?.avg !== undefined ? Number(row.avg) : null;
  return {
    averageStars: avg !== null ? Math.round(avg * 10) / 10 : null,
    ratingCount: count,
  };
}

export async function batchFetchRatingsSummary(
  db: Db,
  kitSlugs: string[]
): Promise<Record<string, RatingSummary>> {
  const map: Record<string, RatingSummary> = {};
  if (kitSlugs.length === 0) return map;

  const rows = await db
    .select({
      kitSlug: schema.kitRatings.kitSlug,
      avg: sql<number>`avg(${schema.kitRatings.stars})`,
      count: sql<number>`count(*)`,
    })
    .from(schema.kitRatings)
    .where(inArray(schema.kitRatings.kitSlug, kitSlugs))
    .groupBy(schema.kitRatings.kitSlug);

  for (const r of rows) {
    const avg = r.avg !== null && r.avg !== undefined ? Number(r.avg) : null;
    map[r.kitSlug] = {
      averageStars: avg !== null ? Math.round(avg * 10) / 10 : null,
      ratingCount: Number(r.count),
    };
  }
  return map;
}

export async function listRatings(db: Db, kitSlug: string, limit = 50) {
  const rows = await db
    .select({
      id: schema.kitRatings.id,
      stars: schema.kitRatings.stars,
      body: schema.kitRatings.body,
      publisherName: schema.publisherProfiles.agentName,
      verifiedAt: schema.publisherProfiles.verifiedAt,
      createdAt: schema.kitRatings.createdAt,
      updatedAt: schema.kitRatings.updatedAt,
    })
    .from(schema.kitRatings)
    .innerJoin(
      schema.publisherProfiles,
      eq(schema.publisherProfiles.id, schema.kitRatings.publisherId)
    )
    .where(eq(schema.kitRatings.kitSlug, kitSlug))
    .orderBy(desc(schema.kitRatings.updatedAt))
    .limit(limit);

  return rows;
}

export async function upsertRating(
  db: Db,
  args: { kitSlug: string; userId: string; publisherId: string; stars: number; body?: string | null }
) {
  const [existing] = await db
    .select()
    .from(schema.kitRatings)
    .where(
      and(
        eq(schema.kitRatings.kitSlug, args.kitSlug),
        eq(schema.kitRatings.userId, args.userId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(schema.kitRatings)
      .set({
        stars: args.stars,
        body: args.body ?? null,
        publisherId: args.publisherId,
        updatedAt: new Date(),
      })
      .where(eq(schema.kitRatings.id, existing.id));
    return { id: existing.id, status: "updated" as const };
  }

  const id = crypto.randomUUID();
  await db.insert(schema.kitRatings).values({
    id,
    kitSlug: args.kitSlug,
    userId: args.userId,
    publisherId: args.publisherId,
    stars: args.stars,
    body: args.body ?? null,
  });
  return { id, status: "created" as const };
}

// ── Collections ──────────────────────────────────────────────────

export async function listCollections(db: Db) {
  const rows = await db
    .select()
    .from(schema.collections)
    .orderBy(desc(schema.collections.featured), desc(schema.collections.updatedAt));
  return rows;
}

export async function getCollection(db: Db, slug: string) {
  const [row] = await db
    .select()
    .from(schema.collections)
    .where(eq(schema.collections.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function upsertCollection(
  db: Db,
  args: {
    slug: string;
    title: string;
    description: string;
    curator?: string;
    emoji?: string;
    kitSlugs: string[];
    featured?: number;
  }
) {
  const [existing] = await db
    .select()
    .from(schema.collections)
    .where(eq(schema.collections.slug, args.slug))
    .limit(1);

  if (existing) {
    await db
      .update(schema.collections)
      .set({
        title: args.title,
        description: args.description,
        curator: args.curator ?? existing.curator,
        emoji: args.emoji ?? existing.emoji,
        kitSlugs: args.kitSlugs,
        featured: args.featured ?? existing.featured,
        updatedAt: new Date(),
      })
      .where(eq(schema.collections.slug, args.slug));
    return "updated" as const;
  }

  await db.insert(schema.collections).values({
    slug: args.slug,
    title: args.title,
    description: args.description,
    curator: args.curator ?? "SkillKitHub",
    emoji: args.emoji ?? "📦",
    kitSlugs: args.kitSlugs,
    featured: args.featured ?? 0,
  });
  return "created" as const;
}

// ── Verified Publisher Map (batch) ───────────────────────────────

export async function batchFetchPublisherVerified(
  db: Db,
  publisherIds: string[]
): Promise<Record<string, Date | null>> {
  const map: Record<string, Date | null> = {};
  if (publisherIds.length === 0) return map;

  const rows = await db
    .select({ id: schema.publisherProfiles.id, verifiedAt: schema.publisherProfiles.verifiedAt })
    .from(schema.publisherProfiles)
    .where(inArray(schema.publisherProfiles.id, publisherIds));
  for (const r of rows) map[r.id] = r.verifiedAt;
  return map;
}

// ── Scan Diff ────────────────────────────────────────────────────

export interface ScanFinding {
  type: "error" | "warning" | "tip";
  message: string;
  location?: string;
}

export interface ScanDiff {
  baseVersion: string | null;
  baseScore: number | null;
  headVersion: string;
  headScore: number | null;
  delta: number | null;
  added: ScanFinding[];
  removed: ScanFinding[];
  unchanged: ScanFinding[];
}

function findingKey(f: ScanFinding): string {
  return `${f.type}::${f.message}::${f.location ?? ""}`;
}

export function diffScans(args: {
  baseVersion: string | null;
  baseScore: number | null;
  baseFindings: ScanFinding[];
  headVersion: string;
  headScore: number | null;
  headFindings: ScanFinding[];
}): ScanDiff {
  const baseMap = new Map(args.baseFindings.map((f) => [findingKey(f), f]));
  const headMap = new Map(args.headFindings.map((f) => [findingKey(f), f]));

  const added: ScanFinding[] = [];
  const removed: ScanFinding[] = [];
  const unchanged: ScanFinding[] = [];

  for (const [key, f] of headMap) {
    if (baseMap.has(key)) unchanged.push(f);
    else added.push(f);
  }
  for (const [key, f] of baseMap) {
    if (!headMap.has(key)) removed.push(f);
  }

  const delta =
    args.baseScore !== null && args.headScore !== null
      ? args.headScore - args.baseScore
      : null;

  return {
    baseVersion: args.baseVersion,
    baseScore: args.baseScore,
    headVersion: args.headVersion,
    headScore: args.headScore,
    delta,
    added,
    removed,
    unchanged,
  };
}
