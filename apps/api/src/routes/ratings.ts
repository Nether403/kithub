import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  db,
  getKitBySlug,
  listRatings,
  upsertRating,
  getRatingsSummary,
} from "@kithub/db";
import { requirePublisher, type JwtUser } from "../middleware/auth";

const RatingBodySchema = z.object({
  stars: z.coerce.number().int().min(1).max(5),
  body: z.string().max(2000).optional(),
});

export const ratingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/:slug/ratings", async (request, reply) => {
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

    const [summary, ratings] = await Promise.all([
      getRatingsSummary(db, slug),
      listRatings(db, slug, 50),
    ]);

    return {
      slug,
      averageStars: summary.averageStars,
      ratingCount: summary.ratingCount,
      ratings: ratings.map((r) => ({
        id: r.id,
        stars: r.stars,
        body: r.body,
        publisherName: r.publisherName,
        verified: r.verifiedAt !== null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    };
  });

  fastify.post(
    "/:slug/ratings",
    {
      preHandler: [requirePublisher],
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const parsed = RatingBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Validation Error",
          message: parsed.error.issues.map((i) => i.message).join("; "),
          statusCode: 400,
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

      const jwtUser = request.authUser as JwtUser;
      if (kit.publisherId === jwtUser.publisherId) {
        return reply.code(400).send({
          error: "Validation Error",
          message: "You cannot rate your own kit.",
          statusCode: 400,
        });
      }

      const { stars, body } = parsed.data;
      const result = await upsertRating(db, {
        kitSlug: slug,
        userId: jwtUser.userId,
        publisherId: jwtUser.publisherId!,
        stars,
        body: body ?? null,
      });

      const summary = await getRatingsSummary(db, slug);
      return {
        status: result.status,
        ratingId: result.id,
        averageStars: summary.averageStars,
        ratingCount: summary.ratingCount,
      };
    }
  );
};
