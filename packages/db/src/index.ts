import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, desc, ilike, sql, and } from "drizzle-orm";
import * as schema from "./schema";

// ── Connection ────────────────────────────────────────────────────

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("[kithub/db] DATABASE_URL not set — database calls will fail at runtime");
}

const client = connectionString ? postgres(connectionString, { max: 10 }) : null;
export const db = client ? drizzle(client, { schema }) : null;

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

  let q = db.select().from(schema.kits).$dynamic();

  if (query) {
    q = q.where(
      ilike(schema.kits.title, `%${query}%`)
    );
  }

  return q.orderBy(desc(schema.kits.updatedAt)).limit(50);
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

// Re-export schema and operators
export { schema, eq, desc, ilike, sql, and };
