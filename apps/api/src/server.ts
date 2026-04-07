import createFastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { authRoutes } from "./routes/auth";
import { kitRoutes } from "./routes/kits";
import { publisherRoutes } from "./routes/publishers";
import { skillRoutes } from "./routes/skills";
import { authMiddleware } from "./middleware/auth";
import { db, healthCheck } from "@kithub/db";

const fastify = createFastify({ logger: true });

async function start() {
  // ── Plugins ───────────────────────────────────────────────────
  await fastify.register(cors, {
    origin: [
      process.env.WEB_URL || "http://localhost:3000",
      "http://localhost:5000",
      `https://${process.env.REPLIT_DEV_DOMAIN || ""}`,
    ].filter(Boolean),
    credentials: true,
  });

  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || "kithub-dev-secret-change-in-prod",
  });

  await fastify.register(rateLimit, {
    global: false,
  });

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "SkillKitHub API",
        description: "Agent-First API for the SkillKitHub Registry — workflows and skills for every AI agent",
        version: "0.2.0",
      },
      servers: [{ url: `http://localhost:${process.env.PORT || 8080}` }],
    },
  });

  await fastify.register(swaggerUi, { routePrefix: "/docs" });

  // ── Auth Middleware ─────────────────────────────────────────────
  await fastify.register(authMiddleware);

  // ── Database decorator ──────────────────────────────────────────
  fastify.decorate("db", db);

  // ── Routes ──────────────────────────────────────────────────────
  await fastify.register(authRoutes, { prefix: "/api/auth" });
  await fastify.register(kitRoutes, { prefix: "/api/kits" });
  await fastify.register(publisherRoutes, { prefix: "/api/publishers" });
  await fastify.register(skillRoutes, { prefix: "/api/skills" });

  // ── Health Check ────────────────────────────────────────────────
  fastify.get("/health", async () => {
    const dbOk = await healthCheck();
    return { status: "ok", database: dbOk ? "connected" : "disconnected" };
  });

  // ── Not Found Handler ──────────────────────────────────────────
  fastify.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: "Not Found",
      message: `Route ${request.method} ${request.url} not found.`,
      statusCode: 404,
    });
  });

  // ── Global Error Handler ────────────────────────────────────────
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    const statusCode = error.statusCode ?? 500;

    if (statusCode === 429) {
      return reply.code(429).send({
        error: "Too Many Requests",
        message: "Rate limit exceeded. Please try again later.",
        statusCode: 429,
      });
    }

    reply.code(statusCode).send({
      error: error.name || "Internal Server Error",
      message: error.message || "An unexpected error occurred.",
      statusCode,
    });
  });

  // ── Start ───────────────────────────────────────────────────────
  const port = parseInt(process.env.PORT || "8080", 10);
  try {
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`\n  🚀 SkillKitHub API listening at http://localhost:${port}`);
    console.log(`  📖 Swagger docs at http://localhost:${port}/docs\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
