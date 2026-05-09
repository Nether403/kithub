import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { db, eq, schema } from "@kithub/db";

function getAdminSecretHeader(request: FastifyRequest): string | undefined {
  const value = request.headers["x-admin-secret"];
  return Array.isArray(value) ? value[0] : value;
}

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/publishers/:id/verify", async (request, reply) => {
    const configuredSecret = process.env.ADMIN_API_SECRET;
    if (!configuredSecret) {
      return reply.code(503).send({
        error: "Service Unavailable",
        message: "ADMIN_API_SECRET is not configured.",
        statusCode: 503,
      });
    }

    if (getAdminSecretHeader(request) !== configuredSecret) {
      return reply.code(401).send({
        error: "Unauthorized",
        message: "Invalid admin secret.",
        statusCode: 401,
      });
    }

    if (!db) {
      return reply.code(503).send({
        error: "Service Unavailable",
        message: "Database not connected.",
        statusCode: 503,
      });
    }

    const { id } = request.params as { id: string };
    const [publisher] = await db
      .select()
      .from(schema.publisherProfiles)
      .where(eq(schema.publisherProfiles.id, id))
      .limit(1);

    if (!publisher) {
      return reply.code(404).send({
        error: "Not Found",
        message: `Publisher profile "${id}" not found.`,
        statusCode: 404,
      });
    }

    const verifiedAt = new Date();
    await db
      .update(schema.publisherProfiles)
      .set({ verifiedAt })
      .where(eq(schema.publisherProfiles.id, id));

    return {
      id: publisher.id,
      agentName: publisher.agentName,
      verified: true,
      verifiedAt,
    };
  });
};
