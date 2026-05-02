import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, desc, ilike, sql, and, inArray } from "drizzle-orm";
import * as path from "path";
import * as schema from "./schema";

// ── Load .env from project root if env vars are not set ──────────
if (!process.env.DATABASE_URL && !process.env.PGHOST) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dotenv = require("dotenv");
    const rootEnv = path.resolve(__dirname, "../../../.env");
    dotenv.config({ path: rootEnv });
  } catch {
    // dotenv not available — ignore
  }
}

// ── Connection ────────────────────────────────────────────────────

const connectionString = process.env.DATABASE_URL;
const hasPgEnv = !!(process.env.PGHOST || process.env.PGDATABASE);

if (!connectionString && !hasPgEnv) {
  console.warn("[kithub/db] No database credentials found — database calls will fail at runtime");
}

// Detect Replit's internal Postgres (helium) which doesn't use TLS
const isReplitHelium = (connectionString ?? process.env.PGHOST ?? "").includes("helium");

let client: ReturnType<typeof postgres> | null = null;
if (connectionString) {
  client = postgres(connectionString, {
    max: 10,
    ssl: isReplitHelium ? false : (process.env.NODE_ENV === "production" ? "require" : false),
  });
} else if (hasPgEnv) {
  client = postgres({
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT ?? "5432"),
    database: process.env.PGDATABASE,
    username: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    max: 10,
    ssl: isReplitHelium ? false : "require",
  });
}

export const db = client ? drizzle(client, { schema }) : null;

// ── Shared Types ──────────────────────────────────────────────────

export interface EnrichedKit {
  slug: string;
  title: string;
  summary: string;
  version: string;
  installs: number;
  tags: string[];
  score: number | null;
  averageStars?: number | null;
  ratingCount?: number;
  updatedAt: Date;
}

export interface EnrichedKitWithPublisher extends EnrichedKit {
  publisherId: string;
  publisherName: string | null;
  publisherVerifiedAt?: Date | null;
  createdAt: Date;
}

export interface PaginatedResult<T> {
  kits: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Simple Query Helpers ──────────────────────────────────────────

export async function getKitBySlug(slug: string) {
  if (!db) throw new Error("Database not connected");
  const [kit] = await db.select().from(schema.kits).where(eq(schema.kits.slug, slug)).limit(1);
  return kit ?? null;
}

export async function getLatestRelease(kitSlug: string) {
  if (!db) throw new Error("Database not connected");
  const [rel] = await db
    .select()
    .from(schema.kitReleases)
    .where(eq(schema.kitReleases.kitSlug, kitSlug))
    .orderBy(desc(schema.kitReleases.createdAt))
    .limit(1);
  return rel ?? null;
}

export async function getKitTags(kitSlug: string) {
  if (!db) throw new Error("Database not connected");
  return db.select().from(schema.kitTags).where(eq(schema.kitTags.kitSlug, kitSlug));
}

export async function getInstallCount(kitSlug: string): Promise<number> {
  if (!db) throw new Error("Database not connected");
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.kitInstallEvents)
    .where(eq(schema.kitInstallEvents.kitSlug, kitSlug));
  return Number(result?.count ?? 0);
}

export async function getViewCount(kitSlug: string): Promise<number> {
  if (!db) throw new Error("Database not connected");
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.kitViewEvents)
    .where(eq(schema.kitViewEvents.kitSlug, kitSlug));
  return Number(result?.count ?? 0);
}

export async function getLearningsCount(kitSlug: string): Promise<number> {
  if (!db) throw new Error("Database not connected");
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.learnings)
    .where(eq(schema.learnings.kitSlug, kitSlug));
  return Number(result?.count ?? 0);
}

export async function getLatestScan(releaseId: string) {
  if (!db) throw new Error("Database not connected");
  const [scan] = await db
    .select()
    .from(schema.kitReleaseScans)
    .where(eq(schema.kitReleaseScans.releaseId, releaseId))
    .orderBy(desc(schema.kitReleaseScans.createdAt))
    .limit(1);
  return scan ?? null;
}

// ── Enriched Kit Loader (single-slug) ────────────────────────────
// Used for detail pages: fetches all related data in 3 parallel queries.

export async function getEnrichedKitBySlug(slug: string): Promise<EnrichedKitWithPublisher | null> {
  if (!db) throw new Error("Database not connected");

  const [kit] = await db
    .select()
    .from(schema.kits)
    .where(eq(schema.kits.slug, slug))
    .limit(1);

  if (!kit) return null;

  const [latestRelease, tags, installCount, publisher] = await Promise.all([
    getLatestRelease(slug),
    getKitTags(slug),
    getInstallCount(slug),
    db.select().from(schema.publisherProfiles)
      .where(eq(schema.publisherProfiles.id, kit.publisherId))
      .limit(1)
      .then(rows => rows[0] ?? null),
  ]);

  const [scan, ratingSummary] = await Promise.all([
    latestRelease ? getLatestScan(latestRelease.id) : Promise.resolve(null),
    (await import("./discovery.js")).getRatingsSummary(db, slug),
  ]);

  return {
    slug: kit.slug,
    title: kit.title,
    summary: kit.summary,
    publisherId: kit.publisherId,
    publisherName: publisher?.agentName ?? null,
    publisherVerifiedAt: publisher?.verifiedAt ?? null,
    version: latestRelease?.version ?? "0.0.0",
    installs: installCount,
    tags: tags.map(t => t.tag),
    score: scan?.score ?? null,
    averageStars: ratingSummary.averageStars,
    ratingCount: ratingSummary.ratingCount,
    updatedAt: kit.updatedAt,
    createdAt: kit.createdAt,
  };
}

// ── Batch Enrichment Helpers ──────────────────────────────────────
// These fetch all related data for a set of slugs in bulk, then map
// results back — avoiding N+1 queries entirely.

async function batchFetchLatestReleases(slugs: string[]): Promise<Record<string, { version: string; id: string }>> {
  if (!db || slugs.length === 0) return {};

  // Use a DISTINCT ON query to get the latest release per kit
  const rows = await db.execute(sql`
    SELECT DISTINCT ON (kit_slug) kit_slug, id, version
    FROM ${schema.kitReleases}
    WHERE kit_slug = ANY(ARRAY[${sql.join(slugs.map(s => sql`${s}`), sql`, `)}]::text[])
    ORDER BY kit_slug, created_at DESC
  `);

  const map: Record<string, { version: string; id: string }> = {};
  for (const row of rows as unknown as { kit_slug: string; id: string; version: string }[]) {
    map[row.kit_slug] = { version: row.version, id: row.id };
  }
  return map;
}

async function batchFetchInstallCounts(slugs: string[]): Promise<Record<string, number>> {
  if (!db || slugs.length === 0) return {};

  const rows = await db
    .select({
      kitSlug: schema.kitInstallEvents.kitSlug,
      count: sql<number>`count(*)`,
    })
    .from(schema.kitInstallEvents)
    .where(inArray(schema.kitInstallEvents.kitSlug, slugs))
    .groupBy(schema.kitInstallEvents.kitSlug);

  const map: Record<string, number> = {};
  for (const row of rows) {
    map[row.kitSlug] = Number(row.count);
  }
  return map;
}

async function batchFetchTags(slugs: string[]): Promise<Record<string, string[]>> {
  if (!db || slugs.length === 0) return {};

  const rows = await db
    .select({ kitSlug: schema.kitTags.kitSlug, tag: schema.kitTags.tag })
    .from(schema.kitTags)
    .where(inArray(schema.kitTags.kitSlug, slugs));

  const map: Record<string, Set<string>> = {};
  for (const row of rows) {
    if (!map[row.kitSlug]) map[row.kitSlug] = new Set();
    map[row.kitSlug]!.add(row.tag);
  }
  const out: Record<string, string[]> = {};
  for (const slug of Object.keys(map)) out[slug] = Array.from(map[slug]!);
  return out;
}

async function batchFetchLatestScores(releaseIds: string[]): Promise<Record<string, number | null>> {
  if (!db || releaseIds.length === 0) return {};

  const rows = await db.execute(sql`
    SELECT DISTINCT ON (release_id) release_id, score
    FROM ${schema.kitReleaseScans}
    WHERE release_id = ANY(ARRAY[${sql.join(releaseIds.map(id => sql`${id}`), sql`, `)}]::text[])
    ORDER BY release_id, created_at DESC
  `);

  const map: Record<string, number | null> = {};
  for (const row of rows as unknown as { release_id: string; score: number | null }[]) {
    map[row.release_id] = row.score;
  }
  return map;
}

async function batchFetchPublishers(publisherIds: string[]): Promise<Record<string, string>> {
  if (!db || publisherIds.length === 0) return {};

  const rows = await db
    .select({ id: schema.publisherProfiles.id, agentName: schema.publisherProfiles.agentName })
    .from(schema.publisherProfiles)
    .where(inArray(schema.publisherProfiles.id, publisherIds));

  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.id] = row.agentName;
  }
  return map;
}

// ── searchKitsPaginated (Phase 2 — SQL-first) ────────────────────
// Now does pagination at the database level, not in memory.
// Tag filtering also happens in SQL via a JOIN.

export async function searchKitsPaginated(options: {
  query?: string;
  tag?: string;
  sort?: "installs" | "score" | "newest";
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<EnrichedKitWithPublisher>> {
  if (!db) throw new Error("Database not connected");

  const { query, tag, sort = "newest", page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  // Build WHERE conditions
  const conditions = [sql`${schema.kits.unpublishedAt} IS NULL`];
  if (query) {
    conditions.push(
      sql`(${ilike(schema.kits.title, `%${query}%`)} OR ${ilike(schema.kits.summary, `%${query}%`)})`
    );
  }

  // Count total (respects same filters)
  let countQuery = db
    .select({ count: sql<number>`count(distinct ${schema.kits.slug})` })
    .from(schema.kits)
    .$dynamic();

  if (tag) {
    countQuery = countQuery.innerJoin(
      schema.kitTags,
      and(
        eq(schema.kitTags.kitSlug, schema.kits.slug),
        eq(schema.kitTags.tag, tag)
      )
    );
  }
  countQuery = countQuery.where(and(...conditions));
  const countResult = await countQuery;
  const total = Number(countResult[0]?.count ?? 0);

  if (total === 0) {
    return { kits: [], total: 0, page, limit, totalPages: 0 };
  }

  // Fetch the kit slugs for this page using SQL ORDER BY
  // We join the install count subquery for sort-by-installs
  let kitsQuery = db
    .select({ slug: schema.kits.slug })
    .from(schema.kits)
    .$dynamic();

  if (tag) {
    kitsQuery = kitsQuery.innerJoin(
      schema.kitTags,
      and(
        eq(schema.kitTags.kitSlug, schema.kits.slug),
        eq(schema.kitTags.tag, tag)
      )
    );
  }

  kitsQuery = kitsQuery.where(and(...conditions));

  if (sort === "newest") {
    kitsQuery = kitsQuery.orderBy(desc(schema.kits.updatedAt));
  } else {
    // For installs/score sorts: fetch IDs and sort in memory after enrichment
    kitsQuery = kitsQuery.orderBy(desc(schema.kits.updatedAt));
  }

  // For newest sort, apply DB-level pagination
  const needsInMemorySort = sort === "installs" || sort === "score";
  if (!needsInMemorySort) {
    kitsQuery = kitsQuery.limit(limit).offset(offset);
  }

  const kitRows = await kitsQuery;
  const slugs = [...new Set(kitRows.map(r => r.slug))];

  if (slugs.length === 0) {
    return { kits: [], total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Fetch all related data in 5 parallel batch queries (no N+1)
  const [releaseMap, installMap, tagMap, rawKits] = await Promise.all([
    batchFetchLatestReleases(slugs),
    batchFetchInstallCounts(slugs),
    batchFetchTags(slugs),
    db.select().from(schema.kits).where(inArray(schema.kits.slug, slugs)),
  ]);

  const releaseIds = Object.values(releaseMap).map(r => r.id);
  const publisherIds = [...new Set(rawKits.map(k => k.publisherId))];
  const [scoremap, publisherMap, ratingMap, verifiedMap] = await Promise.all([
    batchFetchLatestScores(releaseIds),
    batchFetchPublishers(publisherIds),
    (await import("./discovery.js")).batchFetchRatingsSummary(db, slugs),
    (await import("./discovery.js")).batchFetchPublisherVerified(db, publisherIds),
  ]);

  const enriched: EnrichedKitWithPublisher[] = rawKits.map(kit => {
    const release = releaseMap[kit.slug];
    const rating = ratingMap[kit.slug] ?? { averageStars: null, ratingCount: 0 };
    return {
      slug: kit.slug,
      title: kit.title,
      summary: kit.summary,
      publisherId: kit.publisherId,
      publisherName: publisherMap[kit.publisherId] ?? null,
      publisherVerifiedAt: verifiedMap[kit.publisherId] ?? null,
      version: release?.version ?? "0.0.0",
      installs: installMap[kit.slug] ?? 0,
      tags: tagMap[kit.slug] ?? [],
      score: release ? (scoremap[release.id] ?? null) : null,
      averageStars: rating.averageStars,
      ratingCount: rating.ratingCount,
      updatedAt: kit.updatedAt,
      createdAt: kit.createdAt,
    };
  });

  // Apply in-memory sorting for installs/score (requires count data)
  if (sort === "installs") {
    enriched.sort((a, b) => b.installs - a.installs);
  } else if (sort === "score") {
    enriched.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  // For in-memory sorts, slice after sorting
  const finalKits = needsInMemorySort ? enriched.slice(offset, offset + limit) : enriched;

  return {
    kits: finalKits,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ── getTrendingKits (Phase 2 — batch queries) ────────────────────

export interface TrendingKit extends EnrichedKit {
  publisherName: string | null;
  publisherVerifiedAt?: Date | null;
}

export async function getTrendingKits(count = 3): Promise<TrendingKit[]> {
  if (!db) throw new Error("Database not connected");

  // Get top N by install count using a subquery
  const rows = await db.execute(sql`
    SELECT k.slug, k.title, k.summary, k.publisher_id, k.updated_at,
           COUNT(e.id)::int AS install_count
    FROM ${schema.kits} k
    LEFT JOIN ${schema.kitInstallEvents} e ON e.kit_slug = k.slug
    WHERE k.unpublished_at IS NULL
    GROUP BY k.slug
    ORDER BY install_count DESC
    LIMIT ${count * 3}
  `);

  type TrendingRow = {
    slug: string; title: string; summary: string;
    publisher_id: string; updated_at: Date; install_count: number;
  };
  const trendingRows = rows as unknown as TrendingRow[];
  const slugs = trendingRows.map(r => r.slug);

  if (slugs.length === 0) return [];

  const publisherIds = [...new Set(trendingRows.map(r => r.publisher_id))];
  const [releaseMap, tagMap, publisherMap, ratingMap, verifiedMap] = await Promise.all([
    batchFetchLatestReleases(slugs),
    batchFetchTags(slugs),
    batchFetchPublishers(publisherIds),
    (await import("./discovery.js")).batchFetchRatingsSummary(db, slugs),
    (await import("./discovery.js")).batchFetchPublisherVerified(db, publisherIds),
  ]);

  const releaseIds = Object.values(releaseMap).map(r => r.id);
  const scoremap = await batchFetchLatestScores(releaseIds);

  return trendingRows.slice(0, count).map(row => {
    const release = releaseMap[row.slug];
    const rating = ratingMap[row.slug] ?? { averageStars: null, ratingCount: 0 };
    return {
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      publisherName: publisherMap[row.publisher_id] ?? null,
      publisherVerifiedAt: verifiedMap[row.publisher_id] ?? null,
      version: release?.version ?? "0.0.0",
      installs: Number(row.install_count),
      tags: tagMap[row.slug] ?? [],
      score: release ? (scoremap[release.id] ?? null) : null,
      averageStars: rating.averageStars,
      ratingCount: rating.ratingCount,
      updatedAt: row.updated_at,
    };
  });
}

// ── getKitsByPublisherId (Phase 2 — batch queries) ───────────────

export async function getKitsByPublisherId(publisherId: string, options?: {
  sort?: "installs" | "score" | "newest";
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<EnrichedKit>> {
  if (!db) throw new Error("Database not connected");
  const { sort = "newest", page = 1, limit = 100 } = options ?? {};

  const kits = await db
    .select()
    .from(schema.kits)
    .where(and(
      eq(schema.kits.publisherId, publisherId),
      sql`${schema.kits.unpublishedAt} IS NULL`
    ))
    .orderBy(desc(schema.kits.updatedAt));

  if (kits.length === 0) {
    return { kits: [], total: 0, page, limit, totalPages: 0 };
  }

  const slugs = kits.map(k => k.slug);

  const [releaseMap, installMap, tagMap] = await Promise.all([
    batchFetchLatestReleases(slugs),
    batchFetchInstallCounts(slugs),
    batchFetchTags(slugs),
  ]);

  const releaseIds = Object.values(releaseMap).map(r => r.id);
  const [scoremap, ratingMap] = await Promise.all([
    batchFetchLatestScores(releaseIds),
    (await import("./discovery.js")).batchFetchRatingsSummary(db, slugs),
  ]);

  const enriched: EnrichedKit[] = kits.map(kit => {
    const release = releaseMap[kit.slug];
    const rating = ratingMap[kit.slug] ?? { averageStars: null, ratingCount: 0 };
    return {
      slug: kit.slug,
      title: kit.title,
      summary: kit.summary,
      version: release?.version ?? "0.0.0",
      installs: installMap[kit.slug] ?? 0,
      tags: tagMap[kit.slug] ?? [],
      score: release ? (scoremap[release.id] ?? null) : null,
      averageStars: rating.averageStars,
      ratingCount: rating.ratingCount,
      updatedAt: kit.updatedAt,
    };
  });

  if (sort === "installs") enriched.sort((a, b) => b.installs - a.installs);
  else if (sort === "score") enriched.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const offset = (page - 1) * limit;
  return {
    kits: enriched.slice(offset, offset + limit),
    total: enriched.length,
    page,
    limit,
    totalPages: Math.ceil(enriched.length / limit),
  };
}

// ── getAllReleases (Phase 2 — single batch scan query) ────────────

export async function getAllReleases(kitSlug: string) {
  if (!db) throw new Error("Database not connected");

  const releases = await db
    .select()
    .from(schema.kitReleases)
    .where(eq(schema.kitReleases.kitSlug, kitSlug))
    .orderBy(desc(schema.kitReleases.createdAt));

  if (releases.length === 0) return [];

  // Batch fetch all scans in one query
  const releaseIds = releases.map(r => r.id);
  const scanRows = await db.execute(sql`
    SELECT DISTINCT ON (release_id) release_id, score, status, findings
    FROM ${schema.kitReleaseScans}
    WHERE release_id = ANY(ARRAY[${sql.join(releaseIds.map(id => sql`${id}`), sql`, `)}]::text[])
    ORDER BY release_id, created_at DESC
  `);

  type ScanRow = { release_id: string; score: number | null; status: string; findings: unknown };
  const scanMap: Record<string, ScanRow> = {};
  for (const row of scanRows as unknown as ScanRow[]) {
    scanMap[row.release_id] = row;
  }

  return releases.map(rel => ({
    id: rel.id,
    version: rel.version,
    conformanceLevel: rel.conformanceLevel,
    rawMarkdown: rel.rawMarkdown,
    createdAt: rel.createdAt,
    scan: scanMap[rel.id]
      ? { score: scanMap[rel.id]!.score, status: scanMap[rel.id]!.status, findings: scanMap[rel.id]!.findings }
      : null,
  }));
}

// ── searchSkills (Phase 2 — SQL filtering, batch tag lookup) ─────

export async function searchSkills(query?: string, tag?: string) {
  if (!db) throw new Error("Database not connected");

  const conditions = [];
  if (query) {
    conditions.push(
      sql`(${ilike(schema.skills.title, `%${query}%`)} OR ${ilike(schema.skills.summary, `%${query}%`)})`
    );
  }

  // When filtering by tag, do a SQL-level EXISTS check to avoid the Drizzle
  // dynamic-join type-widening issue.
  type SkillRow = typeof schema.skills.$inferSelect;
  let results: SkillRow[];
  if (tag) {
    results = await db
      .select()
      .from(schema.skills)
      .where(
        and(
          ...(conditions.length > 0 ? conditions : []),
          sql`EXISTS (
            SELECT 1 FROM ${schema.skillTags}
            WHERE ${schema.skillTags.skillSlug} = ${schema.skills.slug}
            AND lower(${schema.skillTags.tag}) = lower(${tag})
          )`
        )
      )
      .orderBy(desc(schema.skills.installCount));
  } else {
    results = await db
      .select()
      .from(schema.skills)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.skills.installCount));
  }
  const slugs = [...new Set(results.map(s => s.slug))];

  if (slugs.length === 0) return [];

  const [tagRows, publisherIds] = [
    await db.select().from(schema.skillTags).where(inArray(schema.skillTags.skillSlug, slugs)),
    [...new Set(results.map(s => s.publisherId))],
  ];

  const tagMap: Record<string, string[]> = {};
  for (const t of tagRows) {
    if (!tagMap[t.skillSlug]) tagMap[t.skillSlug] = [];
    tagMap[t.skillSlug]!.push(t.tag);
  }

  const publisherMap = await batchFetchPublishers(publisherIds);

  return results.map(s => ({
    slug: s.slug,
    title: s.title,
    emoji: s.emoji,
    category: s.category,
    summary: s.summary,
    installCount: s.installCount,
    tags: tagMap[s.slug] ?? [],
    publisherName: publisherMap[s.publisherId] ?? null,
    updatedAt: s.updatedAt,
  }));
}

export async function getSkillBySlug(slug: string) {
  if (!db) throw new Error("Database not connected");
  const [skill] = await db.select().from(schema.skills).where(eq(schema.skills.slug, slug)).limit(1);
  if (!skill) return null;

  const [tags, publisher] = await Promise.all([
    db.select().from(schema.skillTags).where(eq(schema.skillTags.skillSlug, slug)),
    db.select().from(schema.publisherProfiles)
      .where(eq(schema.publisherProfiles.id, skill.publisherId))
      .limit(1)
      .then(rows => rows[0] ?? null),
  ]);

  return {
    slug: skill.slug,
    title: skill.title,
    emoji: skill.emoji,
    category: skill.category,
    summary: skill.summary,
    description: skill.description,
    installCount: skill.installCount,
    tags: tags.map(t => t.tag),
    publisherName: publisher?.agentName ?? null,
    createdAt: skill.createdAt,
    updatedAt: skill.updatedAt,
  };
}

// ── Misc Query Helpers ────────────────────────────────────────────

export async function getPublisherByAgentName(agentName: string) {
  if (!db) throw new Error("Database not connected");
  const [publisher] = await db
    .select()
    .from(schema.publisherProfiles)
    .where(eq(schema.publisherProfiles.agentName, agentName))
    .limit(1);
  return publisher ?? null;
}

export async function getPublisherByKitSlug(kitSlug: string) {
  if (!db) throw new Error("Database not connected");

  // Single JOIN query instead of 3 sequential queries
  const [result] = await db
    .select({
      publisher: schema.publisherProfiles,
      user: schema.users,
    })
    .from(schema.kits)
    .innerJoin(schema.publisherProfiles, eq(schema.publisherProfiles.id, schema.kits.publisherId))
    .innerJoin(schema.users, eq(schema.users.id, schema.publisherProfiles.userId))
    .where(eq(schema.kits.slug, kitSlug))
    .limit(1);

  return result ?? null;
}

export async function wasNotifiedRecently(
  publisherId: string,
  kitSlug: string,
  type: string,
  windowMs: number = 24 * 60 * 60 * 1000
): Promise<boolean> {
  if (!db) throw new Error("Database not connected");
  const cutoff = new Date(Date.now() - windowMs);
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.notificationLogs)
    .where(
      and(
        eq(schema.notificationLogs.publisherId, publisherId),
        eq(schema.notificationLogs.kitSlug, kitSlug),
        eq(schema.notificationLogs.type, type),
        sql`${schema.notificationLogs.sentAt} > ${cutoff}`
      )
    );
  return Number(result?.count ?? 0) > 0;
}

export async function recordNotification(
  publisherId: string,
  kitSlug: string,
  type: string
): Promise<void> {
  if (!db) throw new Error("Database not connected");
  await db.insert(schema.notificationLogs).values({ publisherId, kitSlug, type });
}

export async function getDailyInstalls(kitSlug: string, days: number = 30) {
  if (!db) throw new Error("Database not connected");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString();

  const rows = await db
    .select({
      date: sql<string>`date(${schema.kitInstallEvents.createdAt})`,
      count: sql<number>`count(*)`,
    })
    .from(schema.kitInstallEvents)
    .where(
      and(
        eq(schema.kitInstallEvents.kitSlug, kitSlug),
        sql`${schema.kitInstallEvents.createdAt} >= ${cutoffStr}::timestamp`
      )
    )
    .groupBy(sql`date(${schema.kitInstallEvents.createdAt})`)
    .orderBy(sql`date(${schema.kitInstallEvents.createdAt})`);

  return rows.map(r => ({ date: String(r.date), count: Number(r.count) }));
}

export async function getDailyViews(kitSlug: string, days: number = 30) {
  if (!db) throw new Error("Database not connected");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString();

  const rows = await db
    .select({
      date: sql<string>`date(${schema.kitViewEvents.createdAt})`,
      count: sql<number>`count(*)`,
    })
    .from(schema.kitViewEvents)
    .where(
      and(
        eq(schema.kitViewEvents.kitSlug, kitSlug),
        sql`${schema.kitViewEvents.createdAt} >= ${cutoffStr}::timestamp`
      )
    )
    .groupBy(sql`date(${schema.kitViewEvents.createdAt})`)
    .orderBy(sql`date(${schema.kitViewEvents.createdAt})`);

  return rows.map(r => ({ date: String(r.date), count: Number(r.count) }));
}

export async function getInstallsByTarget(kitSlug: string) {
  if (!db) throw new Error("Database not connected");
  const rows = await db
    .select({
      target: schema.kitInstallEvents.target,
      count: sql<number>`count(*)`,
    })
    .from(schema.kitInstallEvents)
    .where(eq(schema.kitInstallEvents.kitSlug, kitSlug))
    .groupBy(schema.kitInstallEvents.target)
    .orderBy(sql`count(*) desc`);

  return rows.map(r => ({ target: r.target, count: Number(r.count) }));
}

// ── Health Check ─────────────────────────────────────────────────

export async function healthCheck(): Promise<boolean> {
  if (!db) return false;
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}

// ── Re-exports for route files that import from this package ─────

// Remove getPublisherNameMap — it's no longer needed externally since
// all enrichment now goes through batch helpers. Keep it internal as
// batchFetchPublishers handles this use case more efficiently.

export { schema, eq, desc, ilike, sql, and, inArray };

export {
  isEmbeddingsEnabled,
  warnIfDisabled as warnEmbeddingsDisabled,
  buildEmbeddingInput,
  generateEmbedding,
  cosineSimilarity,
  EMBEDDING_MODEL_NAME,
  EMBEDDING_DIMENSIONS,
} from "./embeddings";

export {
  upsertKitEmbedding,
  semanticSearchKits,
  getRelatedKits,
  getRatingsSummary,
  batchFetchRatingsSummary,
  listRatings,
  upsertRating,
  listCollections,
  getCollection,
  upsertCollection,
  batchFetchPublisherVerified,
  diffScans,
} from "./discovery";

export type { SemanticSearchHit, RatingSummary, ScanFinding, ScanDiff } from "./discovery";

// Public batch helper — needed by route layer for collections enrichment.
export async function batchFetchKitsBySlugs(slugs: string[]) {
  if (!db) throw new Error("Database not connected");
  if (slugs.length === 0) return [];

  const rawKits = await db.select().from(schema.kits).where(inArray(schema.kits.slug, slugs));
  const publishedKits = rawKits.filter((k) => !k.unpublishedAt);
  const publishedSlugs = publishedKits.map((k) => k.slug);

  if (publishedSlugs.length === 0) return [];

  const [releaseMap, installMap, tagMap, publisherIds] = [
    await batchFetchLatestReleases(publishedSlugs),
    await batchFetchInstallCounts(publishedSlugs),
    await batchFetchTags(publishedSlugs),
    [...new Set(publishedKits.map((k) => k.publisherId))],
  ];

  const releaseIds = Object.values(releaseMap).map((r) => r.id);
  const [scoremap, publisherMap, ratingMap, verifiedMap] = await Promise.all([
    batchFetchLatestScores(releaseIds),
    batchFetchPublishers(publisherIds),
    (await import("./discovery.js")).batchFetchRatingsSummary(db, publishedSlugs),
    (await import("./discovery.js")).batchFetchPublisherVerified(db, publisherIds),
  ]);

  return publishedKits.map((kit) => {
    const release = releaseMap[kit.slug];
    const rating = ratingMap[kit.slug] ?? { averageStars: null, ratingCount: 0 };
    return {
      slug: kit.slug,
      title: kit.title,
      summary: kit.summary,
      publisherId: kit.publisherId,
      publisherName: publisherMap[kit.publisherId] ?? null,
      publisherVerifiedAt: verifiedMap[kit.publisherId] ?? null,
      version: release?.version ?? "0.0.0",
      installs: installMap[kit.slug] ?? 0,
      tags: tagMap[kit.slug] ?? [],
      score: release ? (scoremap[release.id] ?? null) : null,
      averageStars: rating.averageStars,
      ratingCount: rating.ratingCount,
      updatedAt: kit.updatedAt,
      createdAt: kit.createdAt,
    };
  });
}
