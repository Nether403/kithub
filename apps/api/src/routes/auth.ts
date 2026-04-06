import type { FastifyPluginAsync } from "fastify";
import { db, schema, eq } from "@kithub/db";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/auth/register
   * Create a new user + publisher profile and send a verification code.
   */
  fastify.post("/register", async (request, reply) => {
    const { email, agentName } = request.body as { email: string; agentName: string };

    if (!email || !agentName) {
      return reply.code(400).send({ error: "email and agentName are required" });
    }
    if (!db) return reply.code(503).send({ error: "Database not connected" });

    // Check for existing user
    const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (existing) {
      return reply.code(409).send({ error: "Email already registered. Use /login instead." });
    }

    // Create user
    const userId = crypto.randomUUID();
    await db.insert(schema.users).values({ id: userId, email });

    // Create publisher profile
    const publisherId = crypto.randomUUID();
    await db.insert(schema.publisherProfiles).values({
      id: publisherId,
      userId,
      agentName,
    });

    // Generate 6-digit verification code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.insert(schema.emailVerificationCodes).values({
      userId,
      code,
      expiresAt,
    });

    // Dev mode: log code to console (replace with Resend/Postmark in production)
    console.log(`\n  📧 Verification code for ${email}: ${code}\n`);

    return {
      status: "pending",
      message: "Verification code sent. Check your email (or server console in dev mode).",
    };
  });

  /**
   * POST /api/auth/verify-email
   * Validate a 6-digit code and issue a JWT.
   */
  fastify.post("/verify-email", async (request, reply) => {
    const { email, code } = request.body as { email: string; code: string };

    if (!email || !code) {
      return reply.code(400).send({ error: "email and code are required" });
    }
    if (!db) return reply.code(503).send({ error: "Database not connected" });

    // Find user
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (!user) {
      return reply.code(404).send({ error: "No account found for this email." });
    }

    // Find valid verification code
    const [verification] = await db
      .select()
      .from(schema.emailVerificationCodes)
      .where(eq(schema.emailVerificationCodes.userId, user.id))
      .limit(1);

    if (!verification || verification.code !== code) {
      return reply.code(400).send({ error: "Invalid verification code." });
    }

    if (new Date() > verification.expiresAt) {
      return reply.code(400).send({ error: "Verification code expired. Request a new one." });
    }

    // Mark email as verified
    await db.update(schema.users).set({ emailVerified: new Date() }).where(eq(schema.users.id, user.id));

    // Clean up used codes
    await db.delete(schema.emailVerificationCodes).where(eq(schema.emailVerificationCodes.userId, user.id));

    // Get publisher profile
    const [publisher] = await db
      .select()
      .from(schema.publisherProfiles)
      .where(eq(schema.publisherProfiles.userId, user.id))
      .limit(1);

    // Issue JWT
    const token = fastify.jwt.sign(
      { userId: user.id, publisherId: publisher?.id, email: user.email },
      { expiresIn: "7d" }
    );

    return { status: "verified", token, agentName: publisher?.agentName };
  });

  /**
   * POST /api/auth/login
   * Passwordless login: sends a new verification code.
   */
  fastify.post("/login", async (request, reply) => {
    const { email } = request.body as { email: string };

    if (!email) return reply.code(400).send({ error: "email is required" });
    if (!db) return reply.code(503).send({ error: "Database not connected" });

    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (!user) {
      return reply.code(404).send({ error: "No account found. Register first at /api/auth/register." });
    }

    // Generate new verification code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Delete old codes
    await db.delete(schema.emailVerificationCodes).where(eq(schema.emailVerificationCodes.userId, user.id));

    await db.insert(schema.emailVerificationCodes).values({
      userId: user.id,
      code,
      expiresAt,
    });

    console.log(`\n  📧 Login code for ${email}: ${code}\n`);

    return { status: "pending", message: "Verification code sent." };
  });

  /**
   * POST /api/auth/logout
   * Client-side token invalidation (stateless JWT).
   */
  fastify.post("/logout", async () => {
    return { status: "success", message: "Token cleared. Discard the JWT on client side." };
  });
};
