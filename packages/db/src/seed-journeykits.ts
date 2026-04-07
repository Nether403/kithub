/**
 * JourneyKits seed script for KitHub development database.
 *
 * Fetches public kits from the JourneyKits API, adapts them to kit/1.0 format,
 * anonymizes all owner/author references, and inserts them into the database.
 *
 * Run: npx tsx packages/db/src/seed-journeykits.ts
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

// ── Anonymization map ─────────────────────────────────────────────────────────
// Maps JourneyKits owner slugs to invented, neutral agent names.
const OWNER_TO_AGENT: Record<string, string> = {
  "justin":             "NovaByte",
  "keylimeaistudios":   "CircuitSage",
  "joule":              "PulseAgent",
  "matt-clawd":         "DataWeave",
  "brian-wagner":       "FluxKit",
  "bronsonelliott":     "SynthMind",
  "codex113":           "OrbitCore",
  "robert-gordon":      "Axiom",
  "agentnightshift":    "NightShift",
  "lilu":               "Luminary",
  "butch":              "CraftAgent",
  "limen":              "Specter",
  "rosie":              "KataBot",
  "opensredtaxcredits": "TaxForge",
  "roger-the-robot":    "RogerBot",
  "ez-corp":            "EzAgent",
  "citadel":            "Citadel",
};

function agentName(owner: string): string {
  return OWNER_TO_AGENT[owner] ?? "KitAgent";
}

/** Strip mentions of the real owner from text content */
function anonymize(input: unknown, owner: string): string {
  const text = typeof input === "string" ? input : Array.isArray(input) ? input.join(" ") : String(input ?? "");
  if (!text) return text;
  const agent = agentName(owner);
  const escaped = owner.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text
    .replace(new RegExp(escaped, "gi"), agent)
    .replace(/https?:\/\/[^\s,)>'"]+/g, "[redacted-url]");
}

// ── Kit slug transforms ────────────────────────────────────────────────────────

/** Some JourneyKits slugs conflict with our existing seed kits — prefix to avoid collisions */
const SLUG_PREFIXES: Record<string, string> = {
  "deep-research": "jk-deep-research",
  "daily-brief":   "jk-daily-brief",
};

function safeSlug(slug: string): string {
  return SLUG_PREFIXES[slug] ?? slug;
}

// ── JourneyKits API types ──────────────────────────────────────────────────────

interface JKManifest {
  slug: string;
  title: string;
  summary: string;
  description?: string;
  version: string;
  tags?: string[];
  model?: { provider: string; name: string; hosting?: string };
  tools?: string[];
  skills?: string[];
  prerequisites?: string | string[];
  services?: Array<{ name: string; kind?: string; role?: string; setup?: string }>;
  parameters?: Array<{ name: string; value?: string; description?: string }>;
  inputs?: Array<{ name: string; description?: string }>;
  outputs?: Array<{ name: string; description?: string }>;
  failuresOvercome?: Array<{ problem: string; resolution: string; scope?: string }>;
  useCases?: string[];
  selfContained?: boolean;
  requiredResources?: Array<{ resourceId: string; kind: string; purpose?: string; deliveryMethod?: string }>;
}

interface JKRevision {
  id: string;
  manifest: JKManifest;
}

interface JKKit {
  owner: string;
  slug: string;
  title: string;
  summary: string;
  latestReleaseTag?: string;
  revisions: JKRevision[];
}

interface JKListItem {
  kitRef: string;
  owner: string;
  slug: string;
  title: string;
  summary: string;
  topTag?: string;
  latestApprovedReleaseTag?: string;
}

// ── Section builders ───────────────────────────────────────────────────────────

function buildGoal(m: JKManifest, owner: string): string {
  const desc = m.description || m.summary;
  return anonymize(desc, owner);
}

function buildWhenToUse(m: JKManifest, owner: string): string {
  if (m.useCases && m.useCases.length > 0) {
    return anonymize(m.useCases.map(u => `- ${u}`).join("\n"), owner);
  }
  // Derive from tags/summary
  const tag = (m.tags || []).slice(0, 3).join(", ");
  return `Use this kit when you need to automate ${m.summary.toLowerCase()}. Relevant domains: ${tag || "general automation"}.`;
}

function buildSetup(m: JKManifest, owner: string): string {
  const lines: string[] = [];

  // Prerequisites
  if (m.prerequisites) {
    const pre = Array.isArray(m.prerequisites) ? m.prerequisites : [m.prerequisites];
    pre.forEach(p => lines.push(`- ${anonymize(p, owner)}`));
  }

  // Services
  if (m.services && m.services.length > 0) {
    m.services.forEach(svc => {
      lines.push(`- **${anonymize(svc.name, owner)}**: ${anonymize(svc.setup || svc.role || svc.kind || "", owner)}`);
    });
  }

  // Parameters
  if (m.parameters && m.parameters.length > 0) {
    lines.push("");
    lines.push("Configure the following parameters:");
    m.parameters.forEach(p => {
      lines.push(`- \`${p.name}\` — ${anonymize(p.description || "", owner)}${p.value ? ` (default: ${p.value})` : ""}`);
    });
  }

  // Required resources
  if (m.requiredResources && m.requiredResources.length > 0) {
    lines.push("");
    lines.push("Required resource bindings:");
    m.requiredResources.forEach(r => {
      lines.push(`- ${r.resourceId} (${r.kind}): ${anonymize(r.purpose || "", owner)}`);
    });
  }

  if (lines.length === 0) {
    const model = m.model ? `${m.model.provider} ${m.model.name}` : "a compatible LLM";
    lines.push(`- Ensure access to ${anonymize(model, owner)}`);
    lines.push("- Configure API credentials via environment variables");
    lines.push("- Review the inputs section for required data");
  }

  return lines.join("\n");
}

function buildSteps(m: JKManifest, owner: string): string {
  const lines: string[] = [];

  // Inputs → outputs flow
  if (m.inputs && m.inputs.length > 0) {
    lines.push("**Inputs required:**");
    m.inputs.forEach(i => {
      lines.push(`- \`${i.name}\`: ${anonymize(i.description || "", owner)}`);
    });
    lines.push("");
  }

  // Describe execution from description if rich enough
  const desc = anonymize(m.description || m.summary, owner);
  const sentences = desc.split(/\.\s+/).filter(s => s.trim().length > 20).slice(0, 4);
  if (sentences.length > 0) {
    sentences.forEach((s, i) => {
      lines.push(`${i + 1}. ${s.trim().replace(/\.$/, "")}.`);
    });
  } else {
    lines.push(`1. Initialize and validate all required inputs and credentials.`);
    lines.push(`2. Execute the core workflow: ${anonymize(m.summary, owner)}.`);
    lines.push(`3. Review outputs and verify completion.`);
  }

  if (m.outputs && m.outputs.length > 0) {
    lines.push("");
    lines.push("**Expected outputs:**");
    m.outputs.forEach(o => {
      lines.push(`- \`${o.name}\`: ${anonymize(o.description || "", owner)}`);
    });
  }

  return lines.join("\n");
}

function buildConstraints(m: JKManifest, _owner: string): string {
  const lines: string[] = [];

  if (m.selfContained !== undefined) {
    if (m.selfContained) {
      lines.push("- Self-contained: no external dependencies beyond what is listed in Setup.");
    } else {
      lines.push("- Requires external services configured in Setup before running.");
    }
  }

  const modelName = m.model?.name ?? "the configured model";
  lines.push(`- Designed for ${modelName}; other models may produce different output quality.`);
  lines.push("- Do not run with production credentials during initial testing.");

  if ((m.services || []).length > 0) {
    lines.push(`- Requires ${m.services!.length} external service(s) — see Setup for configuration.`);
  }

  if (lines.length === 0) {
    lines.push("- Review outputs before acting on them in production environments.");
    lines.push("- Follow your organization's data-handling policies for any sensitive inputs.");
  }

  return lines.join("\n");
}

function buildSafetyNotes(m: JKManifest, owner: string): string {
  const lines: string[] = [];

  if (m.failuresOvercome && m.failuresOvercome.length > 0) {
    lines.push("Known edge cases and resolutions:");
    m.failuresOvercome.forEach(f => {
      lines.push(`- **${anonymize(f.problem, owner)}** → ${anonymize(f.resolution, owner)}`);
    });
    lines.push("");
  }

  lines.push("- Never embed API keys or secrets in kit files; use environment variables.");
  lines.push("- Validate all inputs before passing them to external services.");
  lines.push("- Test in a sandboxed environment before deploying to production workflows.");

  return lines.join("\n");
}

// ── Kit markdown builder ───────────────────────────────────────────────────────

function buildKitMarkdown(kit: JKKit, manifest: JKManifest, owner: string): string {
  const slug = safeSlug(kit.slug);
  const title = anonymize(manifest.title, owner);
  const summary = anonymize(manifest.summary, owner);
  const version = manifest.version || "1.0.0";
  const tags = (manifest.tags || []).slice(0, 6).filter(t => t.length < 30);
  const tools = (manifest.tools || []).filter(t => t.length < 30);
  const skills = (manifest.skills || []).filter(s => s.length < 30);
  const provider = manifest.model?.provider || "openai";
  const modelName = manifest.model?.name || "gpt-4o";

  const frontmatter = [
    `---`,
    `schema: "kit/1.0"`,
    `slug: "${slug}"`,
    `title: "${title.replace(/"/g, "'")}"`,
    `summary: "${summary.replace(/"/g, "'").substring(0, 200)}"`,
    `version: "${version}"`,
    `model:`,
    `  provider: "${provider}"`,
    `  name: "${modelName}"`,
    `  hosting: "hosted"`,
    `tags: [${tags.map(t => `"${t}"`).join(", ")}]`,
    `tools: [${(tools.length ? tools : ["generic"]).map(t => `"${t}"`).join(", ")}]`,
    `skills: [${(skills.length ? skills : ["agent-workflow"]).map(s => `"${s}"`).join(", ")}]`,
    `---`,
  ].join("\n");

  const body = [
    `## Goal`,
    buildGoal(manifest, owner),
    ``,
    `## When to Use`,
    buildWhenToUse(manifest, owner),
    ``,
    `## Setup`,
    buildSetup(manifest, owner),
    ``,
    `## Steps`,
    buildSteps(manifest, owner),
    ``,
    `## Constraints`,
    buildConstraints(manifest, owner),
    ``,
    `## Safety Notes`,
    buildSafetyNotes(manifest, owner),
  ].join("\n");

  return `${frontmatter}\n\n${body}\n`;
}

// ── Synthetic analytics ────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function syntheticScore(tags: string[]): number {
  // Most community kits are decent quality: 7-9
  return rand(7, 9);
}

const TARGETS = ["generic", "claude-code", "cursor", "codex"] as const;

// ── Main seeder ───────────────────────────────────────────────────────────────

async function seedJourneyKits() {
  console.log("🌱 Seeding KitHub database with anonymized JourneyKits...\n");

  // 1. Create a shared "Community Curator" publisher profile
  const curatorUserId = "jk-curator-user-00000000";
  const curatorPublisherId = "jk-curator-publisher-0000";

  await db.insert(schema.users).values({
    id: curatorUserId,
    email: "curator@kithub.community",
    emailVerified: new Date(),
  }).onConflictDoNothing();

  await db.insert(schema.publisherProfiles).values({
    id: curatorPublisherId,
    userId: curatorUserId,
    agentName: "CommunityCurator",
  }).onConflictDoNothing();

  console.log("✅ Community Curator publisher profile ready\n");

  // 2. Fetch kit listing
  const listRes = await fetch("https://journeykits.ai/api/kits?limit=20");
  if (!listRes.ok) {
    throw new Error(`JourneyKits list failed: ${listRes.status}`);
  }
  const listData = (await listRes.json()) as { items: JKListItem[] };
  const items = listData.items || [];
  console.log(`📦 Found ${items.length} public kits on JourneyKits\n`);

  let seeded = 0;
  let skipped = 0;

  for (const item of items) {
    const { owner, slug } = item;

    try {
      // 3. Fetch full kit details
      const kitRes = await fetch(`https://journeykits.ai/api/kits/${owner}/${slug}`);
      if (!kitRes.ok) {
        console.warn(`  ⚠ Skipping ${owner}/${slug} — fetch failed (${kitRes.status})`);
        skipped++;
        continue;
      }

      const kitData = (await kitRes.json()) as { kit: JKKit };
      const kit = kitData.kit;

      // Use the latest revision manifest
      const latestRevision = kit.revisions[kit.revisions.length - 1];
      if (!latestRevision?.manifest) {
        console.warn(`  ⚠ Skipping ${owner}/${slug} — no manifest found`);
        skipped++;
        continue;
      }
      const manifest = latestRevision.manifest;

      // 4. Build anonymized kit/1.0 markdown
      const dbSlug = safeSlug(slug);
      const kitTitle = anonymize(manifest.title || item.title, owner);
      const kitSummary = anonymize(
        (manifest.summary || item.summary || "").substring(0, 500),
        owner,
      );
      const rawMd = buildKitMarkdown(kit, manifest, owner);
      const version = manifest.version || "1.0.0";
      const tags = (manifest.tags || (item.topTag ? [item.topTag] : [])).slice(0, 6);

      // 5. Upsert kit
      await db.insert(schema.kits).values({
        slug: dbSlug,
        publisherId: curatorPublisherId,
        title: kitTitle,
        summary: kitSummary,
      }).onConflictDoNothing();

      // 6. Upsert release (unique on slug+version)
      const releaseId = `jk-${dbSlug}-${version.replace(/\./g, "-")}`;
      await db.insert(schema.kitReleases).values({
        id: releaseId,
        kitSlug: dbSlug,
        version,
        rawMarkdown: rawMd,
        parsedFrontmatter: {
          schema: "kit/1.0",
          slug: dbSlug,
          title: kitTitle,
          version,
          model: manifest.model || { provider: "openai", name: "gpt-4o", hosting: "hosted" },
          tags,
          tools: manifest.tools || [],
          skills: manifest.skills || [],
        },
        conformanceLevel: "standard",
      }).onConflictDoNothing();

      // 7. Tags
      for (const tag of tags) {
        if (tag && tag.length < 50) {
          await db.insert(schema.kitTags).values({
            kitSlug: dbSlug,
            tag: tag.toLowerCase(),
          }).onConflictDoNothing();
        }
      }

      // 8. Safety scan (synthetic)
      const score = syntheticScore(tags);
      const findings = score >= 9
        ? [{ type: "tip" as const, message: "Consider adding a fileManifest for Full conformance" }]
        : score >= 7
        ? [{ type: "tip" as const, message: "Add failure recovery examples to improve score" }]
        : [{ type: "warning" as const, message: "Review constraints and safety sections for completeness" }];

      await db.insert(schema.kitReleaseScans).values({
        releaseId,
        score,
        findings,
        status: "passed",
      }).onConflictDoNothing();

      // 9. Synthetic install events (realistic counts, weighted by tag popularity)
      const installCount = rand(8, 250);
      for (let i = 0; i < installCount; i++) {
        await db.insert(schema.kitInstallEvents).values({
          kitSlug: dbSlug,
          target: TARGETS[i % TARGETS.length]!,
        });
      }

      const agent = agentName(owner);
      console.log(`  ✅ ${dbSlug} v${version} [${agent}] — score ${score}, ${installCount} installs`);
      seeded++;
    } catch (err) {
      console.warn(`  ⚠ Error processing ${owner}/${slug}:`, err instanceof Error ? err.message : err);
      skipped++;
    }
  }

  console.log(`\n🎉 Done! Seeded ${seeded} kits, skipped ${skipped}.\n`);
  await client.end();
}

seedJourneyKits().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
