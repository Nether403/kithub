import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

// ── Request Validation Schemas ──────────────────────────────────

const PublishBodySchema = z.object({
  rawMarkdown: z.string().min(50, "rawMarkdown is required and must be at least 50 characters"),
});

const LearningBodySchema = z.object({
  context: z.object({
    os: z.string().optional(),
    model: z.string().optional(),
    runtime: z.string().optional(),
    platform: z.string().optional(),
  }).optional().default({}),
  payload: z.string().min(10, "payload is required (at least 10 characters)"),
});

const SearchQuerySchema = z.object({
  q: z.string().max(200).optional(),
  tag: z.string().max(50).optional(),
  sort: z.enum(["installs", "score", "newest"]).optional().default("newest"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  mode: z.enum(["keyword", "semantic"]).optional().default("keyword"),
  related_to: z.string().max(120).optional(),
});
import {
  db, schema, eq, desc, sql,
  getKitBySlug, getLatestRelease, getLatestScan,
  getLearningsCount, getInstallCount, getViewCount,
  searchKitsPaginated, getTrendingKits, getAllReleases,
  getKitsByPublisherId, getEnrichedKitBySlug,
  getDailyInstalls, getDailyViews, getInstallsByTarget,
  semanticSearchKits, getRelatedKits, batchFetchKitsBySlugs,
  upsertKitEmbedding, isEmbeddingsEnabled, diffScans,
  type ScanFinding,
} from "@kithub/db";
import { generateInstallPayload, isValidTarget, parseKitMd, scanKit, SUPPORTED_TARGETS, type KitFrontmatter } from "@kithub/schema";

const errMsg = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);
import {
  requirePublisher, type JwtUser,
} from "../middleware/auth";
import { notifyOnInstall, notifyOnLearning } from "../services/notifications";

export const kitRoutes: FastifyPluginAsync = async (fastify) => {

  fastify.get("/", async (request, reply) => {
    const parsed = SearchQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation Error",
        message: parsed.error.issues.map(i => i.message).join("; "),
        statusCode: 400,
      });
    }
    const { q, tag, sort, page, limit, mode, related_to } = parsed.data;
    if (!db) {
      return reply.code(503).send({
        error: "Service Unavailable",
        message: "Database not connected.",
        statusCode: 503,
      });
    }

    // Related-to mode: ignore q/tag, return kits similar to the given slug
    if (related_to) {
      const target = await getKitBySlug(related_to);
      if (!target) {
        return reply.code(404).send({
          error: "Not Found",
          message: `Kit "${related_to}" not found.`,
          statusCode: 404,
        });
      }
      const { hits, mode: matchMode } = await getRelatedKits(db, related_to, limit);
      const slugs = hits.map(h => h.slug);
      const enriched = await batchFetchKitsBySlugs(slugs);
      // preserve hit order
      const ordered = slugs
        .map(s => enriched.find(k => k.slug === s))
        .filter((k): k is NonNullable<typeof k> => !!k);
      return {
        kits: ordered,
        total: ordered.length,
        page: 1,
        limit,
        totalPages: 1,
        mode: matchMode,
        relatedTo: related_to,
      };
    }

    // Semantic search mode
    if (mode === "semantic" && q) {
      const { hits, available } = await semanticSearchKits(db, q, { limit });
      if (available && hits.length > 0) {
        const slugs = hits.map(h => h.slug);
        const enriched = await batchFetchKitsBySlugs(slugs);
        const ordered = slugs
          .map(s => enriched.find(k => k.slug === s))
          .filter((k): k is NonNullable<typeof k> => !!k);
        return {
          kits: ordered,
          total: ordered.length,
          page: 1,
          limit,
          totalPages: 1,
          mode: "semantic",
        };
      }
      // Fall back to keyword if embeddings disabled or no hits
    }

    const result = await searchKitsPaginated({
      query: q,
      tag,
      sort,
      page,
      limit,
    });

    return { ...result, mode: "keyword" as const };
  });

  fastify.get("/trending", async (request, reply) => {
    if (!db) {
      return reply.code(503).send({
        error: "Service Unavailable",
        message: "Database not connected.",
        statusCode: 503,
      });
    }

    const trending = await getTrendingKits(3);
    return { kits: trending };
  });

  fastify.get("/mine", { preHandler: [requirePublisher] }, async (request, reply) => {
    if (!db) {
      return reply.code(503).send({
        error: "Service Unavailable",
        message: "Database not connected.",
        statusCode: 503,
      });
    }

    const jwtUser = request.authUser as JwtUser;
    const result = await getKitsByPublisherId(jwtUser.publisherId!);
    return { kits: result.kits, total: result.total };
  });
  fastify.get("/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    if (!db) {
      return reply.code(503).send({
        error: "Service Unavailable",
        message: "Database not connected.",
        statusCode: 503,
      });
    }

    const enriched = await getEnrichedKitBySlug(slug);
    if (!enriched) {
      return reply.code(404).send({
        error: "Not Found",
        message: `Kit "${slug}" not found.`,
        statusCode: 404,
      });
    }

    // Need rawMarkdown and parsedFrontmatter from the release record specifically
    const release = await getLatestRelease(slug);
    const learnings = await getLearningsCount(slug);
    const scan = release ? await getLatestScan(release.id) : null;

    return {
      slug: enriched.slug,
      title: enriched.title,
      summary: enriched.summary,
      publisherName: enriched.publisherName,
      publisherVerified: !!enriched.publisherVerifiedAt,
      version: enriched.version,
      rawMarkdown: release?.rawMarkdown ?? "",
      parsedFrontmatter: release?.parsedFrontmatter,
      conformanceLevel: release?.conformanceLevel ?? "standard",
      tags: enriched.tags,
      installs: enriched.installs,
      learningsCount: learnings,
      averageStars: enriched.averageStars ?? null,
      ratingCount: enriched.ratingCount ?? 0,
      scan: scan ? { score: scan.score, status: scan.status, findings: scan.findings } : null,
      createdAt: enriched.createdAt,
      updatedAt: enriched.updatedAt,
    };
  });

  // ── Scan history with diffs ─────────────────────────────────────
  fastify.get("/:slug/scans", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const { base, head } = request.query as { base?: string; head?: string };
    if (!db) {
      return reply.code(503).send({
        error: "Service Unavailable",
        message: "Database not connected.",
        statusCode: 503,
      });
    }
    const kit = await getKitBySlug(slug);
    if (!kit) {
      return reply.code(404).send({
        error: "Not Found",
        message: `Kit "${slug}" not found.`,
        statusCode: 404,
      });
    }

    const releases = await getAllReleases(slug);
    if (releases.length === 0) return { slug, scans: [], diffs: [], versions: [] };

    const scans = releases.map(r => ({
      version: r.version,
      releaseId: r.id,
      score: r.scan?.score ?? null,
      findings: (r.scan?.findings as ScanFinding[] | null) ?? [],
      createdAt: r.createdAt,
    }));

    const versions = scans.map(s => s.version);

    // If explicit base+head provided, return single targeted diff
    if (base && head) {
      const baseScan = scans.find(s => s.version === base);
      const headScan = scans.find(s => s.version === head);
      if (!baseScan || !headScan) {
        return reply.code(400).send({
          error: "Validation Error",
          message: `Unknown version(s). Available: ${versions.join(", ")}`,
          statusCode: 400,
          versions,
        });
      }
      const diff = diffScans({
        baseVersion: baseScan.version,
        baseScore: baseScan.score,
        baseFindings: baseScan.findings,
        headVersion: headScan.version,
        headScore: headScan.score,
        headFindings: headScan.findings,
      });
      return { slug, scans, diffs: [diff], versions };
    }

    // Otherwise return all adjacent diffs (newest first)
    const diffs: ReturnType<typeof diffScans>[] = [];
    for (let i = 0; i < scans.length - 1; i++) {
      const headScan = scans[i]!;
      const baseScan = scans[i + 1]!;
      diffs.push(diffScans({
        baseVersion: baseScan.version,
        baseScore: baseScan.score,
        baseFindings: baseScan.findings,
        headVersion: headScan.version,
        headScore: headScan.score,
        headFindings: headScan.findings,
      }));
    }

    return { slug, scans, diffs, versions };
  });

  fastify.get("/:slug/install", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const { target } = request.query as { target?: string };

    if (!target) {
      return reply.code(400).send({
        error: "Validation Error",
        message: "?target= parameter is required. Specify the agent harness to receive targeted install instructions.",
        statusCode: 400,
        allowedTargets: SUPPORTED_TARGETS,
        example: `/api/kits/${slug}/install?target=claude-code`,
      });
    }

    if (!isValidTarget(target)) {
      return reply.code(400).send({
        error: "Validation Error",
        message: `Invalid target: "${target}".`,
        statusCode: 400,
        allowedTargets: SUPPORTED_TARGETS,
      });
    }

    if (!db) {
      return reply.code(503).send({
        error: "Service Unavailable",
        message: "Database not connected.",
        statusCode: 503,
      });
    }

    const kit = await getKitBySlug(slug);
    if (!kit) {
      return reply.code(404).send({
        error: "Not Found",
        message: `Kit "${slug}" not found.`,
        statusCode: 404,
      });
    }

    const release = await getLatestRelease(slug);
    if (!release) {
      return reply.code(404).send({
        error: "Not Found",
        message: "No published release for this kit.",
        statusCode: 404,
      });
    }

    let frontmatter: KitFrontmatter | null = null;
    try {
      const parsed = parseKitMd(release.rawMarkdown);
      frontmatter = parsed.frontmatter;
    } catch {
      frontmatter = (release.parsedFrontmatter as KitFrontmatter | null) ?? null;
    }

    if (!frontmatter) {
      return reply.code(500).send({
        error: "Internal Server Error",
        message: "Unable to parse kit frontmatter.",
        statusCode: 500,
      });
    }

    await db.insert(schema.kitInstallEvents).values({ kitSlug: slug, target });

    notifyOnInstall(slug).catch((err) => {
      fastify.log.error({ err, kitSlug: slug }, "Install notification trigger failed");
    });

    const payload = generateInstallPayload(
      { frontmatter, rawMarkdown: release.rawMarkdown },
      target
    );

    return { ...payload, rawMarkdown: release.rawMarkdown };
  });

  fastify.post("/", {
    preHandler: [requirePublisher],
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 minute",
      },
    },
  }, async (request, reply) => {
    const parsed = PublishBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation Error",
        message: parsed.error.issues.map(i => i.message).join("; "),
        statusCode: 400,
      });
    }
    const { rawMarkdown } = parsed.data;
    if (!db) {
      return reply.code(503).send({
        error: "Service Unavailable",
        message: "Database not connected.",
        statusCode: 503,
      });
    }

    let kitData;
    try {
      kitData = parseKitMd(rawMarkdown);
    } catch (err) {
      return reply.code(422).send({
        error: "Validation Error",
        message: "Kit validation failed.",
        statusCode: 422,
        details: errMsg(err),
      });
    }

    const scanResult = scanKit(rawMarkdown, kitData.frontmatter);

    const jwtUser = request.authUser as JwtUser;
    const existingKit = await getKitBySlug(kitData.frontmatter.slug);
    if (existingKit) {
      if (existingKit.publisherId !== jwtUser.publisherId) {
        return reply.code(403).send({
          error: "Forbidden",
          message: "You don't own this kit slug.",
          statusCode: 403,
        });
      }
      await db.update(schema.kits)
        .set({ title: kitData.frontmatter.title, summary: kitData.frontmatter.summary, updatedAt: new Date() })
        .where(eq(schema.kits.slug, kitData.frontmatter.slug));
    } else {
      await db.insert(schema.kits).values({
        slug: kitData.frontmatter.slug,
        publisherId: jwtUser.publisherId!,
        title: kitData.frontmatter.title,
        summary: kitData.frontmatter.summary,
      });
    }

    const releaseId = crypto.randomUUID();
    await db.insert(schema.kitReleases).values({
      id: releaseId,
      kitSlug: kitData.frontmatter.slug,
      version: kitData.frontmatter.version,
      rawMarkdown,
      parsedFrontmatter: kitData.frontmatter,
      conformanceLevel: kitData.conformanceLevel,
    });

    await db.insert(schema.kitReleaseScans).values({
      releaseId,
      score: scanResult.score,
      findings: scanResult.findings,
      status: scanResult.passed ? "passed" : "failed",
    });

    await db.delete(schema.kitTags).where(eq(schema.kitTags.kitSlug, kitData.frontmatter.slug));
    if (kitData.frontmatter.tags.length > 0) {
      await db.insert(schema.kitTags).values(
        kitData.frontmatter.tags.map((tag: string) => ({ kitSlug: kitData.frontmatter.slug, tag }))
      );
    }

    // Best-effort embedding generation (env-gated; never blocks publish)
    if (isEmbeddingsEnabled()) {
      upsertKitEmbedding(db, {
        kitSlug: kitData.frontmatter.slug,
        releaseId,
        title: kitData.frontmatter.title,
        summary: kitData.frontmatter.summary,
        tags: kitData.frontmatter.tags,
        body: kitData.body
          ? `${kitData.body.goal}\n\n${kitData.body.whenToUse}\n\n${kitData.body.steps}`
          : undefined,
      }).catch(err => {
        fastify.log.warn({ err, slug: kitData.frontmatter.slug }, "Embedding generation failed (non-fatal)");
      });
    }

    return {
      status: scanResult.passed ? "published" : "blocked",
      slug: kitData.frontmatter.slug,
      version: kitData.frontmatter.version,
      conformanceLevel: kitData.conformanceLevel,
      scan: {
        score: scanResult.score,
        passed: scanResult.passed,
        findings: scanResult.findings,
        tips: scanResult.tips,
      },
      embeddingsEnabled: isEmbeddingsEnabled(),
    };
  });

  fastify.delete("/:slug", { preHandler: [requirePublisher] }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    if (!db) {
      return reply.code(503).send({
        error: "Service Unavailable",
        message: "Database not connected.",
        statusCode: 503,
      });
    }

    const kit = await getKitBySlug(slug);
    if (!kit) {
      return reply.code(404).send({
        error: "Not Found",
        message: `Kit "${slug}" not found.`,
        statusCode: 404,
      });
    }

    const jwtUser = request.authUser as JwtUser;
    if (kit.publisherId !== jwtUser.publisherId) {
      return reply.code(403).send({
        error: "Forbidden",
        message: "You don't own this kit.",
        statusCode: 403,
      });
    }

    if (kit.unpublishedAt) {
      return reply.code(400).send({
        error: "Validation Error",
        message: "Kit is already unpublished.",
        statusCode: 400,
      });
    }

    await db.update(schema.kits)
      .set({ unpublishedAt: new Date() })
      .where(eq(schema.kits.slug, slug));

    return { status: "unpublished", slug };
  });

  fastify.get("/:slug/versions", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    if (!db) {
      return reply.code(503).send({
        error: "Service Unavailable",
        message: "Database not connected.",
        statusCode: 503,
      });
    }

    const kit = await getKitBySlug(slug);
    if (!kit) {
      return reply.code(404).send({
        error: "Not Found",
        message: `Kit "${slug}" not found.`,
        statusCode: 404,
      });
    }
    if (kit.unpublishedAt) {
      return reply.code(404).send({
        error: "Not Found",
        message: `Kit "${slug}" has been unpublished.`,
        statusCode: 404,
      });
    }

    const versions = await getAllReleases(slug);
    return { slug, versions };
  });
  fastify.post("/:slug/learnings", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const parsed = LearningBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation Error",
        message: parsed.error.issues.map(i => i.message).join("; "),
        statusCode: 400,
      });
    }
    const { context, payload } = parsed.data;
    if (!db) {
      return reply.code(503).send({
        error: "Service Unavailable",
        message: "Database not connected.",
        statusCode: 503,
      });
    }

    const kit = await getKitBySlug(slug);
    if (!kit) {
      return reply.code(404).send({
        error: "Not Found",
        message: `Kit "${slug}" not found.`,
        statusCode: 404,
      });
    }

    await db.insert(schema.learnings).values({
      kitSlug: slug,
      context: context ?? {},
      payload,
    });

    const count = await getLearningsCount(slug);

    notifyOnLearning(slug).catch((err) => {
      fastify.log.error({ err, kitSlug: slug }, "Learning notification trigger failed");
    });

    return { status: "submitted", kitSlug: slug, totalLearnings: count };
  });

  fastify.post("/:slug/view", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    if (!db) {
      return reply.code(503).send({
        error: "Service Unavailable",
        message: "Database not connected.",
        statusCode: 503,
      });
    }

    const kit = await getKitBySlug(slug);
    if (!kit || kit.unpublishedAt) {
      return reply.code(404).send({
        error: "Not Found",
        message: `Kit "${slug}" not found.`,
        statusCode: 404,
      });
    }

    await db.insert(schema.kitViewEvents).values({
      kitSlug: slug,
    });

    return reply.code(204).send();
  });

  fastify.get("/:slug/analytics", { preHandler: [requirePublisher] }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    if (!db) {
      return reply.code(503).send({
        error: "Service Unavailable",
        message: "Database not connected.",
        statusCode: 503,
      });
    }

    const kit = await getKitBySlug(slug);
    if (!kit) {
      return reply.code(404).send({
        error: "Not Found",
        message: `Kit "${slug}" not found.`,
        statusCode: 404,
      });
    }

    const jwtUser = request.authUser as JwtUser;
    if (kit.publisherId !== jwtUser.publisherId) {
      return reply.code(403).send({
        error: "Forbidden",
        message: "You don't own this kit.",
        statusCode: 403,
      });
    }

    const [dailyInstalls, dailyViews, byTarget, totalInstalls, totalViews] = await Promise.all([
      getDailyInstalls(slug, 30),
      getDailyViews(slug, 30),
      getInstallsByTarget(slug),
      getInstallCount(slug),
      getViewCount(slug),
    ]);

    return {
      slug,
      totalInstalls,
      totalViews,
      dailyInstalls,
      dailyViews,
      byTarget,
    };
  });
};
