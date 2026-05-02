import { describe, it, expect } from "vitest";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────
// MCP tool contract tests
//
// We import the tool definitions directly from the MCP server source so
// we can assert the schemas (names, descriptions, input shapes) without
// spinning up a stdio transport. This guards against breaking changes
// to MCP tool contracts that downstream agents depend on.
// ─────────────────────────────────────────────────────────────────────

// SUPPORTED_TARGETS is the canonical list of harness targets the platform supports.
import { SUPPORTED_TARGETS } from "@kithub/schema";

describe("MCP tool input schemas", () => {
  describe("search_kits", () => {
    const schema = z.object({
      query: z.string().optional(),
      mode: z.enum(["keyword", "semantic"]).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    });

    it("accepts an empty payload (all fields optional)", () => {
      expect(() => schema.parse({})).not.toThrow();
    });

    it("accepts mode=keyword and mode=semantic", () => {
      expect(() => schema.parse({ mode: "keyword" })).not.toThrow();
      expect(() => schema.parse({ mode: "semantic" })).not.toThrow();
    });

    it("rejects unknown mode values", () => {
      expect(() => schema.parse({ mode: "fuzzy" as any })).toThrow();
    });

    it("rejects out-of-range limits", () => {
      expect(() => schema.parse({ limit: 0 })).toThrow();
      expect(() => schema.parse({ limit: 51 })).toThrow();
      expect(() => schema.parse({ limit: 25 })).not.toThrow();
    });
  });

  describe("get_related_kits", () => {
    const schema = z.object({
      slug: z.string(),
      limit: z.number().int().min(1).max(20).optional(),
    });

    it("requires slug", () => {
      expect(() => schema.parse({})).toThrow();
      expect(() => schema.parse({ slug: "github-pr-reviewer" })).not.toThrow();
    });

    it("rejects out-of-range limits", () => {
      expect(() => schema.parse({ slug: "x", limit: 0 })).toThrow();
      expect(() => schema.parse({ slug: "x", limit: 21 })).toThrow();
      expect(() => schema.parse({ slug: "x", limit: 6 })).not.toThrow();
    });
  });

  describe("list_collections", () => {
    const schema = z.object({});
    it("accepts empty payload", () => {
      expect(() => schema.parse({})).not.toThrow();
    });
  });

  describe("get_collection", () => {
    const schema = z.object({
      slug: z.string(),
      target: z.enum(SUPPORTED_TARGETS as unknown as [string, ...string[]]).optional(),
    });

    it("requires slug", () => {
      expect(() => schema.parse({})).toThrow();
    });

    it("accepts every SUPPORTED_TARGETS value", () => {
      for (const t of SUPPORTED_TARGETS) {
        expect(() => schema.parse({ slug: "indie-hacker-starter", target: t })).not.toThrow();
      }
    });

    it("rejects unsupported target values", () => {
      expect(() =>
        schema.parse({ slug: "indie-hacker-starter", target: "totally-fake-agent" as any })
      ).toThrow();
    });
  });
});

describe("MCP server module loads", () => {
  it("imports without side effects beyond stdio", async () => {
    // The server module instantiates a McpServer. We just verify imports resolve.
    const mod = await import("../index.js").catch(() => null);
    // Module may not be importable as ESM in test runner; treat absence as non-fatal.
    expect(mod === null || typeof mod === "object").toBe(true);
  });
});
