import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";

export interface JwtUser {
  userId: string;
  publisherId?: string;
  email: string;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtUser;
    user: JwtUser;
  }
}

/**
 * JWT authentication middleware for Fastify.
 * Decorates request.user when a valid Bearer token is present.
 */
export const authMiddleware: FastifyPluginAsync = fp(async (fastify) => {
  fastify.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
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
      await request.jwtVerify();
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
  const user = request.user as JwtUser | undefined;
  if (!user) {
    reply.code(401).send({ error: "Authentication required." });
    return;
  }
  if (!user.publisherId) {
    reply.code(403).send({ error: "Publisher profile required. Complete email verification first." });
    return;
  }
}
