import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp, isDatabaseAvailable, cleanupTestData } from "./setup";

const TEST_EMAIL = `inttest-${Date.now()}@kithub-test.dev`;
const TEST_AGENT = `inttest-agent-${Date.now()}`;
const TEST_KIT_SLUG = `inttest-kit-${Date.now()}`;

const VALID_KIT_MD = `---
schema: "kit/1.0"
slug: ${TEST_KIT_SLUG}
title: Integration Test Kit
summary: A kit created during integration testing
version: 1.0.0
model:
  provider: openai
  name: gpt-4o-2024-11-20
  hosting: hosted
tags: [testing, integration]
tools: [firecrawl]
skills: [web-scraping]
---

## Goal
This kit validates the full publish lifecycle in integration tests.

## When to Use
Use this kit when running integration tests against the API.

## Setup
No special setup required for this test kit.

## Steps
Step 1: Register a user. Step 2: Verify email. Step 3: Publish the kit. Step 4: List kits and verify.

## Constraints
Only use in test environments.

## Safety Notes
This kit is safe and contains no secrets or destructive patterns.
`;

let app: FastifyInstance;
let dbAvailable = false;
let authToken = "";

function skipIfNoDb() {
  if (!dbAvailable) {
    console.warn("[SKIPPED] Database not available");
    return true;
  }
  return false;
}

beforeAll(async () => {
  dbAvailable = await isDatabaseAvailable();
  if (!dbAvailable) {
    console.warn("[SKIP] Database not available — API integration tests will report as skipped");
    return;
  }
  app = await buildApp();
});

afterAll(async () => {
  if (!dbAvailable) return;
  await cleanupTestData(TEST_EMAIL, TEST_KIT_SLUG);
  await app.close();
});

describe("Health check", () => {
  it("returns ok with database status", async (ctx) => {
    if (skipIfNoDb()) return ctx.skip();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(body.database).toBe("connected");
  });
});

describe("Auth config and identity", () => {
  it("serves public auth config without authentication", async (ctx) => {
    if (skipIfNoDb()) return ctx.skip();
    const res = await app.inject({ method: "GET", url: "/api/auth/config" });
    expect([200, 503]).toContain(res.statusCode);
  });

  it("rejects /api/auth/me without a bearer token", async (ctx) => {
    if (skipIfNoDb()) return ctx.skip();
    const res = await app.inject({ method: "GET", url: "/api/auth/me" });
    expect(res.statusCode).toBe(401);
  });
});

describe("Auth flow: register -> verify -> get token", () => {
  it("registers a new user", async (ctx) => {
    if (skipIfNoDb()) return ctx.skip();
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: TEST_EMAIL, agentName: TEST_AGENT },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("pending");
  });

  it("rejects duplicate registration", async (ctx) => {
    if (skipIfNoDb()) return ctx.skip();
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: TEST_EMAIL, agentName: TEST_AGENT },
    });
    expect(res.statusCode).toBe(409);
  });

  it("rejects registration with missing fields", async (ctx) => {
    if (skipIfNoDb()) return ctx.skip();
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: TEST_EMAIL },
    });
    expect(res.statusCode).toBe(400);
  });

  it("verifies email with code and gets token", async (ctx) => {
    if (skipIfNoDb()) return ctx.skip();
    const { db, schema, eq } = await import("@kithub/db");
    expect(db).toBeTruthy();

    const [user] = await db!.select().from(schema.users).where(eq(schema.users.email, TEST_EMAIL)).limit(1);
    expect(user).toBeDefined();

    const [code] = await db!.select().from(schema.emailVerificationCodes).where(eq(schema.emailVerificationCodes.userId, user!.id)).limit(1);
    expect(code).toBeDefined();

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/verify-email",
      payload: { email: TEST_EMAIL, code: code!.code },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("verified");
    expect(body.token).toBeDefined();
    authToken = body.token;
  });

  it("returns the canonical identity from /api/auth/me", async (ctx) => {
    if (skipIfNoDb()) return ctx.skip();
    expect(authToken).toBeTruthy();
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.email).toBe(TEST_EMAIL);
    expect(body.userId).toBeDefined();
    expect(body.supabaseUserId).toBeDefined();
    expect(body.publisherId).toBeDefined();
  });

  it("rejects invalid verification code", async (ctx) => {
    if (skipIfNoDb()) return ctx.skip();
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/verify-email",
      payload: { email: TEST_EMAIL, code: "000000" },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("Kit CRUD lifecycle", () => {
  it("rejects publish without auth token", async (ctx) => {
    if (skipIfNoDb()) return ctx.skip();
    const res = await app.inject({
      method: "POST",
      url: "/api/kits",
      payload: { rawMarkdown: VALID_KIT_MD },
    });
    expect(res.statusCode).toBe(401);
  });

  it("publishes a kit with valid auth", async (ctx) => {
    if (skipIfNoDb()) return ctx.skip();
    expect(authToken).toBeTruthy();
    const res = await app.inject({
      method: "POST",
      url: "/api/kits",
      headers: { authorization: `Bearer ${authToken}` },
      payload: { rawMarkdown: VALID_KIT_MD },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.slug).toBe(TEST_KIT_SLUG);
    expect(body.version).toBe("1.0.0");
    expect(body.scan).toBeDefined();
    expect(body.scan.score).toBeGreaterThanOrEqual(7);
    expect(body.status).toBe("published");
  });

  it("rejects publish with missing rawMarkdown", async (ctx) => {
    if (skipIfNoDb()) return ctx.skip();
    expect(authToken).toBeTruthy();
    const res = await app.inject({
      method: "POST",
      url: "/api/kits",
      headers: { authorization: `Bearer ${authToken}` },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it("lists kits from the registry", async (ctx) => {
    if (skipIfNoDb()) return ctx.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/kits",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.kits).toBeDefined();
    expect(Array.isArray(body.kits)).toBe(true);
  });

  it("gets kit detail by slug", async (ctx) => {
    if (skipIfNoDb()) return ctx.skip();
    const res = await app.inject({
      method: "GET",
      url: `/api/kits/${TEST_KIT_SLUG}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.slug).toBe(TEST_KIT_SLUG);
    expect(body.title).toBe("Integration Test Kit");
    expect(body.version).toBe("1.0.0");
    expect(body.tags).toContain("testing");
    expect(body.scan).toBeDefined();
  });

  it("returns 404 for non-existent kit", async (ctx) => {
    if (skipIfNoDb()) return ctx.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/kits/does-not-exist-xyz",
    });
    expect(res.statusCode).toBe(404);
  });

  it("gets install payload with target", async (ctx) => {
    if (skipIfNoDb()) return ctx.skip();
    const res = await app.inject({
      method: "GET",
      url: `/api/kits/${TEST_KIT_SLUG}/install?target=claude-code`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.target).toBe("claude-code");
    expect(body.kitSlug).toBe(TEST_KIT_SLUG);
    expect(body.instructions).toContain("CLAUDE.md");
  });

  it("rejects install without target param", async (ctx) => {
    if (skipIfNoDb()) return ctx.skip();
    const res = await app.inject({
      method: "GET",
      url: `/api/kits/${TEST_KIT_SLUG}/install`,
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects install with invalid target", async (ctx) => {
    if (skipIfNoDb()) return ctx.skip();
    const res = await app.inject({
      method: "GET",
      url: `/api/kits/${TEST_KIT_SLUG}/install?target=invalid`,
    });
    expect(res.statusCode).toBe(400);
  });
});
