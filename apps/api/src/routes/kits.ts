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
});
import {
  db, schema, eq, desc, ilike, sql,
  getKitBySlug, getLatestRelease, getKitTags,
  getInstallCount, getLearningsCount, getLatestScan,
  searchKits, searchKitsPaginated, getTrendingKits, getAllReleases,
  getDailyInstalls, getInstallsByTarget,
  getPublisherNameMap,
} from "@kithub/db";
import { parseKitMd } from "@kithub/schema";
import { scanKit } from "@kithub/schema/src/scanner";
import { generateInstallPayload, isValidTarget, SUPPORTED_TARGETS } from "@kithub/schema/src/targets";
import { requirePublisher, type JwtUser } from "../middleware/auth";
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
    const { q, tag, sort, page, limit } = parsed.data;
    if (!db) {
      return reply.code(503).send({
        error: "Service Unavailable",
        message: "Database not connected.",
        statusCode: 503,
      });
    }

    const sortBy = sort;
    const pageNum = page;
    const limitNum = limit;

    const result = await searchKitsPaginated({
      query: q,
      tag,
      sort: sortBy,
      page: pageNum,
      limit: limitNum,
    });

    return result;
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

    const jwtUser = request.user as JwtUser;
    const myKits = await db.select().from(schema.kits)
      .where(
        eq(schema.kits.publisherId, jwtUser.publisherId!)
      )
      .orderBy(desc(schema.kits.updatedAt));

    const publishedKits = myKits.filter(k => !k.unpublishedAt);

    const enriched = await Promise.all(
      publishedKits.map(async (kit) => {
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
  fastify.get("/:slug", async (request, reply) => {
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

    const release = await getLatestRelease(slug);
    const tags = await getKitTags(slug);
    const installs = await getInstallCount(slug);
    const learnings = await getLearningsCount(slug);
    const scan = release ? await getLatestScan(release.id) : null;
    const publisherMap = await getPublisherNameMap();
    const publisherName = publisherMap[kit.publisherId] ?? null;

    return {
      slug: kit.slug,
      title: kit.title,
      summary: kit.summary,
      publisherName,
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

    let frontmatter;
    try {
      const parsed = parseKitMd(release.rawMarkdown);
      frontmatter = parsed.frontmatter;
    } catch {
      frontmatter = release.parsedFrontmatter as any;
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
    } catch (err: any) {
      return reply.code(422).send({
        error: "Validation Error",
        message: "Kit validation failed.",
        statusCode: 422,
        details: err.message,
      });
    }

    const scanResult = scanKit(rawMarkdown, kitData.frontmatter);

    const jwtUser = request.user as JwtUser;
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
      parsedFrontmatter: kitData.frontmatter as any,
      conformanceLevel: kitData.conformanceLevel,
    });

    await db.insert(schema.kitReleaseScans).values({
      releaseId,
      score: scanResult.score,
      findings: scanResult.findings as any,
      status: scanResult.passed ? "passed" : "failed",
    });

    await db.delete(schema.kitTags).where(eq(schema.kitTags.kitSlug, kitData.frontmatter.slug));
    if (kitData.frontmatter.tags.length > 0) {
      await db.insert(schema.kitTags).values(
        kitData.frontmatter.tags.map((tag: string) => ({ kitSlug: kitData.frontmatter.slug, tag }))
      );
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

    const jwtUser = request.user as JwtUser;
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

    const jwtUser = request.user as JwtUser;
    if (kit.publisherId !== jwtUser.publisherId) {
      return reply.code(403).send({
        error: "Forbidden",
        message: "You don't own this kit.",
        statusCode: 403,
      });
    }

    const [dailyInstalls, byTarget, totalInstalls] = await Promise.all([
      getDailyInstalls(slug, 30),
      getInstallsByTarget(slug),
      getInstallCount(slug),
    ]);

    return {
      slug,
      totalInstalls,
      dailyInstalls,
      byTarget,
    };
  });
};
