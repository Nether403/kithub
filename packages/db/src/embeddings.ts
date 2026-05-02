import { createHash } from "crypto";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIM = 1536;
const OPENAI_URL = "https://api.openai.com/v1/embeddings";

let warned = false;

export function isEmbeddingsEnabled(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export function warnIfDisabled(context: string): void {
  if (!isEmbeddingsEnabled() && !warned) {
    warned = true;
    console.warn(
      `[kithub/embeddings] OPENAI_API_KEY not set — semantic search and related-kits will fall back to keyword/tag matching (${context}).`
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

export function hashInput(input: string, model: string = EMBEDDING_MODEL): string {
  return createHash("sha256").update(`${model}::${input}`).digest("hex").slice(0, 32);
}

export async function generateEmbedding(input: string): Promise<{
  vector: number[];
  model: string;
  inputHash: string;
} | null> {
  if (!isEmbeddingsEnabled()) return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      input: trimmed.slice(0, 8000),
      model: EMBEDDING_MODEL,
      encoding_format: "float",
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "<no body>");
    throw new Error(`OpenAI embedding request failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
  const vector = data.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIM) {
    throw new Error("OpenAI returned an invalid embedding vector.");
  }

  return { vector, model: EMBEDDING_MODEL, inputHash: hashInput(trimmed, EMBEDDING_MODEL) };
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

export const EMBEDDING_DIMENSIONS = EMBEDDING_DIM;
export const EMBEDDING_MODEL_NAME = EMBEDDING_MODEL;
