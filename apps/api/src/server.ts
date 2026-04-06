import createFastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { authRoutes } from "./routes/auth";
import { kitRoutes } from "./routes/kits";
import { authMiddleware } from "./middleware/auth";
import { db, healthCheck } from "@kithub/db";

const fastify = createFastify({ logger: true });

async function start() {
  // ── Plugins ───────────────────────────────────────────────────
  await fastify.register(cors, {
    origin: process.env.WEB_URL || "http://localhost:3000",
    credentials: true,
  });

  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || "kithub-dev-secret-change-in-prod",
  });

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "KitHub API",
        description: "Agent-First API for the KitHub Registry — the USB-C for AI",
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

  // ── Health Check ────────────────────────────────────────────────
  fastify.get("/health", async () => {
    const dbOk = await healthCheck();
    return { status: "ok", database: dbOk ? "connected" : "disconnected" };
  });

  // ── Global Error Handler ────────────────────────────────────────
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    const statusCode = error.statusCode ?? 500;
    reply.code(statusCode).send({
      error: error.message || "Internal Server Error",
      statusCode,
    });
  });

  // ── Start ───────────────────────────────────────────────────────
  const port = parseInt(process.env.PORT || "8080", 10);
  try {
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`\n  🚀 KitHub API listening at http://localhost:${port}`);
    console.log(`  📖 Swagger docs at http://localhost:${port}/docs\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
