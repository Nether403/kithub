import { describe, it, expect } from "vitest";
import { isValidTarget, generateInstallPayload, SUPPORTED_TARGETS } from "../targets";
import type { KitFrontmatter } from "../index";

const MOCK_FRONTMATTER: KitFrontmatter = {
  schema: "kit/1.0",
  slug: "test-kit",
  title: "Test Kit",
  summary: "A test kit",
  version: "1.0.0",
  model: { provider: "openai", name: "gpt-4o-2024-11-20", hosting: "hosted" },
  tags: ["testing"],
  tools: ["firecrawl"],
  skills: ["web-scraping"],
};

describe("isValidTarget", () => {
  it("accepts all supported targets", () => {
    for (const target of SUPPORTED_TARGETS) {
      expect(isValidTarget(target)).toBe(true);
    }
  });

  it("rejects invalid targets", () => {
    expect(isValidTarget("invalid")).toBe(false);
    expect(isValidTarget("")).toBe(false);
    expect(isValidTarget("vim")).toBe(false);
  });
});

describe("generateInstallPayload", () => {
  const kit = { frontmatter: MOCK_FRONTMATTER, rawMarkdown: "raw content" };

  it("generates a valid generic payload", () => {
    const payload = generateInstallPayload(kit, "generic");
    expect(payload.target).toBe("generic");
    expect(payload.kitSlug).toBe("test-kit");
    expect(payload.version).toBe("1.0.0");
    expect(payload.instructions).toContain("Test Kit");
    expect(payload.preflightChecks.length).toBeGreaterThan(0);
    expect(payload.harnessSteps.length).toBe(3);
  });

  it("generates a valid claude-code payload", () => {
    const payload = generateInstallPayload(kit, "claude-code");
    expect(payload.target).toBe("claude-code");
    expect(payload.instructions).toContain("CLAUDE.md");
    expect(payload.harnessSteps.some(s => s.detail.includes("CLAUDE.md"))).toBe(true);
  });

  it("generates a valid codex payload", () => {
    const payload = generateInstallPayload(kit, "codex");
    expect(payload.target).toBe("codex");
    expect(payload.instructions).toContain("AGENTS.md");
  });

  it("generates a valid cursor payload", () => {
    const payload = generateInstallPayload(kit, "cursor");
    expect(payload.target).toBe("cursor");
    expect(payload.instructions).toContain(".cursor/");
  });

  it("generates a valid mcp payload", () => {
    const payload = generateInstallPayload(kit, "mcp");
    expect(payload.target).toBe("mcp");
    expect(payload.instructions).toContain("MCP");
    expect(payload.preflightChecks.some(c => c.check.includes("MCP server"))).toBe(true);
  });

  it("includes tool and skill preflight checks", () => {
    const payload = generateInstallPayload(kit, "generic");
    expect(payload.preflightChecks.some(c => c.check.includes("firecrawl"))).toBe(true);
    expect(payload.preflightChecks.some(c => c.check.includes("web-scraping"))).toBe(true);
  });
});
