import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import { db, eq, schema } from "@kithub/db";

const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
const agentNamePattern = /^[a-zA-Z0-9_-]{2,64}$/;

type LocalUser = typeof schema.users.$inferSelect;
type LocalPublisher = typeof schema.publisherProfiles.$inferSelect;

export interface AuthenticatedUser {
  userId: string;
  supabaseUserId: string;
  email: string;
  publisherId?: string;
  publisherName?: string | null;
  publisherIssue?: string;
}

export class SupabaseAuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseAuthConfigurationError";
  }
}

export class SupabaseAccessTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseAccessTokenError";
  }
}

function getSupabaseAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE;

  return {
    url,
    key,
    error:
      !url || !key
        ? "Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY."
        : null,
  };
}

export function getSupabaseAuthConfigError(): string | null {
  return getSupabaseAuthConfig().error;
}

let cachedConfigKey = "";
let cachedClient: ReturnType<typeof createClient> | null = null;

function getSupabaseAdminClient() {
  const { url, key, error } = getSupabaseAuthConfig();
  if (!url || !key || error) {
    throw new SupabaseAuthConfigurationError(error ?? "Supabase auth is not configured.");
  }

  const cacheKey = `${url}:${key}`;
  if (!cachedClient || cachedConfigKey !== cacheKey) {
    cachedClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    cachedConfigKey = cacheKey;
  }

  return cachedClient;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getVerifiedAt(user: SupabaseUser): Date | null {
  return user.email_confirmed_at ? new Date(user.email_confirmed_at) : null;
}

function getRequestedAgentName(user: SupabaseUser): string | null {
  const candidate =
    user.user_metadata?.agentName ??
    user.user_metadata?.agent_name ??
    user.user_metadata?.publisherName;

  if (typeof candidate !== "string") {
    return null;
  }

  const trimmed = candidate.trim();
  return agentNamePattern.test(trimmed) ? trimmed : null;
}

async function syncLocalUser(user: SupabaseUser): Promise<LocalUser> {
  if (!db) {
    throw new Error("Database not connected.");
  }

  const rawEmail = user.email;
  if (!rawEmail) {
    throw new SupabaseAccessTokenError("Supabase token is missing an email address.");
  }

  const email = normalizeEmail(rawEmail);
  const emailVerified = getVerifiedAt(user);

  const [bySupabaseId] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.supabaseUserId, user.id))
    .limit(1);

  const localUser =
    bySupabaseId ??
    (
      await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1)
    )[0];

  if (localUser) {
    const needsUpdate =
      localUser.email !== email ||
      localUser.supabaseUserId !== user.id ||
      (!!emailVerified && !localUser.emailVerified);

    if (needsUpdate) {
      await db
        .update(schema.users)
        .set({
          email,
          supabaseUserId: user.id,
          emailVerified: emailVerified ?? localUser.emailVerified,
        })
        .where(eq(schema.users.id, localUser.id));
    }

    return {
      ...localUser,
      email,
      supabaseUserId: user.id,
      emailVerified: emailVerified ?? localUser.emailVerified,
    };
  }

  const created: LocalUser = {
    id: crypto.randomUUID(),
    email,
    supabaseUserId: user.id,
    emailVerified,
    createdAt: new Date(),
  };

  await db.insert(schema.users).values(created);
  return created;
}

async function ensurePublisherProfile(localUser: LocalUser, user: SupabaseUser): Promise<{
  publisher: LocalPublisher | null;
  issue?: string;
}> {
  if (!db) {
    throw new Error("Database not connected.");
  }

  const [existingPublisher] = await db
    .select()
    .from(schema.publisherProfiles)
    .where(eq(schema.publisherProfiles.userId, localUser.id))
    .limit(1);

  if (existingPublisher) {
    return { publisher: existingPublisher };
  }

  const requestedAgentName = getRequestedAgentName(user);
  if (!requestedAgentName) {
    return {
      publisher: null,
      issue:
        "Publisher profile required. Add an agentName to your Supabase user metadata, then sign in again.",
    };
  }

  const [agentNameConflict] = await db
    .select()
    .from(schema.publisherProfiles)
    .where(eq(schema.publisherProfiles.agentName, requestedAgentName))
    .limit(1);

  if (agentNameConflict) {
    return {
      publisher: null,
      issue: `Agent name "${requestedAgentName}" is already taken.`,
    };
  }

  const publisher: LocalPublisher = {
    id: crypto.randomUUID(),
    userId: localUser.id,
    agentName: requestedAgentName,
    verifiedAt: null,
    createdAt: new Date(),
  };

  await db.insert(schema.publisherProfiles).values(publisher);
  return { publisher };
}

export async function authenticateSupabaseAccessToken(token: string): Promise<AuthenticatedUser> {
  if (!db) {
    throw new Error("Database not connected.");
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new SupabaseAccessTokenError("Invalid or expired Supabase access token.");
  }

  const localUser = await syncLocalUser(data.user);
  const { publisher, issue } = await ensurePublisherProfile(localUser, data.user);

  return {
    userId: localUser.id,
    supabaseUserId: data.user.id,
    email: localUser.email,
    publisherId: publisher?.id,
    publisherName: publisher?.agentName ?? null,
    publisherIssue: issue,
  };
}

export function shouldUseLegacyTestAuth(): boolean {
  return isTest;
}
