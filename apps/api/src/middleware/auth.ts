import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import {
  authenticateSupabaseAccessToken,
  getSupabaseAuthConfigError,
  shouldUseLegacyTestAuth,
  SupabaseAccessTokenError,
  SupabaseAuthConfigurationError,
  type AuthenticatedUser,
} from "../lib/supabase-auth";

export type JwtUser = AuthenticatedUser;

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AuthenticatedUser;
  }
}

type JwtCapableRequest = FastifyRequest & {
  jwtVerify?: () => Promise<void>;
};

async function verifyTestToken(request: FastifyRequest): Promise<AuthenticatedUser | null> {
  if (!shouldUseLegacyTestAuth()) {
    return null;
  }

  const jwtRequest = request as JwtCapableRequest;
  if (typeof jwtRequest.jwtVerify !== "function") {
    return null;
  }

  await jwtRequest.jwtVerify();
  const jwtUser = (request as FastifyRequest & { user?: AuthenticatedUser }).user;
  if (!jwtUser?.userId || !jwtUser.email) {
    throw new SupabaseAccessTokenError("Invalid test token.");
  }

  return {
    userId: jwtUser.userId,
    supabaseUserId: jwtUser.supabaseUserId ?? jwtUser.userId,
    email: jwtUser.email,
    publisherId: jwtUser.publisherId,
    publisherName: jwtUser.publisherName ?? null,
    publisherIssue: jwtUser.publisherIssue,
  };
}

async function authenticateRequest(request: FastifyRequest): Promise<AuthenticatedUser> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new SupabaseAccessTokenError("Missing bearer token.");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    throw new SupabaseAccessTokenError("Missing bearer token.");
  }

  const testUser = await verifyTestToken(request);
  if (testUser) {
    return testUser;
  }

  return authenticateSupabaseAccessToken(token);
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
      if (request.method === "GET" && request.url.startsWith("/api/skills")) return true;
      return false;
    });

    const authHeader = request.headers.authorization;

    if (isPublic) {
      if (authHeader?.startsWith("Bearer ")) {
        try {
          request.authUser = await authenticateRequest(request);
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
      request.authUser = await authenticateRequest(request);
    } catch (error) {
      const statusCode =
        error instanceof SupabaseAuthConfigurationError ? 503 : 401;
      const message =
        error instanceof SupabaseAuthConfigurationError
          ? getSupabaseAuthConfigError() ?? error.message
          : "Invalid or expired token.";

      reply.code(statusCode).send({
        error:
          statusCode === 503 ? "Service Unavailable" : "Unauthorized",
        message,
        statusCode,
      });
      return;
    }
  });
});

export async function requirePublisher(request: FastifyRequest, reply: FastifyReply) {
  const user = request.authUser as JwtUser | undefined;
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
      message:
        user.publisherIssue ??
        "Publisher profile required. Complete Supabase sign-in first.",
      statusCode: 403,
    });
    return;
  }
}
