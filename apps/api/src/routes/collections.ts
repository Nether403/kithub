import type { FastifyPluginAsync } from "fastify";
import {
  db,
  listCollections,
  getCollection,
  batchFetchKitsBySlugs,
} from "@kithub/db";
import { isValidTarget, SUPPORTED_TARGETS } from "@kithub/schema";

export const collectionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", async (request, reply) => {
    if (!db) {
      return reply.code(503).send({
        error: "Service Unavailable",
        message: "Database not connected.",
        statusCode: 503,
      });
    }

    const rows = await listCollections(db);

    // Enrich each collection with summary stats
    const enriched = await Promise.all(
      rows.map(async (c) => {
        const kits = await batchFetchKitsBySlugs(c.kitSlugs);
        const totalInstalls = kits.reduce((s, k) => s + k.installs, 0);
        const avgStarsRaw = kits
          .map((k) => k.averageStars)
          .filter((v): v is number => v !== null && v !== undefined);
        const avgStars =
          avgStarsRaw.length > 0
            ? Math.round((avgStarsRaw.reduce((a, b) => a + b, 0) / avgStarsRaw.length) * 10) / 10
            : null;
        return {
          slug: c.slug,
          title: c.title,
          description: c.description,
          curator: c.curator,
          emoji: c.emoji,
          kitCount: kits.length,
          totalInstalls,
          averageStars: avgStars,
          featured: c.featured > 0,
          updatedAt: c.updatedAt,
        };
      })
    );

    return { collections: enriched };
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

    const collection = await getCollection(db, slug);
    if (!collection) {
      return reply.code(404).send({
        error: "Not Found",
        message: `Collection "${slug}" not found.`,
        statusCode: 404,
      });
    }

    const kits = await batchFetchKitsBySlugs(collection.kitSlugs);
    // Preserve curator order from kitSlugs
    const orderedKits = collection.kitSlugs
      .map((s) => kits.find((k) => k.slug === s))
      .filter((k): k is NonNullable<typeof k> => !!k);

    return {
      slug: collection.slug,
      title: collection.title,
      description: collection.description,
      curator: collection.curator,
      emoji: collection.emoji,
      featured: collection.featured > 0,
      kits: orderedKits,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    };
  });

  fastify.get("/:slug/install", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const { target } = request.query as { target?: string };

    if (target && !isValidTarget(target)) {
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

    const collection = await getCollection(db, slug);
    if (!collection) {
      return reply.code(404).send({
        error: "Not Found",
        message: `Collection "${slug}" not found.`,
        statusCode: 404,
      });
    }

    const kits = await batchFetchKitsBySlugs(collection.kitSlugs);
    const orderedSlugs = collection.kitSlugs.filter((s) => kits.some((k) => k.slug === s));

    const rawBase = (process.env.PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || "https://skillkithub.com").replace(/\/$/, "");
    const apiBase = rawBase.endsWith("/api") ? rawBase : `${rawBase}/api`;
    const targetSuffix = target ? `?target=${encodeURIComponent(target)}` : "";

    const installUrls = orderedSlugs.map((s) => `${apiBase}/kits/${s}/install${targetSuffix}`);
    const cliCommand = `npx @kithub/cli install-collection ${collection.slug}${target ? ` --target=${target}` : ""}`;

    const instructions =
      `# Install Stack: ${collection.title}\n\n` +
      `${collection.description}\n\n` +
      `## One-liner (CLI)\n\n` +
      `\`\`\`bash\n${cliCommand}\n\`\`\`\n\n` +
      `## Or fetch each kit manually\n\n` +
      (target
        ? `Fetch each install payload below for the **${target}** target and apply it (in order).\n\n`
        : `Fetch each install payload below and apply it (in order). Append \`?target=<your-agent>\` to scope to a specific agent harness (e.g. \`claude-code\`, \`cursor\`, \`codex\`, \`mcp\`, \`generic\`).\n\n`) +
      installUrls.map((u, i) => `${i + 1}. ${u}`).join("\n") +
      `\n\nSupported targets: ${SUPPORTED_TARGETS.join(", ")}`;

    return {
      slug: collection.slug,
      title: collection.title,
      kitSlugs: orderedSlugs,
      target: target ?? null,
      installUrls,
      cliCommand,
      instructions,
      supportedTargets: SUPPORTED_TARGETS,
    };
  });
};
