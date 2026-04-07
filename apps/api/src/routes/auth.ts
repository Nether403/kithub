import type { FastifyPluginAsync } from "fastify";
import { db, schema, eq } from "@kithub/db";

const RATE_LIMIT_CONFIG = {
  max: 10,
  timeWindow: "1 minute",
};

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/register", {
    config: { rateLimit: RATE_LIMIT_CONFIG },
  }, async (request, reply) => {
    const { email, agentName } = request.body as { email: string; agentName: string };

    if (!email || !agentName) {
      return reply.code(400).send({
        error: "Validation Error",
        message: "email and agentName are required.",
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

    const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (existing) {
      return reply.code(409).send({
        error: "Conflict",
        message: "Email already registered. Use /login instead.",
        statusCode: 409,
      });
    }

    const userId = crypto.randomUUID();
    await db.insert(schema.users).values({ id: userId, email });

    const publisherId = crypto.randomUUID();
    await db.insert(schema.publisherProfiles).values({
      id: publisherId,
      userId,
      agentName,
    });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.insert(schema.emailVerificationCodes).values({
      userId,
      code,
      expiresAt,
    });

    console.log(`\n  📧 Verification code for ${email}: ${code}\n`);

    return {
      status: "pending",
      message: "Verification code sent. Check your email (or server console in dev mode).",
    };
  });

  fastify.post("/verify-email", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "1 minute",
      },
    },
  }, async (request, reply) => {
    const { email, code } = request.body as { email: string; code: string };

    if (!email || !code) {
      return reply.code(400).send({
        error: "Validation Error",
        message: "email and code are required.",
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

    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (!user) {
      return reply.code(404).send({
        error: "Not Found",
        message: "No account found for this email.",
        statusCode: 404,
      });
    }

    const [verification] = await db
      .select()
      .from(schema.emailVerificationCodes)
      .where(eq(schema.emailVerificationCodes.userId, user.id))
      .limit(1);

    if (!verification || verification.code !== code) {
      return reply.code(400).send({
        error: "Validation Error",
        message: "Invalid verification code.",
        statusCode: 400,
      });
    }

    if (new Date() > verification.expiresAt) {
      return reply.code(400).send({
        error: "Expired",
        message: "Verification code expired. Request a new one.",
        statusCode: 400,
      });
    }

    await db.update(schema.users).set({ emailVerified: new Date() }).where(eq(schema.users.id, user.id));
    await db.delete(schema.emailVerificationCodes).where(eq(schema.emailVerificationCodes.userId, user.id));

    const [publisher] = await db
      .select()
      .from(schema.publisherProfiles)
      .where(eq(schema.publisherProfiles.userId, user.id))
      .limit(1);

    const token = fastify.jwt.sign(
      { userId: user.id, publisherId: publisher?.id, email: user.email },
      { expiresIn: "7d" }
    );

    return { status: "verified", token, agentName: publisher?.agentName };
  });

  fastify.post("/login", {
    config: { rateLimit: RATE_LIMIT_CONFIG },
  }, async (request, reply) => {
    const { email } = request.body as { email: string };

    if (!email) {
      return reply.code(400).send({
        error: "Validation Error",
        message: "email is required.",
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

    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (!user) {
      return reply.code(404).send({
        error: "Not Found",
        message: "No account found. Register first at /api/auth/register.",
        statusCode: 404,
      });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.delete(schema.emailVerificationCodes).where(eq(schema.emailVerificationCodes.userId, user.id));

    await db.insert(schema.emailVerificationCodes).values({
      userId: user.id,
      code,
      expiresAt,
    });

    console.log(`\n  📧 Login code for ${email}: ${code}\n`);

    return { status: "pending", message: "Verification code sent." };
  });

  fastify.post("/logout", async () => {
    return { status: "success", message: "Token cleared. Discard the JWT on client side." };
  });
};
