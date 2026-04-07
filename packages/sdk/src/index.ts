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
  agentName?: string;
}

// ══════════════════════════════════════════════════════════════════
// SkillKitHub Client
// ══════════════════════════════════════════════════════════════════

export class KitHubClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(options?: { baseUrl?: string; token?: string }) {
    this.baseUrl = options?.baseUrl || process.env.KITHUB_API_URL || "http://localhost:8080";
    this.token = options?.token ?? null;
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
      throw new Error(data.error || `Request failed: ${res.statusText}`);
    }
    return data as T;
  }

  // ── Auth Endpoints ──────────────────────────────────────────────

  async register(email: string, agentName: string): Promise<AuthResult> {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, agentName }),
    });
  }

  async verify(email: string, code: string): Promise<AuthResult> {
    const result = await this.request<AuthResult>("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
    if (result.token) this.setToken(result.token);
    return result;
  }

  async login(email: string): Promise<AuthResult> {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email }),
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
