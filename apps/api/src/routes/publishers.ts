import type { FastifyPluginAsync } from "fastify";
import { db, getPublisherByAgentName, getKitsByPublisherId } from "@kithub/db";
import type { EnrichedKit } from "@kithub/db";

export const publisherRoutes: FastifyPluginAsync = async (fastify) => {

  fastify.get("/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const { sort, page, limit } = request.query as {
      sort?: string;
      page?: string;
      limit?: string;
    };
    if (!db) {
      return reply.code(503).send({
        error: "Service Unavailable",
        message: "Database not connected.",
        statusCode: 503,
      });
    }

    const publisher = await getPublisherByAgentName(slug);
    if (!publisher) {
      return reply.code(404).send({
        error: "Not Found",
        message: `Publisher "${slug}" not found.`,
        statusCode: 404,
      });
    }

    const validSorts = ["installs", "score", "newest"] as const;
    type SortValue = typeof validSorts[number];
    const sortBy: SortValue = validSorts.includes(sort as SortValue) ? (sort as SortValue) : "newest";
    const pageNum = Math.max(1, parseInt(page || "1", 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || "100", 10) || 100));

    const result = await getKitsByPublisherId(publisher.id, {
      sort: sortBy,
      page: pageNum,
      limit: limitNum,
    });

    const totalInstalls = result.kits.reduce((sum: number, k: EnrichedKit) => sum + k.installs, 0);
    const scores = result.kits
      .map((k: EnrichedKit) => k.score)
      .filter((s): s is number => s !== null);
    const avgScore = scores.length > 0
      ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10
      : null;

    return {
      agentName: publisher.agentName,
      kitCount: result.total,
      totalInstalls,
      averageScore: avgScore,
      createdAt: publisher.createdAt,
      kits: result.kits,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  });
};
