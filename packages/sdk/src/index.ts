import { KitFrontmatterSchema, type KitFrontmatter } from "@kithub/schema";

export class KitHubClient {
  private baseUrl: string;

  constructor(options?: { baseUrl?: string }) {
    this.baseUrl = options?.baseUrl || "https://api.kithub.com";
  }

  async getKit(slug: string): Promise<KitFrontmatter> {
    const res = await fetch(`${this.baseUrl}/api/kits/${slug}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch kit: ${res.statusText}`);
    }
    const data = await res.json();
    return KitFrontmatterSchema.parse(data);
  }

  async getInstallPayload(slug: string, target: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/kits/${slug}/install?target=${target}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch install payload: ${res.statusText}`);
    }
    return res.json();
  }
}
