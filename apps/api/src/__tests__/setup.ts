import createFastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { authRoutes } from "../routes/auth";
import { kitRoutes } from "../routes/kits";
import { authMiddleware } from "../middleware/auth";
import { db, healthCheck, schema, eq, sql } from "@kithub/db";

export const TEST_EMAIL = `test-${Date.now()}@kithub-test.dev`;
export const TEST_AGENT_NAME = `test-agent-${Date.now()}`;

export async function buildApp(): Promise<FastifyInstance> {
  const app = createFastify({ logger: false });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(jwt, { secret: "test-secret-for-integration-tests" });
  await app.register(authMiddleware);
  app.decorate("db", db);
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(kitRoutes, { prefix: "/api/kits" });

  app.get("/health", async () => {
    const dbOk = await healthCheck();
    return { status: "ok", database: dbOk ? "connected" : "disconnected" };
  });

  await app.ready();
  return app;
}

export async function isDatabaseAvailable(): Promise<boolean> {
  return healthCheck();
}

export async function cleanupTestData(email: string, kitSlug?: string) {
  if (!db) return;

  try {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (user) {
      await db.delete(schema.emailVerificationCodes).where(eq(schema.emailVerificationCodes.userId, user.id));
      await db.delete(schema.publisherProfiles).where(eq(schema.publisherProfiles.userId, user.id));
      await db.delete(schema.users).where(eq(schema.users.id, user.id));
    }
  } catch {}

  if (kitSlug) {
    try {
      const releases = await db.select({ id: schema.kitReleases.id }).from(schema.kitReleases).where(eq(schema.kitReleases.kitSlug, kitSlug));
      for (const rel of releases) {
        await db.delete(schema.kitReleaseScans).where(eq(schema.kitReleaseScans.releaseId, rel.id));
      }
      await db.delete(schema.kitReleases).where(eq(schema.kitReleases.kitSlug, kitSlug));
      await db.delete(schema.kitInstallEvents).where(eq(schema.kitInstallEvents.kitSlug, kitSlug));
      await db.delete(schema.learnings).where(eq(schema.learnings.kitSlug, kitSlug));
      await db.delete(schema.kitTags).where(eq(schema.kitTags.kitSlug, kitSlug));
      await db.delete(schema.kits).where(eq(schema.kits.slug, kitSlug));
    } catch {}
  }
}
