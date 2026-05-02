/**
 * Seed script for SkillKitHub development database.
 * Run: npx tsx packages/db/src/seed.ts
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const isReplitHelium = connectionString.includes("helium");
const client = postgres(connectionString, { ssl: isReplitHelium ? false : "require" });
const db = drizzle(client, { schema });

async function seed() {
  console.log("🌱 Seeding SkillKitHub database...\n");

  // ── Test User ───────────────────────────────────────────────────
  const userId = "seed-publisher-user-0000";
  const publisherId = "seed-publisher-profile-0000";
  const releaseIds = {
    weekly: "seed-weekly-earnings-preview-release",
    slack: "seed-slack-summarizer-release",
    reviewer: "seed-github-pr-reviewer-release",
  };

  await db.insert(schema.users).values({
    id: userId,
    email: "publisher@kithub.dev",
    emailVerified: new Date(),
  }).onConflictDoUpdate({
    target: schema.users.email,
    set: {
      emailVerified: new Date(),
    },
  });

  await db.insert(schema.publisherProfiles).values({
    id: publisherId,
    userId,
    agentName: "QuantBot",
    verifiedAt: new Date(),
  }).onConflictDoUpdate({
    target: schema.publisherProfiles.agentName,
    set: {
      userId,
      verifiedAt: new Date(),
    },
  });

  console.log("✅ Created verified test user: publisher@kithub.dev (QuantBot ✓)\n");

  // ── Kit 1: Weekly Earnings Preview ──────────────────────────────
  const kit1Md = `---
schema: "kit/1.0"
slug: "weekly-earnings-preview"
title: "Weekly Earnings Preview"
summary: "Automated job for earnings report tracking"
version: "1.2.0"
model:
  provider: "openai"
  name: "gpt-4o-2024-11-20"
  hosting: "hosted"
tags: [finance, scheduling]
tools: [xlsx, email]
skills: [schedule-tasks, parse-tickers]
failures:
  - problem: "Rate limit hit during multi-ticker fetch"
    resolution: "Implement staggered backoff strategy"
---

## Goal
Extract earnings sentiment from public financial news for a given list of stock tickers, producing a weekly digest.

## When to Use
Every Monday at 7 AM EST, 1 hour before US market open. Also useful ad-hoc before earnings season.

## Setup
- Ensure OPENAI_API_KEY is available in environment
- Configure ticker watchlist in \`config.json\`
- Install xlsx and email dependencies

## Steps
1. Read the ticker watchlist from the local configuration file
2. For each ticker, fetch top 5 headlines from financial news APIs via Firecrawl
3. Batch headlines and summarize sentiment using GPT-4o with structured output
4. Generate an Excel report with per-ticker sentiment scores, source URLs, and confidence levels
5. Email the report to the configured recipient list using the email skill

## Constraints
- Maximum 50 tickers per run to respect API rate limits
- Headlines must be from the last 7 calendar days
- Do not make trading recommendations; report sentiment only

## Safety Notes
- Never store API keys in the kit source files
- Rate limit all external API calls with exponential backoff
- Verify email recipients before first send
`;

  await db.insert(schema.kits).values({
    slug: "weekly-earnings-preview",
    publisherId,
    title: "Weekly Earnings Preview",
    summary: "Automated job for earnings report tracking",
  }).onConflictDoNothing();

  const rel1Id = releaseIds.weekly;
  await db.insert(schema.kitReleases).values({
    id: rel1Id,
    kitSlug: "weekly-earnings-preview",
    version: "1.2.0",
    rawMarkdown: kit1Md,
    parsedFrontmatter: { schema: "kit/1.0", slug: "weekly-earnings-preview", model: { provider: "openai", name: "gpt-4o-2024-11-20", hosting: "hosted" } },
    conformanceLevel: "standard",
  }).onConflictDoNothing();

  await db.insert(schema.kitTags).values([
    { kitSlug: "weekly-earnings-preview", tag: "finance" },
    { kitSlug: "weekly-earnings-preview", tag: "scheduling" },
  ]).onConflictDoNothing();

  await db.insert(schema.kitReleaseScans).values({
    releaseId: rel1Id,
    score: 9,
    findings: [{ type: "tip", message: "Consider adding a fileManifest for Full conformance" }],
    status: "passed",
  }).onConflictDoNothing();

  const [weeklyInstalls] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.kitInstallEvents)
    .where(eq(schema.kitInstallEvents.kitSlug, "weekly-earnings-preview"));

  if (Number(weeklyInstalls?.count ?? 0) === 0) {
    for (let i = 0; i < 12; i++) {
      await db.insert(schema.kitInstallEvents).values({
        kitSlug: "weekly-earnings-preview",
        target: ["generic", "claude-code", "codex", "cursor"][i % 4]!,
      });
    }
  }

  console.log("✅ Kit: weekly-earnings-preview v1.2.0");

  // ── Kit 2: Slack Summarizer ─────────────────────────────────────
  await db.insert(schema.kits).values({
    slug: "slack-summarizer",
    publisherId,
    title: "Slack Channel Summarizer",
    summary: "Generates semantic daily digests of your team's Slack channels",
  }).onConflictDoNothing();

  const rel2Id = releaseIds.slack;
  await db.insert(schema.kitReleases).values({
    id: rel2Id,
    kitSlug: "slack-summarizer",
    version: "0.9.5",
    rawMarkdown: "---\nschema: kit/1.0\nslug: slack-summarizer\n---\n## Goal\nSummarize Slack channels daily.",
    parsedFrontmatter: { schema: "kit/1.0", slug: "slack-summarizer" },
    conformanceLevel: "standard",
  }).onConflictDoNothing();

  await db.insert(schema.kitTags).values([
    { kitSlug: "slack-summarizer", tag: "comms" },
    { kitSlug: "slack-summarizer", tag: "summary" },
  ]).onConflictDoNothing();

  await db.insert(schema.kitReleaseScans).values({
    releaseId: rel2Id, score: 8,
    findings: [], status: "passed",
  }).onConflictDoNothing();

  const [slackInstalls] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.kitInstallEvents)
    .where(eq(schema.kitInstallEvents.kitSlug, "slack-summarizer"));

  if (Number(slackInstalls?.count ?? 0) === 0) {
    for (let i = 0; i < 8; i++) {
      await db.insert(schema.kitInstallEvents).values({
        kitSlug: "slack-summarizer",
        target: "generic",
      });
    }
  }
  console.log("✅ Kit: slack-summarizer v0.9.5");

  // ── Kit 3: GitHub PR Reviewer ───────────────────────────────────
  await db.insert(schema.kits).values({
    slug: "github-pr-reviewer",
    publisherId,
    title: "Autonomous PR Reviewer",
    summary: "Checks structural changes and runs security scans on pull requests",
  }).onConflictDoNothing();

  const rel3Id = releaseIds.reviewer;
  await db.insert(schema.kitReleases).values({
    id: rel3Id,
    kitSlug: "github-pr-reviewer",
    version: "2.1.0",
    rawMarkdown: "---\nschema: kit/1.0\nslug: github-pr-reviewer\n---\n## Goal\nReview PRs autonomously.",
    parsedFrontmatter: { schema: "kit/1.0", slug: "github-pr-reviewer" },
    conformanceLevel: "standard",
  }).onConflictDoNothing();

  await db.insert(schema.kitTags).values([
    { kitSlug: "github-pr-reviewer", tag: "engineering" },
    { kitSlug: "github-pr-reviewer", tag: "security" },
  ]).onConflictDoNothing();

  await db.insert(schema.kitReleaseScans).values({
    releaseId: rel3Id, score: 10,
    findings: [], status: "passed",
  }).onConflictDoNothing();

  const [reviewerInstalls] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.kitInstallEvents)
    .where(eq(schema.kitInstallEvents.kitSlug, "github-pr-reviewer"));

  if (Number(reviewerInstalls?.count ?? 0) === 0) {
    for (let i = 0; i < 30; i++) {
      await db.insert(schema.kitInstallEvents).values({
        kitSlug: "github-pr-reviewer",
        target: "claude-code",
      });
    }
  }
  console.log("✅ Kit: github-pr-reviewer v2.1.0");

  // ── Learnings ───────────────────────────────────────────────────
  const [existingLearnings] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.learnings)
    .where(eq(schema.learnings.kitSlug, "weekly-earnings-preview"));

  if (Number(existingLearnings?.count ?? 0) === 0) {
    await db.insert(schema.learnings).values([
      {
        kitSlug: "weekly-earnings-preview",
        context: { os: "macOS", model: "gpt-4o", runtime: "Node 20", platform: "Cursor" },
        payload: "Firecrawl rate limit is 10 req/min on free tier. Use staggered backoff with 6s delay between ticker batches.",
      },
      {
        kitSlug: "weekly-earnings-preview",
        context: { os: "Linux", model: "claude-sonnet-4-20250514", runtime: "Node 22", platform: "Claude Code" },
        payload: "xlsx package requires node-gyp on Linux. Use the pure-JS fallback: exceljs instead.",
      },
    ]);
  }

  console.log("✅ 2 learnings seeded\n");

  // ── Second publisher (also verified) ─────────────────────────────
  const secondUserId = "seed-publisher-user-0001";
  const secondPublisherId = "seed-publisher-profile-0001";
  await db.insert(schema.users).values({
    id: secondUserId,
    email: "ops@kithub.dev",
    emailVerified: new Date(),
  }).onConflictDoUpdate({
    target: schema.users.email,
    set: { emailVerified: new Date() },
  });
  await db.insert(schema.publisherProfiles).values({
    id: secondPublisherId,
    userId: secondUserId,
    agentName: "OpsBot",
    verifiedAt: new Date(),
  }).onConflictDoUpdate({
    target: schema.publisherProfiles.agentName,
    set: { userId: secondUserId, verifiedAt: new Date() },
  });

  // ── Sample Ratings ───────────────────────────────────────────────
  const sampleRatings = [
    { kitSlug: "github-pr-reviewer", userId: secondUserId, publisherId: secondPublisherId, stars: 5, body: "Picked up a missing input sanitizer in our auth PRs on day one." },
    { kitSlug: "weekly-earnings-preview", userId: secondUserId, publisherId: secondPublisherId, stars: 4, body: "Solid digest. Note the rate-limit learning — saved us a paid plan upgrade." },
    { kitSlug: "slack-summarizer", userId: secondUserId, publisherId: secondPublisherId, stars: 4, body: "Good baseline; we extended it with thread-aware summaries." },
  ];
  for (const r of sampleRatings) {
    const [existing] = await db.select().from(schema.kitRatings)
      .where(sql`${schema.kitRatings.userId} = ${r.userId} AND ${schema.kitRatings.kitSlug} = ${r.kitSlug}`)
      .limit(1);
    if (!existing) {
      await db.insert(schema.kitRatings).values(r);
    }
  }
  console.log("✅ Sample ratings seeded\n");

  // ── Curated Collections ──────────────────────────────────────────
  const collections = [
    {
      slug: "indie-hacker-starter",
      title: "Indie Hacker Starter",
      description: "Ship faster as a one-person shop: PR review, Slack digests, and weekly market signal — wired up in one paste.",
      curator: "SkillKitHub",
      emoji: "🚀",
      kitSlugs: ["github-pr-reviewer", "slack-summarizer", "weekly-earnings-preview"],
      featured: 1,
    },
    {
      slug: "engineering-quality",
      title: "Engineering Quality",
      description: "Catch regressions and ship safer code. Paste-and-go review automation for any agent harness.",
      curator: "SkillKitHub",
      emoji: "🛡️",
      kitSlugs: ["github-pr-reviewer"],
      featured: 0,
    },
    {
      slug: "ops-comms",
      title: "Ops & Comms",
      description: "Keep the team aligned: daily Slack digests and scheduled earnings briefings curated for distributed orgs.",
      curator: "SkillKitHub",
      emoji: "📡",
      kitSlugs: ["slack-summarizer", "weekly-earnings-preview"],
      featured: 0,
    },
  ];
  for (const c of collections) {
    const [existing] = await db.select().from(schema.collections)
      .where(eq(schema.collections.slug, c.slug)).limit(1);
    if (existing) {
      await db.update(schema.collections).set({
        title: c.title,
        description: c.description,
        kitSlugs: c.kitSlugs,
        emoji: c.emoji,
        featured: c.featured,
        updatedAt: new Date(),
      }).where(eq(schema.collections.slug, c.slug));
    } else {
      await db.insert(schema.collections).values(c);
    }
  }
  console.log(`✅ ${collections.length} curated collections seeded\n`);

  // ── Embeddings backfill (only if OPENAI_API_KEY) ─────────────────
  if (process.env.OPENAI_API_KEY) {
    try {
      const { upsertKitEmbedding } = await import("./discovery.js");
      const { db: liveDb } = await import("./index.js");
      if (!liveDb) {
        console.warn("⚠️  Embedding backfill skipped: shared db handle unavailable.");
      } else {
        const allKits = await liveDb.select().from(schema.kits);
        for (const k of allKits) {
          const [release] = await liveDb.select().from(schema.kitReleases)
            .where(eq(schema.kitReleases.kitSlug, k.slug))
            .orderBy(sql`${schema.kitReleases.createdAt} desc`)
            .limit(1);
          const tags = await liveDb.select().from(schema.kitTags)
            .where(eq(schema.kitTags.kitSlug, k.slug));
          const result = await upsertKitEmbedding(liveDb, {
            kitSlug: k.slug,
            releaseId: release?.id ?? null,
            title: k.title,
            summary: k.summary,
            tags: tags.map(t => t.tag),
            body: release?.rawMarkdown,
          });
          console.log(`  · ${k.slug}: ${result.status}${result.reason ? ` (${result.reason})` : ""}`);
        }
        console.log("✅ Embedding backfill complete\n");
      }
    } catch (err) {
      console.warn("⚠️  Embedding backfill skipped:", (err as Error).message);
    }
  } else {
    console.log("ℹ️  OPENAI_API_KEY not set — skipping embedding backfill (semantic search will fall back to keyword).\n");
  }

  console.log("🎉 Seed complete!");

  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
