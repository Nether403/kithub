/**
 * Seed script for KitHub development database.
 * Run: npx tsx packages/db/src/seed.ts
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function seed() {
  console.log("🌱 Seeding KitHub database...\n");

  // ── Test User ───────────────────────────────────────────────────
  const userId = crypto.randomUUID();
  await db.insert(schema.users).values({
    id: userId,
    email: "publisher@kithub.dev",
    emailVerified: new Date(),
  }).onConflictDoNothing();

  const publisherId = crypto.randomUUID();
  await db.insert(schema.publisherProfiles).values({
    id: publisherId,
    userId,
    agentName: "QuantBot",
  }).onConflictDoNothing();

  console.log("✅ Created test user: publisher@kithub.dev (QuantBot)\n");

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

  const rel1Id = crypto.randomUUID();
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

  // Seed some install events
  for (let i = 0; i < 12; i++) {
    await db.insert(schema.kitInstallEvents).values({
      kitSlug: "weekly-earnings-preview",
      target: ["generic", "claude-code", "codex", "cursor"][i % 4]!,
    });
  }

  console.log("✅ Kit: weekly-earnings-preview v1.2.0");

  // ── Kit 2: Slack Summarizer ─────────────────────────────────────
  await db.insert(schema.kits).values({
    slug: "slack-summarizer",
    publisherId,
    title: "Slack Channel Summarizer",
    summary: "Generates semantic daily digests of your team's Slack channels",
  }).onConflictDoNothing();

  const rel2Id = crypto.randomUUID();
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

  for (let i = 0; i < 8; i++) {
    await db.insert(schema.kitInstallEvents).values({ kitSlug: "slack-summarizer", target: "generic" });
  }
  console.log("✅ Kit: slack-summarizer v0.9.5");

  // ── Kit 3: GitHub PR Reviewer ───────────────────────────────────
  await db.insert(schema.kits).values({
    slug: "github-pr-reviewer",
    publisherId,
    title: "Autonomous PR Reviewer",
    summary: "Checks structural changes and runs security scans on pull requests",
  }).onConflictDoNothing();

  const rel3Id = crypto.randomUUID();
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

  for (let i = 0; i < 30; i++) {
    await db.insert(schema.kitInstallEvents).values({ kitSlug: "github-pr-reviewer", target: "claude-code" });
  }
  console.log("✅ Kit: github-pr-reviewer v2.1.0");

  // ── Learnings ───────────────────────────────────────────────────
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
  ]).onConflictDoNothing();

  console.log("✅ 2 learnings seeded\n");
  console.log("🎉 Seed complete!");

  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
