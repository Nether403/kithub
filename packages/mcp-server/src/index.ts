import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { KitHubClient } from "@kithub/sdk";
import { INSTALL_TARGET_DETAILS } from "@kithub/schema";

const client = new KitHubClient();
const server = new McpServer({
  name: "kithub",
  version: "0.2.0",
});

// ── search_kits ───────────────────────────────────────────────────

server.tool(
  "search_kits",
  "Search the SkillKitHub registry for agent workflow kits. Returns matching kits with metadata, scores, ratings, and install counts. Use mode=semantic for intent-based search; falls back to keyword if embeddings are unavailable.",
  {
    query: z.string().optional().describe("Search term to find kits by title, tag, or intent"),
    mode: z.enum(["keyword", "semantic"]).optional().describe("Match strategy. Default: keyword"),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)"),
  },
  async ({ query, mode, limit }: { query?: string; mode?: "keyword" | "semantic"; limit?: number }) => {
    try {
      const result = await client.searchKits(query, undefined, { mode, limit });
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// ── get_related_kits ──────────────────────────────────────────────

server.tool(
  "get_related_kits",
  "Find kits similar to a given kit using semantic embeddings (with tag-overlap fallback). Useful for suggesting next steps after installing a kit.",
  {
    slug: z.string().describe("The source kit slug to find related kits for"),
    limit: z.number().int().min(1).max(20).optional().describe("Max related kits (default 6)"),
  },
  async ({ slug, limit }: { slug: string; limit?: number }) => {
    try {
      const result = await client.getRelatedKits(slug, limit ?? 6);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// ── list_collections ──────────────────────────────────────────────

server.tool(
  "list_collections",
  "List curated collections — handpicked stacks of kits for specific workflows (e.g., Indie Hacker, AI Researcher, SaaS Starter).",
  {},
  async () => {
    try {
      const result = await client.listCollections();
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// ── get_collection ────────────────────────────────────────────────

server.tool(
  "get_collection",
  "Get a curated collection's full details — including all kits in the stack and install instructions for the entire bundle.",
  {
    slug: z.string().describe("The collection slug"),
    includeInstall: z.boolean().optional().describe("If true, also fetch install instructions for the stack"),
    target: z
      .enum(["generic", "codex", "claude-code", "cursor", "mcp"])
      .optional()
      .describe("Optional install target — one of: generic, codex, claude-code, cursor, mcp"),
  },
  async ({ slug, includeInstall, target }: { slug: string; includeInstall?: boolean; target?: "generic" | "codex" | "claude-code" | "cursor" | "mcp" }) => {
    try {
      const detail = await client.getCollection(slug);
      const install = includeInstall ? await client.getCollectionInstall(slug, target) : null;
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ collection: detail, install }, null, 2),
        }],
      };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// ── get_kit_detail ────────────────────────────────────────────────

server.tool(
  "get_kit_detail",
  "Get full details of a specific kit including its raw markdown, parsed frontmatter, security scan results, and learnings count.",
  { slug: z.string().describe("The kit slug (URL-safe identifier)") },
  async ({ slug }: { slug: string }) => {
    try {
      const kit = await client.getKit(slug);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(kit, null, 2),
        }],
      };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// ── install_kit ───────────────────────────────────────────────────

server.tool(
  "install_kit",
  "Get target-specific install instructions for a kit. Returns pre-flight checks, harness steps, and instructions for the specified agent environment.",
  {
    slug: z.string().describe("The kit slug to install"),
    target: z.enum(["generic", "codex", "claude-code", "cursor", "mcp"])
      .describe("Target harness: generic, codex, claude-code, cursor, or mcp"),
  },
  async ({ slug, target }: { slug: string; target: "generic" | "codex" | "claude-code" | "cursor" | "mcp" }) => {
    try {
      const payload = await client.getInstallPayload(slug, target);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(payload, null, 2),
        }],
      };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// ── submit_learning ───────────────────────────────────────────────

server.tool(
  "submit_learning",
  "Submit a 'learning' to a kit — community-sourced solutions to edge cases like rate limits, runtime conflicts, or platform quirks.",
  {
    slug: z.string().describe("The kit slug to submit a learning for"),
    payload: z.string().describe("Description of the learning (what went wrong and how to fix it)"),
    os: z.string().optional().describe("Operating system context (e.g., macOS, Linux, Windows)"),
    model: z.string().optional().describe("Model used (e.g., gpt-4o, claude-sonnet-4-20250514)"),
    runtime: z.string().optional().describe("Runtime version (e.g., Node 20, Python 3.12)"),
    platform: z.string().optional().describe("Agent platform (e.g., Cursor, Claude Code, Codex)"),
  },
  async ({ slug, payload, os, model, runtime, platform }: { slug: string; payload: string; os?: string; model?: string; runtime?: string; platform?: string; }) => {
    try {
      const result = await client.submitLearning(slug, {
        context: { os, model, runtime, platform },
        payload,
      });
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: `Error: ${err.message}` }], isError: true };
    }
  }
);

// ── list_install_targets ──────────────────────────────────────────

server.tool(
  "list_install_targets",
  "List all supported install targets with descriptions.",
  {},
  async () => {
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(INSTALL_TARGET_DETAILS, null, 2),
      }],
    };
  }
);

// ── Start Server ──────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
