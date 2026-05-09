import { createHash } from "crypto";

// ══════════════════════════════════════════════════════════════════
// Multi-provider embedding support
// Priority: Gemini → OpenAI → OpenRouter → Azure OpenAI
// ══════════════════════════════════════════════════════════════════

interface EmbeddingProvider {
  name: string;
  model: string;
  dimensions: number;
  generate: (input: string) => Promise<number[]>;
}

// ── Provider: Google Gemini ──────────────────────────────────────

function geminiProvider(): EmbeddingProvider | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const model = "text-embedding-004";
  const dimensions = 768;
  const baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  return {
    name: "gemini",
    model,
    dimensions,
    async generate(input: string): Promise<number[]> {
      const res = await fetch(
        `${baseUrl}/models/${model}:embedContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: `models/${model}`,
            content: { parts: [{ text: input.slice(0, 8000) }] },
            taskType: "RETRIEVAL_DOCUMENT",
            outputDimensionality: dimensions,
          }),
        }
      );

      if (!res.ok) {
        const errText = await res.text().catch(() => "<no body>");
        throw new Error(`Gemini embedding request failed (${res.status}): ${errText.slice(0, 200)}`);
      }

      const data = (await res.json()) as { embedding?: { values?: number[] } };
      const vector = data.embedding?.values;
      if (!Array.isArray(vector) || vector.length === 0) {
        throw new Error("Gemini returned an invalid embedding vector.");
      }

      return vector;
    },
  };
}

// ── Provider: OpenAI (direct) ────────────────────────────────────

function openaiProvider(): EmbeddingProvider | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const model = "text-embedding-3-small";
  const dimensions = 1536;

  return {
    name: "openai",
    model,
    dimensions,
    async generate(input: string): Promise<number[]> {
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          input: input.slice(0, 8000),
          model,
          encoding_format: "float",
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "<no body>");
        throw new Error(`OpenAI embedding request failed (${res.status}): ${errText.slice(0, 200)}`);
      }

      const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
      const vector = data.data?.[0]?.embedding;
      if (!Array.isArray(vector) || vector.length !== dimensions) {
        throw new Error("OpenAI returned an invalid embedding vector.");
      }

      return vector;
    },
  };
}

// ── Provider: OpenRouter (OpenAI-compatible) ─────────────────────

function openrouterProvider(): EmbeddingProvider | null {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;

  const model = "openai/text-embedding-3-small";
  const dimensions = 1536;

  return {
    name: "openrouter",
    model,
    dimensions,
    async generate(input: string): Promise<number[]> {
      const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          input: input.slice(0, 8000),
          model,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "<no body>");
        throw new Error(`OpenRouter embedding request failed (${res.status}): ${errText.slice(0, 200)}`);
      }

      const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
      const vector = data.data?.[0]?.embedding;
      if (!Array.isArray(vector) || vector.length !== dimensions) {
        throw new Error("OpenRouter returned an invalid embedding vector.");
      }

      return vector;
    },
  };
}

// ── Provider: Azure OpenAI ───────────────────────────────────────

function azureOpenaiProvider(): EmbeddingProvider | null {
  const key = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT; // e.g. https://my-resource.openai.azure.com
  const deployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || "text-embedding-3-small";
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-02-01";
  if (!key || !endpoint) return null;

  const dimensions = 1536;

  return {
    name: "azure-openai",
    model: deployment,
    dimensions,
    async generate(input: string): Promise<number[]> {
      const url = `${endpoint.replace(/\/$/, "")}/openai/deployments/${deployment}/embeddings?api-version=${apiVersion}`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": key,
        },
        body: JSON.stringify({
          input: input.slice(0, 8000),
          encoding_format: "float",
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "<no body>");
        throw new Error(`Azure OpenAI embedding request failed (${res.status}): ${errText.slice(0, 200)}`);
      }

      const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
      const vector = data.data?.[0]?.embedding;
      if (!Array.isArray(vector) || vector.length !== dimensions) {
        throw new Error("Azure OpenAI returned an invalid embedding vector.");
      }

      return vector;
    },
  };
}

// ══════════════════════════════════════════════════════════════════
// Provider resolution — first available wins
// ══════════════════════════════════════════════════════════════════

let cachedProvider: EmbeddingProvider | null | undefined;

function resolveProvider(): EmbeddingProvider | null {
  if (cachedProvider !== undefined) return cachedProvider;

  // Priority order: Gemini (cheapest) → OpenAI → OpenRouter → Azure OpenAI
  cachedProvider =
    geminiProvider() ??
    openaiProvider() ??
    openrouterProvider() ??
    azureOpenaiProvider() ??
    null;

  if (cachedProvider) {
    console.log(
      `[kithub/embeddings] Using ${cachedProvider.name} provider (model: ${cachedProvider.model}, dimensions: ${cachedProvider.dimensions}).`
    );
  }

  return cachedProvider;
}

// ══════════════════════════════════════════════════════════════════
// Public API (unchanged interface)
// ══════════════════════════════════════════════════════════════════

let warned = false;

export function isEmbeddingsEnabled(): boolean {
  return resolveProvider() !== null;
}

export function warnIfDisabled(context: string): void {
  if (!isEmbeddingsEnabled() && !warned) {
    warned = true;
    console.warn(
      `[kithub/embeddings] No embedding provider configured — semantic search and related-kits will fall back to keyword/tag matching (${context}).`,
      "\n  Set one of: GEMINI_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY, or AZURE_OPENAI_API_KEY + AZURE_OPENAI_ENDPOINT."
    );
  }
}

export function buildEmbeddingInput(args: {
  title: string;
  summary: string;
  tags: string[];
  body?: string;
}): string {
  const tags = args.tags.length > 0 ? `Tags: ${args.tags.join(", ")}` : "";
  const body = (args.body ?? "").slice(0, 4000);
  return [args.title, args.summary, tags, body].filter(Boolean).join("\n\n").trim();
}

export function hashInput(input: string, model?: string): string {
  const provider = resolveProvider();
  const m = model ?? provider?.model ?? "unknown";
  return createHash("sha256").update(`${m}::${input}`).digest("hex").slice(0, 32);
}

export async function generateEmbedding(input: string): Promise<{
  vector: number[];
  model: string;
  inputHash: string;
} | null> {
  const provider = resolveProvider();
  if (!provider) return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  const vector = await provider.generate(trimmed);
  return {
    vector,
    model: provider.model,
    inputHash: hashInput(trimmed, provider.model),
  };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i]!;
    const bv = b[i]!;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Returns the vector dimensions for the active provider.
 * Falls back to 768 (Gemini default) if no provider is configured.
 */
export const EMBEDDING_DIMENSIONS = resolveProvider()?.dimensions ?? 768;

/**
 * Returns the model name for the active provider.
 * Falls back to "none" if no provider is configured.
 */
export const EMBEDDING_MODEL_NAME = resolveProvider()?.model ?? "none";
