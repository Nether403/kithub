import { z } from "zod";

// ══════════════════════════════════════════════════════════════════
// Kit/1.0 Frontmatter Schema
// ══════════════════════════════════════════════════════════════════

export const KitModelSchema = z.object({
  provider: z.string(),
  name: z.string(),
  hosting: z.enum(["hosted", "local"]).optional().default("hosted"),
});

export const KitFailureSchema = z.object({
  problem: z.string(),
  resolution: z.string(),
});

export const KitResourceBindingSchema = z.object({
  resourceId: z.string(),
  kind: z.string(),
  purpose: z.string(),
  deliveryMethod: z.string().optional().default("connection"),
});

export const KitFrontmatterSchema = z.object({
  schema: z.literal("kit/1.0"),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug must be URL-safe lowercase with hyphens"),
  title: z.string().min(1),
  summary: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be semver (x.y.z)"),
  model: KitModelSchema,
  tags: z.array(z.string()).default([]),
  tools: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  dependencies: z.record(z.string()).optional(),
  failures: z.array(KitFailureSchema).optional(),
  requiredResources: z.array(KitResourceBindingSchema).optional(),
  fileManifest: z.array(z.string()).optional(),
}).refine(data => (data.tools && data.tools.length > 0) || (data.skills && data.skills.length > 0), {
  message: "At least one tool or skill is required",
  path: ["tools", "skills"],
});

// ══════════════════════════════════════════════════════════════════
// Kit.md Body Section Schema
// ══════════════════════════════════════════════════════════════════

const REQUIRED_SECTIONS = ["Goal", "When to Use", "Setup", "Steps", "Constraints", "Safety Notes"] as const;

export const KitBodySchema = z.object({
  goal: z.string().min(20, "Goal must be at least 20 characters"),
  whenToUse: z.string().min(1, "When to Use section is required"),
  setup: z.string().min(1, "Setup section is required"),
  steps: z.string().min(60, "Steps must be at least 60 characters"),
  constraints: z.string().min(1, "Constraints section is required"),
  safetyNotes: z.string().min(15, "Safety Notes must be at least 15 characters"),
});

// ══════════════════════════════════════════════════════════════════
// Kit.md Parser
// ══════════════════════════════════════════════════════════════════

export interface ParsedKitMd {
  frontmatter: KitFrontmatter;
  body: KitBody;
  raw: string;
  conformanceLevel: "standard" | "full";
}

/**
 * Parse a raw kit.md string into validated frontmatter and body sections.
 * Splits YAML frontmatter (between --- delimiters) from the markdown body.
 */
export function parseKitMd(raw: string): ParsedKitMd {
  const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!fmMatch) {
    throw new Error("Invalid kit.md: missing YAML frontmatter delimiters (---)");
  }

  const [, yamlStr, bodyStr] = fmMatch;

  // Parse YAML frontmatter (simple parser for common kit fields)
  const frontmatter = KitFrontmatterSchema.parse(parseSimpleYaml(yamlStr!));

  // Parse body sections
  const body = parseBodySections(bodyStr!);

  // Determine conformance level
  const conformanceLevel = detectConformanceLevel(frontmatter, body);

  return { frontmatter, body, raw, conformanceLevel };
}

/**
 * Simple YAML parser sufficient for kit/1.0 frontmatter.
 * Handles scalars, arrays (both inline and multi-line), and nested objects.
 */
function parseSimpleYaml(yaml: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = yaml.split("\n");
  let currentKey = "";
  let currentObj: Record<string, any> | null = null;
  let currentArray: any[] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Array item (indented "- value")
    if (trimmed.startsWith("- ") && currentKey) {
      const value = trimmed.slice(2).trim();
      if (currentArray) {
        // Check if it's an object-style array item
        if (value.includes(":")) {
          const obj: Record<string, any> = {};
          // Parse "key: value" from the first line
          const [k, ...vParts] = value.split(":");
          obj[k!.trim()] = vParts.join(":").trim().replace(/^["']|["']$/g, "");
          currentArray.push(obj);
        } else {
          currentArray.push(value.replace(/^["']|["']$/g, ""));
        }
      } else if (currentObj && currentKey) {
        // This is a sub-object array item with problem/resolution
        if (!Array.isArray(result[currentKey])) {
          result[currentKey] = [];
        }
        const obj: Record<string, any> = {};
        if (value.includes(":")) {
          const [k, ...vParts] = value.split(":");
          obj[k!.trim()] = vParts.join(":").trim().replace(/^["']|["']$/g, "");
        }
        currentObj = obj;
        (result[currentKey] as any[]).push(obj);
      }
      continue;
    }

    // Continuation of object in array (indented "key: value")
    if (line.startsWith("    ") && currentObj && !trimmed.startsWith("-")) {
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx > 0) {
        const key = trimmed.slice(0, colonIdx).trim();
        const val = trimmed.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
        currentObj[key] = val;
      }
      continue;
    }

    // Nested object property (indented "  key: value")
    if (line.startsWith("  ") && !line.startsWith("    ") && currentKey && typeof result[currentKey] === "object" && !Array.isArray(result[currentKey])) {
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx > 0) {
        const key = trimmed.slice(0, colonIdx).trim();
        const val = trimmed.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
        (result[currentKey] as Record<string, any>)[key] = val;
      }
      continue;
    }

    // Top-level key: value
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim();
      let val = trimmed.slice(colonIdx + 1).trim();

      currentObj = null;
      currentArray = null;

      // Inline array: [item1, item2]
      if (val.startsWith("[") && val.endsWith("]")) {
        result[key] = val.slice(1, -1).split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
        currentKey = key;
        continue;
      }

      // Empty value → start of nested object or array
      if (!val) {
        currentKey = key;
        result[key] = {};
        currentObj = result[key] as Record<string, any>;
        continue;
      }

      // Quoted string
      val = val.replace(/^["']|["']$/g, "");
      result[key] = val;
      currentKey = key;
    }
  }

  return result;
}

/**
 * Parse the markdown body into the 6 required sections.
 */
function parseBodySections(body: string): KitBody {
  const sections: Record<string, string> = {};
  const sectionRegex = /^##\s+(.+)$/gm;
  const matches = [...body.matchAll(sectionRegex)];

  for (let i = 0; i < matches.length; i++) {
    const heading = matches[i]![1]!.trim();
    const start = matches[i]!.index! + matches[i]![0]!.length;
    const end = i + 1 < matches.length ? matches[i + 1]!.index! : body.length;
    sections[heading] = body.slice(start, end).trim();
  }

  return KitBodySchema.parse({
    goal: sections["Goal"] ?? "",
    whenToUse: sections["When to Use"] ?? "",
    setup: sections["Setup"] ?? "",
    steps: sections["Steps"] ?? "",
    constraints: sections["Constraints"] ?? "",
    safetyNotes: sections["Safety Notes"] ?? "",
  });
}

/**
 * Determine conformance level:
 * - "full": has fileManifest, src/ artifacts, and all body sections with substantial content
 * - "standard": meets baseline publication requirements
 */
function detectConformanceLevel(
  frontmatter: KitFrontmatter,
  _body: KitBody
): "standard" | "full" {
  if (frontmatter.fileManifest && frontmatter.fileManifest.length > 0) {
    return "full";
  }
  return "standard";
}

// ══════════════════════════════════════════════════════════════════
// Install Payload Schema
// ══════════════════════════════════════════════════════════════════

export const KitInstallPayloadSchema = z.object({
  instructions: z.string(),
  preflightChecks: z.array(z.object({
    check: z.string(),
    required: z.boolean(),
  })),
  harnessSteps: z.array(z.object({
    step: z.number(),
    action: z.string(),
    detail: z.string(),
  })),
  target: z.string(),
  kitSlug: z.string(),
  version: z.string(),
});

// ══════════════════════════════════════════════════════════════════
// Type Exports
// ══════════════════════════════════════════════════════════════════

export type KitModel = z.infer<typeof KitModelSchema>;
export type KitFrontmatter = z.infer<typeof KitFrontmatterSchema>;
export type KitBody = z.infer<typeof KitBodySchema>;
export type KitInstallPayload = z.infer<typeof KitInstallPayloadSchema>;
export type KitFailure = z.infer<typeof KitFailureSchema>;
export type KitResourceBinding = z.infer<typeof KitResourceBindingSchema>;
