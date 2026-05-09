import { drizzle } from "drizzle-orm/postgres-js";
import { desc, eq, sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema";
import { isEmbeddingsEnabled } from "./embeddings";
import { upsertKitEmbedding } from "./discovery";

const RATE_LIMIT_DELAY_MS = 200;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

if (!isEmbeddingsEnabled()) {
  console.error(
    "No embedding provider configured. Set one of GEMINI_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY, or Azure OpenAI env vars."
  );
  process.exit(1);
}

const isReplitHelium = connectionString.includes("helium");
const client = postgres(connectionString, { ssl: isReplitHelium ? false : "require" });
const db = drizzle(client, { schema });

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function backfillEmbeddings() {
  const kits = await db
    .select()
    .from(schema.kits)
    .where(sql`${schema.kits.unpublishedAt} IS NULL`)
    .orderBy(schema.kits.slug);

  if (kits.length === 0) {
    console.log("No published kits found.");
    return;
  }

  console.log(`Backfilling embeddings for ${kits.length} published kit${kits.length === 1 ? "" : "s"}...\n`);

  const counts = {
    stored: 0,
    unchanged: 0,
    skipped: 0,
    disabled: 0,
  };

  for (let i = 0; i < kits.length; i++) {
    const kit = kits[i]!;
    const [release] = await db
      .select()
      .from(schema.kitReleases)
      .where(eq(schema.kitReleases.kitSlug, kit.slug))
      .orderBy(desc(schema.kitReleases.createdAt))
      .limit(1);

    if (!release) {
      counts.skipped += 1;
      console.log(`[${i + 1}/${kits.length}] ${kit.slug} -> skipped (no releases)`);
      continue;
    }

    const tags = await db
      .select({ tag: schema.kitTags.tag })
      .from(schema.kitTags)
      .where(eq(schema.kitTags.kitSlug, kit.slug));

    const result = await upsertKitEmbedding(db, {
      kitSlug: kit.slug,
      releaseId: release.id,
      title: kit.title,
      summary: kit.summary,
      tags: tags.map((t) => t.tag),
      body: release.rawMarkdown,
    });

    counts[result.status] += 1;
    const reason = result.reason ? ` (${result.reason})` : "";
    console.log(`[${i + 1}/${kits.length}] ${kit.slug} -> ${result.status}${reason}`);

    if (i < kits.length - 1) {
      await delay(RATE_LIMIT_DELAY_MS);
    }
  }

  console.log("\nEmbedding backfill complete:");
  console.log(`  stored: ${counts.stored}`);
  console.log(`  unchanged: ${counts.unchanged}`);
  console.log(`  skipped: ${counts.skipped}`);
  console.log(`  disabled: ${counts.disabled}`);
}

backfillEmbeddings()
  .catch((err) => {
    console.error("Embedding backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
