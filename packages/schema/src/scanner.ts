/**
 * SkillKitHub Safety Scanner — The "Concierge" Engine
 *
 * Performs deterministic hard-rule checks on kit.md submissions.
 * Produces a 1-10 score with actionable findings and tips.
 * Threshold: score >= 7 = auto-publish; < 7 = blocked.
 */

export interface ScanFinding {
  type: "error" | "warning" | "tip";
  message: string;
  location?: string;
}

export interface ScanResult {
  score: number;
  findings: ScanFinding[];
  tips: string[];
  passed: boolean;
}

// ── Secret Patterns ───────────────────────────────────────────────

const SECRET_PATTERNS = [
  { pattern: /(?:sk|pk)[-_](?:live|test|prod)[-_][a-zA-Z0-9]{20,}/g, label: "Stripe API key" },
  { pattern: /sk-[a-zA-Z0-9]{40,}/g, label: "OpenAI API key" },
  { pattern: /sk-ant-[a-zA-Z0-9-]{80,}/g, label: "Anthropic API key" },
  { pattern: /ghp_[a-zA-Z0-9]{36,}/g, label: "GitHub personal access token" },
  { pattern: /gho_[a-zA-Z0-9]{36,}/g, label: "GitHub OAuth token" },
  { pattern: /xoxb-[0-9]+-[0-9]+-[a-zA-Z0-9]+/g, label: "Slack bot token" },
  { pattern: /xoxp-[0-9]+-[0-9]+-[0-9]+-[a-f0-9]+/g, label: "Slack user token" },
  { pattern: /AKIA[0-9A-Z]{16}/g, label: "AWS Access Key ID" },
  { pattern: /(?:password|passwd|pwd|secret|token|api_key|apikey)\s*[:=]\s*["'][^"']{8,}["']/gi, label: "Hardcoded credential" },
  { pattern: /eyJ[a-zA-Z0-9_-]{50,}\.[a-zA-Z0-9_-]{50,}/g, label: "JWT token" },
];

// ── Destructive Patterns ──────────────────────────────────────────

const DESTRUCTIVE_PATTERNS = [
  { pattern: /rm\s+-rf\s+[\/~]/g, label: "Recursive file deletion from root/home" },
  { pattern: /DROP\s+(?:TABLE|DATABASE|SCHEMA)/gi, label: "SQL DROP statement" },
  { pattern: /sudo\s+/g, label: "sudo usage (privilege escalation)" },
  { pattern: /chmod\s+777/g, label: "chmod 777 (world-writable permissions)" },
  { pattern: />(\/dev\/sd|\/dev\/hd)/g, label: "Direct disk write" },
  { pattern: /mkfs\./g, label: "Filesystem format command" },
  { pattern: /:(){ :\|:& };:/g, label: "Fork bomb" },
  { pattern: /curl\s+.*\|\s*(?:bash|sh|zsh)/g, label: "Piped remote execution (curl | bash)" },
  { pattern: /wget\s+.*\|\s*(?:bash|sh|zsh)/g, label: "Piped remote execution (wget | bash)" },
];

// ── Generic Model Names (Absolute Grounding Policy) ───────────────

const GENERIC_MODEL_NAMES = [
  "gpt-4", "gpt-3.5", "gpt-4o", "claude-3", "claude-sonnet", "claude-opus",
  "claude-haiku", "gemini-pro", "gemini-ultra", "llama-3", "mistral",
];

// ══════════════════════════════════════════════════════════════════
// Scanner
// ══════════════════════════════════════════════════════════════════

export function scanKit(rawMarkdown: string, parsedFrontmatter?: any): ScanResult {
  const findings: ScanFinding[] = [];
  const tips: string[] = [];
  let totalPoints = 0;
  const maxPoints = 10;

  // ── 1. Schema Compliance (3 points) ─────────────────────────────
  let schemaPoints = 0;

  // Check frontmatter exists
  const hasFrontmatter = rawMarkdown.match(/^---\s*\n[\s\S]*?\n---/);
  if (hasFrontmatter) {
    schemaPoints += 1;
  } else {
    findings.push({ type: "error", message: "Missing YAML frontmatter delimiters (---)", location: "frontmatter" });
  }

  // Check schema version
  if (rawMarkdown.includes('schema: "kit/1.0"') || rawMarkdown.includes("schema: kit/1.0")) {
    schemaPoints += 1;
  } else {
    findings.push({ type: "error", message: 'Missing or invalid schema version. Must be: schema: "kit/1.0"', location: "frontmatter" });
  }

  // Check required fields
  const requiredFields = ["slug:", "title:", "summary:", "version:", "model:"];
  const missingFields = requiredFields.filter(f => !rawMarkdown.includes(f));
  if (missingFields.length === 0) {
    schemaPoints += 1;
  } else {
    findings.push({
      type: "error",
      message: `Missing required frontmatter fields: ${missingFields.join(", ")}`,
      location: "frontmatter",
    });
  }

  totalPoints += schemaPoints;

  // ── 2. Section Completeness (2 points) ──────────────────────────
  let sectionPoints = 0;
  const requiredSections = ["## Goal", "## When to Use", "## Setup", "## Steps", "## Constraints", "## Safety Notes"];
  const missingSections = requiredSections.filter(s => !rawMarkdown.includes(s));

  if (missingSections.length === 0) {
    sectionPoints = 2;
  } else if (missingSections.length <= 2) {
    sectionPoints = 1;
    findings.push({
      type: "warning",
      message: `Missing body sections: ${missingSections.map(s => s.replace("## ", "")).join(", ")}`,
      location: "body",
    });
  } else {
    findings.push({
      type: "error",
      message: `Missing ${missingSections.length} required body sections: ${missingSections.map(s => s.replace("## ", "")).join(", ")}`,
      location: "body",
    });
  }

  totalPoints += sectionPoints;

  // ── 3. No Detected Secrets (2 points) ───────────────────────────
  let secretPoints = 2;

  for (const { pattern, label } of SECRET_PATTERNS) {
    const match = rawMarkdown.match(pattern);
    if (match) {
      secretPoints = 0;
      findings.push({
        type: "error",
        message: `Detected embedded secret: ${label}. Scrub this before publishing.`,
        location: "content",
      });
      tips.push(`Remove the ${label} and use a resource binding pointer instead (e.g., 1Password vault reference).`);
    }
  }

  totalPoints += secretPoints;

  // ── 4. No Destructive Patterns (2 points) ───────────────────────
  let destructivePoints = 2;

  for (const { pattern, label } of DESTRUCTIVE_PATTERNS) {
    const match = rawMarkdown.match(pattern);
    if (match) {
      destructivePoints = Math.max(0, destructivePoints - 1);
      findings.push({
        type: "warning",
        message: `Potentially destructive pattern detected: ${label}`,
        location: "content",
      });
    }
  }

  totalPoints += destructivePoints;

  // ── 5. Model Grounding (1 point) ────────────────────────────────
  let groundingPoints = 1;

  if (parsedFrontmatter?.model?.name) {
    const modelName = parsedFrontmatter.model.name;
    const isGeneric = GENERIC_MODEL_NAMES.some(gm =>
      modelName === gm || modelName.toLowerCase() === gm.toLowerCase()
    );
    if (isGeneric) {
      groundingPoints = 0;
      findings.push({
        type: "warning",
        message: `Generic model name "${modelName}" used. Use a specific model identifier (e.g., "gpt-4o-2024-11-20" or "claude-sonnet-4-20250514") for absolute grounding.`,
        location: "frontmatter.model.name",
      });
      tips.push("Specific model identifiers ensure your kit starts from a known-good reasoning baseline.");
    }
  }

  totalPoints += groundingPoints;

  // ── Bonus Tips ──────────────────────────────────────────────────

  if (!rawMarkdown.includes("failures:") && !rawMarkdown.includes("failures:")) {
    tips.push("Consider adding a 'failures' section to document known edge cases and their resolutions.");
  }

  if (!rawMarkdown.includes("requiredResources:") && !rawMarkdown.includes("fileManifest:")) {
    tips.push("Adding requiredResources or fileManifest moves your kit toward 'Full' conformance level.");
  }

  // ── Result ──────────────────────────────────────────────────────

  const score = Math.min(maxPoints, Math.max(1, totalPoints));
  const passed = score >= 7;

  if (!passed) {
    tips.push(`Your kit scored ${score}/10. A minimum score of 7 is required for publication. Address the errors above and resubmit.`);
  }

  return { score, findings, tips, passed };
}
