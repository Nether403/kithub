import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp, isDatabaseAvailable, cleanupTestData } from "./setup";

const TEST_EMAIL = `discovery-${Date.now()}@kithub-test.dev`;
const TEST_AGENT = `discovery-agent-${Date.now()}`;
const TEST_KIT_SLUG = `discovery-kit-${Date.now()}`;

const VALID_KIT_MD = `---
schema: "kit/1.0"
slug: ${TEST_KIT_SLUG}
title: Discovery Test Kit
summary: A kit used to validate discovery endpoints
version: 1.0.0
model:
  provider: openai
  name: gpt-4o-2024-11-20
  hosting: hosted
tags: [discovery, integration]
tools: [firecrawl]
skills: [web-scraping]
---

## Goal
Validate discovery, ratings, and collections endpoints.

## When to Use
Use when running integration tests for the discovery surface.

## Setup
No setup required.

## Steps
Step 1: Publish the kit through the API. Step 2: Rate it from a second account. Step 3: Run a discovery search and confirm related kits are returned.

## Constraints
Use only inside automated integration tests against ephemeral data.

## Safety Notes
This kit is safe and contains no secrets, network calls, or destructive operations.
`;

let app: FastifyInstance;
let dbAvailable = false;
let authToken = "";
let secondToken = "";
const SECOND_EMAIL = `discovery-second-${Date.now()}@kithub-test.dev`;
const SECOND_AGENT = `discovery-second-${Date.now()}`;

function skipIfNoDb(ctx: any) {
  if (!dbAvailable) {
    ctx.skip();
    return true;
  }
  return false;
}

async function registerAndVerify(email: string, agentName: string): Promise<string> {
  await app.inject({ method: "POST", url: "/api/auth/register", payload: { email, agentName } });
  const { db, schema, eq } = await import("@kithub/db");
  const [user] = await db!.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  const [code] = await db!.select().from(schema.emailVerificationCodes)
    .where(eq(schema.emailVerificationCodes.userId, user!.id)).limit(1);
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/verify-email",
    payload: { email, code: code!.code },
  });
  return res.json().token as string;
}

beforeAll(async () => {
  dbAvailable = await isDatabaseAvailable();
  if (!dbAvailable) return;
  app = await buildApp();
  authToken = await registerAndVerify(TEST_EMAIL, TEST_AGENT);
  secondToken = await registerAndVerify(SECOND_EMAIL, SECOND_AGENT);

  // Publish a kit owned by the first user
  await app.inject({
    method: "POST",
    url: "/api/kits",
    headers: { authorization: `Bearer ${authToken}` },
    payload: { rawMarkdown: VALID_KIT_MD },
  });
});

afterAll(async () => {
  if (!dbAvailable) return;
  await cleanupTestData(TEST_EMAIL, TEST_KIT_SLUG);
  await cleanupTestData(SECOND_EMAIL);
  await app.close();
});

describe("Search modes", () => {
  it("supports keyword mode (default)", async (ctx) => {
    if (skipIfNoDb(ctx)) return;
    const res = await app.inject({ method: "GET", url: "/api/kits?q=Discovery&mode=keyword" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.kits)).toBe(true);
    expect(body.mode === undefined || body.mode === "keyword").toBe(true);
  });

  it("falls back to keyword when semantic embeddings are unavailable", async (ctx) => {
    if (skipIfNoDb(ctx)) return;
    const res = await app.inject({ method: "GET", url: "/api/kits?q=Discovery&mode=semantic" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.mode === "semantic" || body.mode === "keyword").toBe(true);
    expect(Array.isArray(body.kits)).toBe(true);
  });

  it("returns related kits using tag overlap fallback", async (ctx) => {
    if (skipIfNoDb(ctx)) return;
    const res = await app.inject({
      method: "GET",
      url: `/api/kits?related_to=${TEST_KIT_SLUG}&limit=5`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.kits)).toBe(true);
    expect(["embedding", "tags", "none"]).toContain(body.mode);
    // The kit itself must be excluded
    expect(body.kits.find((k: any) => k.slug === TEST_KIT_SLUG)).toBeUndefined();
  });
});

describe("Ratings endpoints", () => {
  it("rejects unauthenticated rating submission", async (ctx) => {
    if (skipIfNoDb(ctx)) return;
    const res = await app.inject({
      method: "POST",
      url: `/api/kits/${TEST_KIT_SLUG}/ratings`,
      payload: { stars: 5 },
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects self-rating by the kit publisher", async (ctx) => {
    if (skipIfNoDb(ctx)) return;
    const res = await app.inject({
      method: "POST",
      url: `/api/kits/${TEST_KIT_SLUG}/ratings`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { stars: 5, body: "self-rating attempt" },
    });
    expect([400, 403]).toContain(res.statusCode);
  });

  it("accepts a rating from a different publisher", async (ctx) => {
    if (skipIfNoDb(ctx)) return;
    const res = await app.inject({
      method: "POST",
      url: `/api/kits/${TEST_KIT_SLUG}/ratings`,
      headers: { authorization: `Bearer ${secondToken}` },
      payload: { stars: 4, body: "Solid kit" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.averageStars).toBe(4);
    expect(body.ratingCount).toBe(1);
  });

  it("upserts when the same publisher rates again", async (ctx) => {
    if (skipIfNoDb(ctx)) return;
    const res = await app.inject({
      method: "POST",
      url: `/api/kits/${TEST_KIT_SLUG}/ratings`,
      headers: { authorization: `Bearer ${secondToken}` },
      payload: { stars: 5, body: "Updated review" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.averageStars).toBe(5);
    expect(body.ratingCount).toBe(1);
  });

  it("rejects invalid star values", async (ctx) => {
    if (skipIfNoDb(ctx)) return;
    const res = await app.inject({
      method: "POST",
      url: `/api/kits/${TEST_KIT_SLUG}/ratings`,
      headers: { authorization: `Bearer ${secondToken}` },
      payload: { stars: 7 },
    });
    expect(res.statusCode).toBe(400);
  });

  it("lists ratings publicly", async (ctx) => {
    if (skipIfNoDb(ctx)) return;
    const res = await app.inject({
      method: "GET",
      url: `/api/kits/${TEST_KIT_SLUG}/ratings`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.averageStars).toBe(5);
    expect(body.ratingCount).toBe(1);
    expect(body.ratings.length).toBe(1);
    expect(body.ratings[0].publisherName).toBe(SECOND_AGENT);
  });

  it("surfaces averageStars on kit detail", async (ctx) => {
    if (skipIfNoDb(ctx)) return;
    const res = await app.inject({ method: "GET", url: `/api/kits/${TEST_KIT_SLUG}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.averageStars).toBe(5);
    expect(body.ratingCount).toBe(1);
  });
});

describe("Scan history endpoint", () => {
  it("returns scans and an empty diff array for a single release", async (ctx) => {
    if (skipIfNoDb(ctx)) return;
    const res = await app.inject({
      method: "GET",
      url: `/api/kits/${TEST_KIT_SLUG}/scans`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.slug).toBe(TEST_KIT_SLUG);
    expect(Array.isArray(body.scans)).toBe(true);
    expect(body.scans.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(body.diffs)).toBe(true);
  });
});

describe("Collections endpoints", () => {
  it("lists collections without authentication", async (ctx) => {
    if (skipIfNoDb(ctx)) return;
    const res = await app.inject({ method: "GET", url: "/api/collections" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.collections)).toBe(true);
  });

  it("returns 404 for unknown collection slug", async (ctx) => {
    if (skipIfNoDb(ctx)) return;
    const res = await app.inject({ method: "GET", url: "/api/collections/does-not-exist-xyz" });
    expect(res.statusCode).toBe(404);
  });

  it("returns install bundle with kit URLs", async (ctx) => {
    if (skipIfNoDb(ctx)) return;
    const list = await app.inject({ method: "GET", url: "/api/collections" });
    const first = list.json().collections?.[0];
    if (!first) return ctx.skip();
    const res = await app.inject({
      method: "GET",
      url: `/api/collections/${first.slug}/install`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.slug).toBe(first.slug);
    expect(typeof body.instructions).toBe("string");
    expect(Array.isArray(body.installUrls)).toBe(true);
    expect(body.installUrls.length).toBeGreaterThan(0);
    expect(body.installUrls[0]).toMatch(/\/api\/kits\/.+\/install/);
    expect(Array.isArray(body.supportedTargets)).toBe(true);
  });

  it("rejects collection install with invalid target", async (ctx) => {
    if (skipIfNoDb(ctx)) return;
    const list = await app.inject({ method: "GET", url: "/api/collections" });
    const first = list.json().collections?.[0];
    if (!first) return ctx.skip();
    const res = await app.inject({
      method: "GET",
      url: `/api/collections/${first.slug}/install?target=not-a-real-target`,
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("Verified publisher badge surface", () => {
  it("includes verified status on publisher detail", async (ctx) => {
    if (skipIfNoDb(ctx)) return;
    const res = await app.inject({ method: "GET", url: `/api/publishers/${TEST_AGENT}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.agentName).toBe(TEST_AGENT);
    expect(typeof body.verified).toBe("boolean");
  });
});
