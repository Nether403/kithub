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
  createdAt: string;
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
      options?.supabaseUrl ||
      envValue("KITHUB_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
    const supabasePublishableKey =
      options?.supabasePublishableKey ||
      envValue(
        "KITHUB_SUPABASE_PUBLISHABLE_KEY",
        "KITHUB_SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
        "SUPABASE_ANON_KEY"
      );

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

  // ── Kit Endpoints ───────────────────────────────────────────────

  async searchKits(query?: string, tag?: string): Promise<{ kits: KitSummary[]; total: number }> {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (tag) params.set("tag", tag);
    const qs = params.toString();
    return this.request(`/api/kits${qs ? `?${qs}` : ""}`);
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
