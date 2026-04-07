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
      if (request.method === "GET" && request.url.startsWith("/api/kits") && !request.url.startsWith("/api/kits/mine")) return true;
      if (request.method === "GET" && request.url.startsWith("/api/publishers")) return true;
      return false;
    });

    const authHeader = request.headers.authorization;

    if (isPublic) {
      if (authHeader?.startsWith("Bearer ")) {
        try {
          await request.jwtVerify();
        } catch {}
      }
      return;
    }

    if (!authHeader?.startsWith("Bearer ")) {
      reply.code(401).send({
        error: "Unauthorized",
        message: "Authentication required. Include Bearer token.",
        statusCode: 401,
      });
      return;
    }

    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({
        error: "Unauthorized",
        message: "Invalid or expired token.",
        statusCode: 401,
      });
    }
  });
});

export async function requirePublisher(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as JwtUser | undefined;
  if (!user) {
    reply.code(401).send({
      error: "Unauthorized",
      message: "Authentication required.",
      statusCode: 401,
    });
    return;
  }
  if (!user.publisherId) {
    reply.code(403).send({
      error: "Forbidden",
      message: "Publisher profile required. Complete email verification first.",
      statusCode: 403,
    });
    return;
  }
}
