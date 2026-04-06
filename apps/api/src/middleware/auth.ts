import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";

declare module "fastify" {
  interface FastifyRequest {
    user?: { userId: string; publisherId?: string; email: string };
  }
}

/**
 * JWT authentication middleware for Fastify.
 * Decorates request.user when a valid Bearer token is present.
 */
export const authMiddleware: FastifyPluginAsync = fp(async (fastify) => {
  fastify.decorateRequest("user", undefined);

  fastify.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for public routes
    const publicPaths = [
      "/api/auth/register",
      "/api/auth/verify-email",
      "/api/auth/login",
      "/api/kits",
      "/docs",
      "/health",
    ];

    const isPublic = publicPaths.some(p => {
      if (request.url === p) return true;
      // Allow GET requests to /api/kits/* (registry browsing is public)
      if (request.method === "GET" && request.url.startsWith("/api/kits")) return true;
      return false;
    });

    if (isPublic) return;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      reply.code(401).send({ error: "Authentication required. Include Bearer token." });
      return;
    }

    try {
      const token = authHeader.slice(7);
      const decoded = fastify.jwt.verify<{ userId: string; publisherId?: string; email: string }>(token);
      request.user = decoded;
    } catch {
      reply.code(401).send({ error: "Invalid or expired token." });
    }
  });
});

/**
 * Guard for publisher-only endpoints.
 * Use as a preHandler: { preHandler: [requirePublisher] }
 */
export async function requirePublisher(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    reply.code(401).send({ error: "Authentication required." });
    return;
  }
  if (!request.user.publisherId) {
    reply.code(403).send({ error: "Publisher profile required. Complete email verification first." });
    return;
  }
}
