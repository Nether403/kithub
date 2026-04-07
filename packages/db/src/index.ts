import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, desc, ilike, sql, and } from "drizzle-orm";
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

let client: ReturnType<typeof postgres> | null = null;
if (connectionString) {
  client = postgres(connectionString, { max: 10 });
} else if (hasPgEnv) {
  client = postgres({
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT ?? "5432"),
    database: process.env.PGDATABASE,
    username: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    max: 10,
    ssl: "require",
  });
}

export const db = client ? drizzle(client, { schema }) : null;

// ── Shared Types ──────────────────────────────────────────────

export interface EnrichedKit {
  slug: string;
  title: string;
  summary: string;
  version: string;
  installs: number;
  tags: string[];
  score: number | null;
  updatedAt: Date;
}

export interface EnrichedKitWithPublisher extends EnrichedKit {
  publisherId: string;
  publisherName: string | null;
  createdAt: Date;
}

export interface PaginatedResult<T> {
  kits: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Query Helpers ─────────────────────────────────────────────────

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

export async function searchKits(query?: string, tag?: string) {
  if (!db) throw new Error("Database not connected");

  const conditions = [sql`${schema.kits.unpublishedAt} IS NULL`];

  if (query) {
    conditions.push(ilike(schema.kits.title, `%${query}%`));
  }

  let q = db.select().from(schema.kits).where(and(...conditions)).$dynamic();

  return q.orderBy(desc(schema.kits.updatedAt)).limit(50);
}

export async function getPublisherNameMap() {
  if (!db) throw new Error("Database not connected");
  const publishers = await db.select().from(schema.publisherProfiles);
  const map: Record<string, string> = {};
  for (const p of publishers) {
    map[p.id] = p.agentName;
  }
  return map;
}

function sortEnrichedKits<T extends EnrichedKit>(kits: T[], sort: "installs" | "score" | "newest"): void {
  if (sort === "installs") {
    kits.sort((a, b) => b.installs - a.installs);
  } else if (sort === "score") {
    kits.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  } else {
    kits.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
}

function paginateResults<T>(items: T[], page: number, limit: number): PaginatedResult<T> {
  const offset = (page - 1) * limit;
  const total = items.length;
  return {
    kits: items.slice(offset, offset + limit),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function searchKitsPaginated(options: {
  query?: string;
  tag?: string;
  sort?: "installs" | "score" | "newest";
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<EnrichedKitWithPublisher>> {
  if (!db) throw new Error("Database not connected");

  const { query, tag, sort = "newest", page = 1, limit = 20 } = options;

  const conditions = [sql`${schema.kits.unpublishedAt} IS NULL`];
  if (query) {
    conditions.push(ilike(schema.kits.title, `%${query}%`));
  }

  const allKits = await db.select().from(schema.kits).where(and(...conditions));
  const publisherMap = await getPublisherNameMap();

  const enriched: EnrichedKitWithPublisher[] = await Promise.all(
    allKits.map(async (kit) => {
      const release = await getLatestRelease(kit.slug);
      const tags = await getKitTags(kit.slug);
      const installs = await getInstallCount(kit.slug);
      const scan = release ? await getLatestScan(release.id) : null;

      return {
        slug: kit.slug,
        title: kit.title,
        summary: kit.summary,
        publisherId: kit.publisherId,
        publisherName: publisherMap[kit.publisherId] ?? null,
        version: release?.version ?? "0.0.0",
        installs,
        tags: tags.map(t => t.tag),
        score: scan?.score ?? null,
        updatedAt: kit.updatedAt,
        createdAt: kit.createdAt,
      };
    })
  );

  if (tag) {
    const filtered = enriched.filter(k => k.tags.includes(tag));
    enriched.length = 0;
    enriched.push(...filtered);
  }

  sortEnrichedKits(enriched, sort);
  return paginateResults(enriched, page, limit);
}

export interface TrendingKit extends EnrichedKit {
  publisherName: string | null;
}

export async function getTrendingKits(count = 3): Promise<TrendingKit[]> {
  if (!db) throw new Error("Database not connected");

  const allKits = await db.select().from(schema.kits).where(sql`${schema.kits.unpublishedAt} IS NULL`);
  const publisherMap = await getPublisherNameMap();

  const enriched: TrendingKit[] = await Promise.all(
    allKits.map(async (kit) => {
      const release = await getLatestRelease(kit.slug);
      const tags = await getKitTags(kit.slug);
      const installs = await getInstallCount(kit.slug);
      const scan = release ? await getLatestScan(release.id) : null;

      return {
        slug: kit.slug,
        title: kit.title,
        summary: kit.summary,
        publisherName: publisherMap[kit.publisherId] ?? null,
        version: release?.version ?? "0.0.0",
        installs,
        tags: tags.map(t => t.tag),
        score: scan?.score ?? null,
        updatedAt: kit.updatedAt,
      };
    })
  );

  sortEnrichedKits(enriched, "installs");
  return enriched.slice(0, count);
}

export async function getPublisherByAgentName(agentName: string) {
  if (!db) throw new Error("Database not connected");
  const [publisher] = await db
    .select()
    .from(schema.publisherProfiles)
    .where(eq(schema.publisherProfiles.agentName, agentName))
    .limit(1);
  return publisher ?? null;
}

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
    ));

  const enriched: EnrichedKit[] = await Promise.all(
    kits.map(async (kit) => {
      const release = await getLatestRelease(kit.slug);
      const tags = await getKitTags(kit.slug);
      const installs = await getInstallCount(kit.slug);
      const scan = release ? await getLatestScan(release.id) : null;

      return {
        slug: kit.slug,
        title: kit.title,
        summary: kit.summary,
        version: release?.version ?? "0.0.0",
        installs,
        tags: tags.map(t => t.tag),
        score: scan?.score ?? null,
        updatedAt: kit.updatedAt,
      };
    })
  );

  sortEnrichedKits(enriched, sort);
  return paginateResults(enriched, page, limit);
}

export async function getPublisherByKitSlug(kitSlug: string) {
  if (!db) throw new Error("Database not connected");
  const [kit] = await db.select().from(schema.kits).where(eq(schema.kits.slug, kitSlug)).limit(1);
  if (!kit) return null;
  const [publisher] = await db
    .select()
    .from(schema.publisherProfiles)
    .where(eq(schema.publisherProfiles.id, kit.publisherId))
    .limit(1);
  if (!publisher) return null;
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, publisher.userId))
    .limit(1);
  return user ? { publisher, user } : null;
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

export async function getAllReleases(kitSlug: string) {
  if (!db) throw new Error("Database not connected");
  const releases = await db
    .select()
    .from(schema.kitReleases)
    .where(eq(schema.kitReleases.kitSlug, kitSlug))
    .orderBy(desc(schema.kitReleases.createdAt));

  const enriched = await Promise.all(
    releases.map(async (rel) => {
      const scan = await getLatestScan(rel.id);
      return {
        id: rel.id,
        version: rel.version,
        conformanceLevel: rel.conformanceLevel,
        rawMarkdown: rel.rawMarkdown,
        createdAt: rel.createdAt,
        scan: scan ? { score: scan.score, status: scan.status, findings: scan.findings } : null,
      };
    })
  );

  return enriched;
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

export async function healthCheck(): Promise<boolean> {
  if (!db) return false;
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}

export { schema, eq, desc, ilike, sql, and };
