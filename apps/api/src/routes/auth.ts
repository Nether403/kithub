import "@fastify/jwt";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db, schema, eq } from "@kithub/db";

const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

// ── Request Validation Schemas ──────────────────────────────────

const RegisterBodySchema = z.object({
  email: z.string().email("Valid email is required"),
  agentName: z.string().min(2, "agentName must be at least 2 characters").max(64).regex(/^[a-zA-Z0-9_-]+$/, "agentName must be alphanumeric with hyphens/underscores"),
});

const VerifyBodySchema = z.object({
  email: z.string().email("Valid email is required"),
  code: z.string().length(6, "Verification code must be exactly 6 digits").regex(/^\d{6}$/, "Code must be 6 digits"),
});

const LoginBodySchema = z.object({
  email: z.string().email("Valid email is required"),
});

// ── Rate Limit Config ───────────────────────────────────────────

const RATE_LIMIT_CONFIG = {
  max: 10,
  timeWindow: "1 minute",
};

function getPublicSupabaseAuthConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return {
      error:
        "Public Supabase auth config is missing. Set NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY, or SUPABASE_ANON_KEY.",
    };
  }

  return {
    supabaseUrl,
    supabasePublishableKey,
  };
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/config", async (_request, reply) => {
    const config = getPublicSupabaseAuthConfig();
    if ("error" in config) {
      return reply.code(503).send({
        error: "Service Unavailable",
        message: config.error,
        statusCode: 503,
      });
    }

    return {
      provider: "supabase",
      authMethod: "email_otp",
      ...config,
    };
  });

  if (!isTest) {
    const message =
      "API email-code auth has been retired. Sign in with Supabase and send the Supabase access token as your Bearer token.";

    fastify.post("/register", async (_request, reply) => {
      return reply.code(410).send({
        error: "Gone",
        message,
        statusCode: 410,
      });
    });

    fastify.post("/verify-email", async (_request, reply) => {
      return reply.code(410).send({
        error: "Gone",
        message,
        statusCode: 410,
      });
    });

    fastify.post("/login", async (_request, reply) => {
      return reply.code(410).send({
        error: "Gone",
        message,
        statusCode: 410,
      });
    });

    fastify.post("/logout", async () => {
      return {
        status: "success",
        message: "Sign out through the Supabase client in the web app.",
      };
    });

    return;
  }

  fastify.post("/register", {
    config: { rateLimit: RATE_LIMIT_CONFIG },
  }, async (request, reply) => {
    const parsed = RegisterBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation Error",
        message: parsed.error.issues.map(i => i.message).join("; "),
        statusCode: 400,
      });
    }

    const { email, agentName } = parsed.data;

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

    // Check agentName uniqueness
    const [existingAgent] = await db.select().from(schema.publisherProfiles).where(eq(schema.publisherProfiles.agentName, agentName)).limit(1);
    if (existingAgent) {
      return reply.code(409).send({
        error: "Conflict",
        message: "Agent name already taken. Choose a different name.",
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
    const parsed = VerifyBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation Error",
        message: parsed.error.issues.map(i => i.message).join("; "),
        statusCode: 400,
      });
    }

    const { email, code } = parsed.data;

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
    const parsed = LoginBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation Error",
        message: parsed.error.issues.map(i => i.message).join("; "),
        statusCode: 400,
      });
    }

    const { email } = parsed.data;

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
