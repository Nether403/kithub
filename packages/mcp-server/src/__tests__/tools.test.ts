import { describe, it, expect } from "vitest";
import { z } from "zod";
import { SUPPORTED_TARGETS } from "@kithub/schema";
import {
  SearchKitsInput,
  GetRelatedKitsInput,
  ListCollectionsInput,
  GetCollectionInput,
  GetKitDetailInput,
  InstallKitInput,
} from "../schemas.js";

// ─────────────────────────────────────────────────────────────────────
// MCP tool contract tests
//
// Validates the actual zod schemas exported from `../schemas.ts` —
// the same objects the running MCP server registers with each tool.
// Guards against silent contract drift for downstream agents.
// ─────────────────────────────────────────────────────────────────────

function wrap(shape: Record<string, z.ZodTypeAny>) {
  return z.object(shape);
}

describe("MCP tool input schemas (live exports)", () => {
  describe("search_kits", () => {
    const schema = wrap(SearchKitsInput);

    it("accepts an empty payload (all fields optional)", () => {
      expect(() => schema.parse({})).not.toThrow();
    });

    it("accepts mode=keyword and mode=semantic", () => {
      expect(() => schema.parse({ mode: "keyword" })).not.toThrow();
      expect(() => schema.parse({ mode: "semantic" })).not.toThrow();
    });

    it("rejects unknown mode values", () => {
      const result = schema.safeParse({ mode: "fuzzy" });
      expect(result.success).toBe(false);
    });

    it("rejects out-of-range limits", () => {
      expect(schema.safeParse({ limit: 0 }).success).toBe(false);
      expect(schema.safeParse({ limit: 51 }).success).toBe(false);
      expect(schema.safeParse({ limit: 25 }).success).toBe(true);
    });
  });

  describe("get_related_kits", () => {
    const schema = wrap(GetRelatedKitsInput);

    it("requires slug", () => {
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ slug: "github-pr-reviewer" }).success).toBe(true);
    });

    it("rejects out-of-range limits", () => {
      expect(schema.safeParse({ slug: "x", limit: 0 }).success).toBe(false);
      expect(schema.safeParse({ slug: "x", limit: 21 }).success).toBe(false);
      expect(schema.safeParse({ slug: "x", limit: 6 }).success).toBe(true);
    });
  });

  describe("list_collections", () => {
    const schema = wrap(ListCollectionsInput);
    it("accepts empty payload", () => {
      expect(() => schema.parse({})).not.toThrow();
    });
  });

  describe("get_collection", () => {
    const schema = wrap(GetCollectionInput);

    it("requires slug", () => {
      expect(schema.safeParse({}).success).toBe(false);
    });

    it("accepts every SUPPORTED_TARGETS value", () => {
      for (const t of SUPPORTED_TARGETS) {
        const result = schema.safeParse({ slug: "indie-hacker-starter", target: t });
        expect(result.success).toBe(true);
      }
    });

    it("rejects unsupported target values", () => {
      const result = schema.safeParse({
        slug: "indie-hacker-starter",
        target: "totally-fake-agent",
      });
      expect(result.success).toBe(false);
    });

    it("accepts includeInstall flag", () => {
      expect(schema.safeParse({ slug: "x", includeInstall: true }).success).toBe(true);
      expect(schema.safeParse({ slug: "x", includeInstall: "yes" }).success).toBe(false);
    });
  });

  describe("get_kit_detail", () => {
    const schema = wrap(GetKitDetailInput);
    it("requires slug", () => {
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ slug: "x" }).success).toBe(true);
    });
  });

  describe("install_kit", () => {
    const schema = wrap(InstallKitInput);

    it("requires both slug and target", () => {
      expect(schema.safeParse({ slug: "x" }).success).toBe(false);
      expect(schema.safeParse({ target: "cursor" }).success).toBe(false);
    });

    it("accepts every SUPPORTED_TARGETS value", () => {
      for (const t of SUPPORTED_TARGETS) {
        expect(schema.safeParse({ slug: "x", target: t }).success).toBe(true);
      }
    });

    it("rejects unsupported targets", () => {
      expect(schema.safeParse({ slug: "x", target: "fake" }).success).toBe(false);
    });
  });
});

describe("MCP server module loads without throwing", () => {
  it("imports the registered tool definitions module", async () => {
    const mod = await import("../schemas.js");
    expect(mod.SearchKitsInput).toBeTruthy();
    expect(mod.GetCollectionInput).toBeTruthy();
    expect(mod.InstallKitInput).toBeTruthy();
  });
});
