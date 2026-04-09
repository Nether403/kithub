import {
  KitHubClient,
  type AuthResult,
  type CurrentIdentity,
} from "@kithub/sdk";
import {
  clearAuthSession,
  loadConfig,
  saveConfig,
  type KitHubConfig,
} from "./config";

const AGENT_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export interface CliAuthIo {
  prompt(question: string): Promise<string>;
  log(message: string): void;
  error(message: string): void;
}

export interface ResolvedAuthSession {
  token: string | null;
  config: KitHubConfig;
  identity: CurrentIdentity | null;
  fromEnv: boolean;
}

export function validateAgentName(agentName: string): string | null {
  const trimmed = agentName.trim();
  if (!trimmed) {
    return "Agent name is required.";
  }
  if (trimmed.length < 2 || trimmed.length > 64) {
    return "Agent name must be between 2 and 64 characters.";
  }
  if (!AGENT_NAME_PATTERN.test(trimmed)) {
    return "Agent name must be alphanumeric with hyphens or underscores.";
  }
  return null;
}

function getDefaultPromptValue(primary?: string | null, fallback?: string | null): string {
  return primary?.trim() || fallback?.trim() || "";
}

function saveVerifiedSession(result: AuthResult, email: string, fallbackAgentName?: string) {
  if (!result.token) {
    throw new Error("Verification succeeded but no access token was returned.");
  }

  saveConfig({
    token: result.token,
    refreshToken: result.refreshToken,
    expiresAt: result.expiresAt,
    email: result.email ?? email,
    agentName: result.agentName ?? fallbackAgentName,
  });
}

function persistIdentity(identity: CurrentIdentity, fallbackAgentName?: string) {
  const existing = loadConfig();
  saveConfig({
    email: identity.email,
    agentName: identity.publisherName ?? fallbackAgentName ?? existing.agentName,
  });
}

async function sendOtp(
  client: KitHubClient,
  email: string,
  agentName?: string
): Promise<{ result: AuthResult; mode: "login" | "register" }> {
  if (agentName) {
    const result = await client.register(email, agentName);
    return { result, mode: "register" };
  }

  const result = await client.login(email);
  return { result, mode: "login" };
}

export async function bootstrapIdentity(
  client: KitHubClient,
  fallback?: { agentName?: string }
): Promise<CurrentIdentity> {
  const identity = await client.getCurrentIdentity();
  persistIdentity(identity, fallback?.agentName);
  return identity;
}

export async function persistSessionAndIdentity(
  client: KitHubClient,
  result: AuthResult,
  fallback?: { email: string; agentName?: string }
): Promise<CurrentIdentity> {
  const fallbackEmail = fallback?.email ?? result.email ?? "";
  saveVerifiedSession(result, fallbackEmail, fallback?.agentName);
  return bootstrapIdentity(client, { agentName: fallback?.agentName });
}

export async function completeOtpVerification(
  client: KitHubClient,
  email: string,
  code: string,
  fallbackAgentName?: string
): Promise<{ result: AuthResult; identity: CurrentIdentity }> {
  const result = await client.verify(email, code);
  const identity = await persistSessionAndIdentity(client, result, {
    email,
    agentName: fallbackAgentName,
  });
  return { result, identity };
}

export async function authenticateWithOtp(
  client: KitHubClient,
  io: CliAuthIo,
  options?: {
    email?: string;
    defaultEmail?: string;
    agentName?: string;
    otpSuccessPrefix?: string;
  }
): Promise<{ result: AuthResult; identity: CurrentIdentity; email: string }> {
  const emailHint = options?.defaultEmail ? ` (${options.defaultEmail})` : "";
  const emailInput = options?.email ?? (await io.prompt(`  Email${emailHint}: `));
  const email = emailInput.trim() || options?.defaultEmail?.trim() || "";
  if (!email) {
    throw new Error("Email is required.");
  }

  const requestedAgentName = options?.agentName?.trim() || undefined;
  if (requestedAgentName) {
    const validationError = validateAgentName(requestedAgentName);
    if (validationError) {
      throw new Error(validationError);
    }
  }

  const { result: otpResult, mode } = await sendOtp(client, email, requestedAgentName);
  io.log(
    `  ${options?.otpSuccessPrefix ?? "✓"} ${otpResult.message || `Verification code sent to ${email}`}`
  );
  if (mode === "register" && requestedAgentName) {
    io.log(`  Publisher profile requested for ${requestedAgentName}`);
  }

  const code = await io.prompt("  Verification code: ");
  if (!code.trim()) {
    throw new Error("Verification code is required.");
  }

  const { result, identity } = await completeOtpVerification(
    client,
    email,
    code,
    requestedAgentName
  );

  return { result, identity, email };
}

export async function resolveAuthSession(
  client: KitHubClient,
  io?: CliAuthIo,
  options?: { interactive?: boolean; requirePublisher?: boolean; bootstrapIdentity?: boolean }
): Promise<ResolvedAuthSession> {
  let rememberedEmail = loadConfig().email;
  let rememberedAgentName = loadConfig().agentName;
  const envToken = process.env.KITHUB_TOKEN?.trim();
  if (envToken) {
    client.setToken(envToken);

    let identity: CurrentIdentity | null = null;
    if (options?.bootstrapIdentity || options?.requirePublisher) {
      try {
        identity = await client.getCurrentIdentity();
      } catch {
        identity = null;
      }
    }

    return {
      token: envToken,
      config: loadConfig(),
      identity,
      fromEnv: true,
    };
  }

  let config = loadConfig();
  rememberedEmail = config.email ?? rememberedEmail;
  rememberedAgentName = config.agentName ?? rememberedAgentName;
  const legacyStoredToken = config.token && !config.refreshToken;
  if (legacyStoredToken) {
    clearAuthSession();
    config = loadConfig();
    if (options?.interactive && io) {
      io.log("\n  Stored CLI session predates Supabase refresh support. Please sign in again.\n");
    }
  }

  let identity: CurrentIdentity | null = null;

  if (config.refreshToken) {
    const now = Math.floor(Date.now() / 1000);
    const shouldRefresh =
      !config.token || !config.expiresAt || config.expiresAt <= now + 60;

    if (shouldRefresh) {
      try {
        const refreshed = await client.refreshAuthSession(config.refreshToken);
        identity = await persistSessionAndIdentity(client, refreshed, {
          email: getDefaultPromptValue(config.email, refreshed.email),
          agentName: getDefaultPromptValue(refreshed.agentName, config.agentName) || undefined,
        });
        config = loadConfig();
      } catch {
        rememberedEmail = config.email ?? rememberedEmail;
        rememberedAgentName = config.agentName ?? rememberedAgentName;
        clearAuthSession();
        config = loadConfig();
        if (options?.interactive && io) {
          io.log("\n  Stored CLI session expired. Please sign in again.\n");
        }
      }
    }
  }

  const storedToken = config.token?.trim() || null;
  if (storedToken) {
    client.setToken(storedToken);

    if (!identity && (options?.bootstrapIdentity || options?.requirePublisher)) {
      try {
        identity = await bootstrapIdentity(client);
        config = loadConfig();
      } catch {
        identity = null;
      }
    }

    return {
      token: storedToken,
      config,
      identity,
      fromEnv: false,
    };
  }

  if (!options?.interactive || !io) {
    return { token: null, config, identity: null, fromEnv: false };
  }

  const authenticated = await authenticateWithOtp(client, io, {
    defaultEmail: config.email ?? rememberedEmail,
  });

  config = loadConfig();

  return {
    token: authenticated.result.token ?? null,
    config,
    identity: authenticated.identity,
    fromEnv: false,
  };
}

export async function ensurePublisherProfile(
  client: KitHubClient,
  io: CliAuthIo,
  session: ResolvedAuthSession
): Promise<ResolvedAuthSession> {
  if (!session.token) {
    throw new Error("Authentication required.");
  }

  if (session.identity?.publisherId) {
    return session;
  }

  const publisherIssue =
    session.identity?.publisherIssue ?? "Publisher profile required.";
  io.log(`  ${publisherIssue}`);

  if (session.fromEnv) {
    throw new Error(
      "Publisher repair requires a stored refreshable session. Run `kithub login` instead of using only KITHUB_TOKEN."
    );
  }

  const currentConfig = session.config;
  const suggestedAgentName =
    session.identity?.publisherName ?? currentConfig.agentName;
  const promptHint = suggestedAgentName ? ` (${suggestedAgentName})` : "";
  const agentNameInput = await io.prompt(`  Agent name${promptHint}: `);
  const agentName = agentNameInput.trim() || suggestedAgentName?.trim() || "";
  const validationError = validateAgentName(agentName);
  if (validationError) {
    throw new Error(validationError);
  }

  const updated = await client.updateUserMetadata(
    { agentName },
    {
      accessToken: session.token,
      refreshToken: currentConfig.refreshToken,
    }
  );

  const fallbackEmail =
    session.identity?.email ?? currentConfig.email ?? updated.email ?? "";
  saveVerifiedSession(updated, fallbackEmail, agentName);

  const nextRefreshToken = updated.refreshToken ?? currentConfig.refreshToken;
  if (nextRefreshToken) {
    try {
      const refreshed = await client.refreshAuthSession(nextRefreshToken);
      await persistSessionAndIdentity(client, refreshed, {
        email: fallbackEmail,
        agentName,
      });
    } catch {
      await bootstrapIdentity(client, { agentName });
    }
  } else {
    await bootstrapIdentity(client, { agentName });
  }

  return {
    token: loadConfig().token ?? session.token,
    config: loadConfig(),
    identity: await bootstrapIdentity(client, { agentName }),
    fromEnv: false,
  };
}

export async function runWithPublisherRepair<T>(
  client: KitHubClient,
  io: CliAuthIo,
  session: ResolvedAuthSession,
  operation: () => Promise<T>
): Promise<{ result: T; session: ResolvedAuthSession }> {
  let currentSession = session;
  let repairedAndRetried = false;

  while (true) {
    try {
      return {
        result: await operation(),
        session: currentSession,
      };
    } catch (err: any) {
      const publisherProblem =
        typeof err?.message === "string" && err.message.includes("Publisher profile required");
      if (!publisherProblem || repairedAndRetried) {
        throw err;
      }

      currentSession = await ensurePublisherProfile(client, io, currentSession);
      client.setToken(currentSession.token!);
      repairedAndRetried = true;
    }
  }
}
