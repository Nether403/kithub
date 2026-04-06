import type { FastifyPluginAsync } from "fastify";
import {
  db, schema, eq, desc, ilike, sql,
  getKitBySlug, getLatestRelease, getKitTags,
  getInstallCount, getLearningsCount, getLatestScan,
  searchKits,
} from "@kithub/db";
import { parseKitMd } from "@kithub/schema";
import { scanKit } from "@kithub/schema/src/scanner";
import { generateInstallPayload, isValidTarget, SUPPORTED_TARGETS } from "@kithub/schema/src/targets";
import { requirePublisher } from "../middleware/auth";

export const kitRoutes: FastifyPluginAsync = async (fastify) => {

  // ═══════════════════════════════════════════════════════════════
  // GET /api/kits — Browse & Search the Registry
  // ═══════════════════════════════════════════════════════════════
  fastify.get("/", async (request) => {
    const { q, tag } = request.query as { q?: string; tag?: string };
    if (!db) return { kits: [] };

    const rawKits = await searchKits(q, tag);

    // Enrich each kit with stats
    const enriched = await Promise.all(
      rawKits.map(async (kit) => {
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

    return { kits: enriched, total: enriched.length };
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /api/kits/:slug — Kit Detail
  // ═══════════════════════════════════════════════════════════════
  fastify.get("/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    if (!db) return reply.code(503).send({ error: "Database not connected" });

    const kit = await getKitBySlug(slug);
    if (!kit) return reply.code(404).send({ error: `Kit "${slug}" not found.` });

    const release = await getLatestRelease(slug);
    const tags = await getKitTags(slug);
    const installs = await getInstallCount(slug);
    const learnings = await getLearningsCount(slug);
    const scan = release ? await getLatestScan(release.id) : null;

    return {
      slug: kit.slug,
      title: kit.title,
      summary: kit.summary,
      version: release?.version ?? "0.0.0",
      rawMarkdown: release?.rawMarkdown ?? "",
      parsedFrontmatter: release?.parsedFrontmatter,
      conformanceLevel: release?.conformanceLevel ?? "standard",
      tags: tags.map(t => t.tag),
      installs,
      learningsCount: learnings,
      scan: scan ? { score: scan.score, status: scan.status, findings: scan.findings } : null,
      resourceBindings: kit.resourceBindings,
      createdAt: kit.createdAt,
      updatedAt: kit.updatedAt,
    };
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /api/kits/:slug/install — Install Payload (Target Contract)
  // ═══════════════════════════════════════════════════════════════
  fastify.get("/:slug/install", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const { target } = request.query as { target?: string };

    // Enforce ?target= as per PRD: 400 if omitted
    if (!target) {
      return reply.code(400).send({
        error: "?target= parameter is required",
        message: "Specify the agent harness to receive targeted install instructions.",
        allowedTargets: SUPPORTED_TARGETS,
        example: `/api/kits/${slug}/install?target=claude-code`,
      });
    }

    if (!isValidTarget(target)) {
      return reply.code(400).send({
        error: `Invalid target: "${target}"`,
        allowedTargets: SUPPORTED_TARGETS,
      });
    }

    if (!db) return reply.code(503).send({ error: "Database not connected" });

    const kit = await getKitBySlug(slug);
    if (!kit) return reply.code(404).send({ error: `Kit "${slug}" not found.` });

    const release = await getLatestRelease(slug);
    if (!release) return reply.code(404).send({ error: "No published release for this kit." });

    // Try to parse frontmatter from stored data
    let frontmatter;
    try {
      const parsed = parseKitMd(release.rawMarkdown);
      frontmatter = parsed.frontmatter;
    } catch {
      // Fall back to stored parsed frontmatter
      frontmatter = release.parsedFrontmatter as any;
    }

    if (!frontmatter) {
      return reply.code(500).send({ error: "Unable to parse kit frontmatter." });
    }

    // Record install event
    await db.insert(schema.kitInstallEvents).values({ kitSlug: slug, target });

    // Generate target-specific payload
    const payload = generateInstallPayload(
      { frontmatter, rawMarkdown: release.rawMarkdown },
      target
    );

    return payload;
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /api/kits — Publish a Kit (Auth Required)
  // ═══════════════════════════════════════════════════════════════
  fastify.post("/", { preHandler: [requirePublisher] }, async (request, reply) => {
    const { rawMarkdown } = request.body as { rawMarkdown: string };

    if (!rawMarkdown) {
      return reply.code(400).send({ error: "rawMarkdown is required. Paste your kit.md content." });
    }
    if (!db) return reply.code(503).send({ error: "Database not connected" });

    // Parse and validate the kit.md
    let parsed;
    try {
      parsed = parseKitMd(rawMarkdown);
    } catch (err: any) {
      return reply.code(422).send({
        error: "Kit validation failed",
        details: err.message,
      });
    }

    // Run safety scanner
    const scanResult = scanKit(rawMarkdown, parsed.frontmatter);

    // Upsert the kit
    const existingKit = await getKitBySlug(parsed.frontmatter.slug);
    if (existingKit) {
      // Check ownership
      if (existingKit.publisherId !== request.user!.publisherId) {
        return reply.code(403).send({ error: "You don't own this kit slug." });
      }
      await db.update(schema.kits)
        .set({ title: parsed.frontmatter.title, summary: parsed.frontmatter.summary, updatedAt: new Date() })
        .where(eq(schema.kits.slug, parsed.frontmatter.slug));
    } else {
      await db.insert(schema.kits).values({
        slug: parsed.frontmatter.slug,
        publisherId: request.user!.publisherId!,
        title: parsed.frontmatter.title,
        summary: parsed.frontmatter.summary,
      });
    }

    // Create release
    const releaseId = crypto.randomUUID();
    await db.insert(schema.kitReleases).values({
      id: releaseId,
      kitSlug: parsed.frontmatter.slug,
      version: parsed.frontmatter.version,
      rawMarkdown,
      parsedFrontmatter: parsed.frontmatter as any,
      conformanceLevel: parsed.conformanceLevel,
    });

    // Save scan results
    await db.insert(schema.kitReleaseScans).values({
      releaseId,
      score: scanResult.score,
      findings: scanResult.findings as any,
      status: scanResult.passed ? "passed" : "failed",
    });

    // Update tags
    await db.delete(schema.kitTags).where(eq(schema.kitTags.kitSlug, parsed.frontmatter.slug));
    if (parsed.frontmatter.tags.length > 0) {
      await db.insert(schema.kitTags).values(
        parsed.frontmatter.tags.map(tag => ({ kitSlug: parsed.frontmatter.slug, tag }))
      );
    }

    return {
      status: scanResult.passed ? "published" : "blocked",
      slug: parsed.frontmatter.slug,
      version: parsed.frontmatter.version,
      conformanceLevel: parsed.conformanceLevel,
      scan: {
        score: scanResult.score,
        passed: scanResult.passed,
        findings: scanResult.findings,
        tips: scanResult.tips,
      },
    };
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /api/kits/:slug/learnings — Submit a Learning
  // ═══════════════════════════════════════════════════════════════
  fastify.post("/:slug/learnings", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const { context, payload } = request.body as {
      context: { os?: string; model?: string; runtime?: string; platform?: string };
      payload: string;
    };

    if (!payload) return reply.code(400).send({ error: "payload is required (description of the learning)." });
    if (!db) return reply.code(503).send({ error: "Database not connected" });

    const kit = await getKitBySlug(slug);
    if (!kit) return reply.code(404).send({ error: `Kit "${slug}" not found.` });

    await db.insert(schema.learnings).values({
      kitSlug: slug,
      context: context ?? {},
      payload,
    });

    const count = await getLearningsCount(slug);

    return { status: "submitted", kitSlug: slug, totalLearnings: count };
  });
};
