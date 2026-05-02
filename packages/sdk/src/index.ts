import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import { KitFrontmatterSchema, type KitFrontmatter, type KitInstallPayload } from "@kithub/schema";

// ══════════════════════════════════════════════════════════════════
// API Response Types
// ══════════════════════════════════════════════════════════════════

export interface KitSummary {
  slug: string;
  title: string;
  summary: string;
  version: string;
  installs: number;
  tags: string[];
  score: number | null;
  updatedAt: string;
}

export interface KitDetail extends KitSummary {
  rawMarkdown: string;
  parsedFrontmatter: KitFrontmatter | null;
  conformanceLevel: string;
  learningsCount: number;
  scan: { score: number; status: string; findings: any[] } | null;
  resourceBindings: any;
  publisherVerified?: boolean;
  averageStars?: number | null;
  ratingCount?: number;
  createdAt: string;
}

export interface RatingSummary {
  averageStars: number | null;
  ratingCount: number;
  ratings: Array<{
    id: string;
    stars: number;
    body: string | null;
    publisherName: string;
    verified: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface CollectionSummary {
  slug: string;
  title: string;
  description: string;
  curator: string;
  emoji: string;
  kitCount: number;
  totalInstalls: number;
  averageStars: number | null;
  featured: boolean;
}

export interface CollectionDetail {
  slug: string;
  title: string;
  description: string;
  curator: string;
  emoji: string;
  featured: boolean;
  kits: KitSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface CollectionInstall {
  slug: string;
  title: string;
  kitSlugs: string[];
  target: string | null;
  installUrls: string[];
  instructions: string;
  supportedTargets: readonly string[];
}

export interface PublishResult {
  status: "published" | "blocked";
  slug: string;
  version: string;
  conformanceLevel: string;
  scan: {
    score: number;
    passed: boolean;
    findings: any[];
    tips: string[];
  };
}

export interface AuthResult {
  status: string;
  message?: string;
  token?: string;
  refreshToken?: string;
  expiresAt?: number;
  agentName?: string | null;
  email?: string | null;
  userId?: string;
}

export interface CurrentIdentity {
  email: string;
  supabaseUserId: string;
  userId: string;
  publisherId?: string;
  publisherName?: string | null;
  publisherIssue?: string;
}

export interface PublicAuthConfig {
  provider: "supabase";
  authMethod: "email_otp";
  supabaseUrl: string;
  supabasePublishableKey: string;
}

function envValue(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
}

function getAgentName(user: SupabaseUser | null): string | null {
  if (!user) {
    return null;
  }

  const metadata = user.user_metadata ?? {};
  const value = metadata.agentName ?? metadata.agent_name ?? metadata.publisherName;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function createAuthClient(config: PublicAuthConfig) {
  return createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

// ══════════════════════════════════════════════════════════════════
// SkillKitHub Client
// ══════════════════════════════════════════════════════════════════

export class KitHubClient {
  private baseUrl: string;
  private token: string | null = null;
  private authConfig: PublicAuthConfig | null = null;

  constructor(options?: {
    baseUrl?: string;
    token?: string;
    supabaseUrl?: string;
    supabasePublishableKey?: string;
  }) {
    this.baseUrl = options?.baseUrl || process.env.KITHUB_API_URL || "http://localhost:8080";
    this.token = options?.token ?? null;

    const supabaseUrl =
      envValue("KITHUB_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL") ||
      options?.supabaseUrl;
    const supabasePublishableKey =
      envValue(
        "KITHUB_SUPABASE_PUBLISHABLE_KEY",
        "KITHUB_SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
        "SUPABASE_ANON_KEY"
      ) ||
      options?.supabasePublishableKey;

    if (supabaseUrl && supabasePublishableKey) {
      this.authConfig = {
        provider: "supabase",
        authMethod: "email_otp",
        supabaseUrl,
        supabasePublishableKey,
      };
    }
  }

  // ── Auth Management ─────────────────────────────────────────────

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.token) h["Authorization"] = `Bearer ${this.token}`;
    return h;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: { ...this.headers(), ...options?.headers },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || `Request failed: ${res.statusText}`);
    }

    return data as T;
  }

  private async getAuthConfig(): Promise<PublicAuthConfig> {
    if (this.authConfig) {
      return this.authConfig;
    }

    const config = await this.request<PublicAuthConfig>("/api/auth/config");
    this.authConfig = config;
    return config;
  }

  private async buildAuthClient() {
    return createAuthClient(await this.getAuthConfig());
  }

  private async buildAuthenticatedAuthClient(session: {
    accessToken?: string | null;
    refreshToken?: string | null;
  } = {}) {
    const supabase = await this.buildAuthClient();
    const accessToken = session.accessToken?.trim() || this.token?.trim();
    const refreshToken = session.refreshToken?.trim();

    if (!accessToken) {
      throw new Error("Authentication required.");
    }

    if (!refreshToken) {
      throw new Error("A refresh token is required for this operation. Run `kithub login` again.");
    }

    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw new Error(error.message);
    }

    return supabase;
  }

  private toAuthResult(
    status: string,
    message: string,
    session: {
      access_token?: string;
      refresh_token?: string;
      expires_at?: number | null;
      user?: SupabaseUser | null;
    } | null
  ): AuthResult {
    const token = session?.access_token?.trim();
    if (token) {
      this.setToken(token);
    }

    return {
      status,
      message,
      token,
      refreshToken: session?.refresh_token?.trim() || undefined,
      expiresAt: typeof session?.expires_at === "number" ? session.expires_at : undefined,
      agentName: getAgentName(session?.user ?? null),
      email: session?.user?.email ?? null,
      userId: session?.user?.id,
    };
  }

  // ── Auth Endpoints ──────────────────────────────────────────────

  async register(email: string, agentName: string): Promise<AuthResult> {
    const supabase = await this.buildAuthClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: {
          agentName,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      status: "pending",
      message: `Verification code sent to ${email}.`,
      agentName,
      email,
    };
  }

  async verify(email: string, code: string): Promise<AuthResult> {
    const supabase = await this.buildAuthClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.session?.access_token) {
      throw new Error("Verification succeeded but no Supabase session was returned.");
    }

    return this.toAuthResult("verified", "Email verified.", {
      ...data.session,
      user: data.user,
    });
  }

  async login(email: string): Promise<AuthResult> {
    const supabase = await this.buildAuthClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      status: "pending",
      message: `Verification code sent to ${email}.`,
      email,
    };
  }

  async refreshAuthSession(refreshToken: string): Promise<AuthResult> {
    const supabase = await this.buildAuthClient();
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.session?.access_token) {
      throw new Error("Session refresh succeeded but no access token was returned.");
    }

    return this.toAuthResult("refreshed", "Session refreshed.", {
      ...data.session,
      user: data.user,
    });
  }

  async updateUserMetadata(
    metadata: { agentName: string },
    session?: { accessToken?: string | null; refreshToken?: string | null }
  ): Promise<AuthResult> {
    const supabase = await this.buildAuthenticatedAuthClient(session);
    const { data, error } = await supabase.auth.updateUser({
      data: metadata,
    });

    if (error) {
      throw new Error(error.message);
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      throw new Error(sessionError.message);
    }

    return this.toAuthResult("updated", "User metadata updated.", {
      ...sessionData.session,
      user: data.user ?? sessionData.session?.user ?? null,
    });
  }

  async getCurrentIdentity(): Promise<CurrentIdentity> {
    return this.request("/api/auth/me", {
      method: "GET",
    });
  }

  // ── Kit Endpoints ───────────────────────────────────────────────

  async searchKits(
    query?: string,
    tag?: string,
    options?: { mode?: "keyword" | "semantic"; limit?: number }
  ): Promise<{ kits: KitSummary[]; total: number; mode?: string }> {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (tag) params.set("tag", tag);
    if (options?.mode) params.set("mode", options.mode);
    if (options?.limit) params.set("limit", String(options.limit));
    const qs = params.toString();
    return this.request(`/api/kits${qs ? `?${qs}` : ""}`);
  }

  async getRelatedKits(slug: string, limit = 6): Promise<{ kits: KitSummary[]; mode: string }> {
    return this.request(`/api/kits?related_to=${encodeURIComponent(slug)}&limit=${limit}`);
  }

  async listCollections(): Promise<{ collections: CollectionSummary[] }> {
    return this.request("/api/collections");
  }

  async getCollection(slug: string): Promise<CollectionDetail> {
    return this.request(`/api/collections/${slug}`);
  }

  async getCollectionInstall(slug: string, target?: string): Promise<CollectionInstall> {
    const qs = target ? `?target=${encodeURIComponent(target)}` : "";
    return this.request(`/api/collections/${slug}/install${qs}`);
  }

  async getKitRatings(slug: string): Promise<RatingSummary> {
    return this.request(`/api/kits/${slug}/ratings`);
  }

  async submitRating(
    slug: string,
    args: { stars: number; body?: string }
  ): Promise<{ status: string; ratingId: string; averageStars: number | null; ratingCount: number }> {
    return this.request(`/api/kits/${slug}/ratings`, {
      method: "POST",
      body: JSON.stringify(args),
    });
  }

  async getKitScans(slug: string): Promise<{
    slug: string;
    scans: Array<{ version: string; releaseId: string; score: number | null; findings: any[]; createdAt: string }>;
    diffs: Array<{
      baseVersion: string | null;
      baseScore: number | null;
      headVersion: string;
      headScore: number | null;
      delta: number | null;
      added: any[];
      removed: any[];
      unchanged: any[];
    }>;
  }> {
    return this.request(`/api/kits/${slug}/scans`);
  }

  async getKit(slug: string): Promise<KitDetail> {
    return this.request(`/api/kits/${slug}`);
  }

  async getInstallPayload(slug: string, target: string): Promise<KitInstallPayload> {
    return this.request(`/api/kits/${slug}/install?target=${target}`);
  }

  async publishKit(rawMarkdown: string): Promise<PublishResult> {
    return this.request("/api/kits", {
      method: "POST",
      body: JSON.stringify({ rawMarkdown }),
    });
  }

  async submitLearning(
    slug: string,
    data: {
      context?: { os?: string; model?: string; runtime?: string; platform?: string };
      payload: string;
    }
  ): Promise<{ status: string; totalLearnings: number }> {
    return this.request(`/api/kits/${slug}/learnings`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}

export { KitFrontmatterSchema };
