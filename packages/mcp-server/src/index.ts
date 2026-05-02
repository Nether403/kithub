import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { KitHubClient } from "@kithub/sdk";
import { INSTALL_TARGET_DETAILS, SUPPORTED_TARGETS } from "@kithub/schema";
import {
  SearchKitsInput,
  GetRelatedKitsInput,
  ListCollectionsInput,
  GetCollectionInput,
  GetKitDetailInput,
  InstallKitInput,
  SubmitLearningInput,
  ListInstallTargetsInput,
} from "./schemas.js";

type Target = (typeof SUPPORTED_TARGETS)[number];

const client = new KitHubClient();
const server = new McpServer({
  name: "kithub",
  version: "0.2.0",
});

// ── search_kits ───────────────────────────────────────────────────

server.tool(
  "search_kits",
  "Search the SkillKitHub registry for agent workflow kits. Returns matching kits with metadata, scores, ratings, and install counts. Use mode=semantic for intent-based search; falls back to keyword if embeddings are unavailable.",
  SearchKitsInput,
  async ({ query, mode, limit }: { query?: string; mode?: "keyword" | "semantic"; limit?: number }) => {
    try {
      const result = await client.searchKits(query, undefined, { mode, limit });
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  }
);

// ── get_related_kits ──────────────────────────────────────────────

server.tool(
  "get_related_kits",
  "Find kits similar to a given kit using semantic embeddings (with tag-overlap fallback). Useful for suggesting next steps after installing a kit.",
  GetRelatedKitsInput,
  async ({ slug, limit }: { slug: string; limit?: number }) => {
    try {
      const result = await client.getRelatedKits(slug, limit ?? 6);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  }
);

// ── list_collections ──────────────────────────────────────────────

server.tool(
  "list_collections",
  "List curated collections — handpicked stacks of kits for specific workflows (e.g., Indie Hacker, AI Researcher, SaaS Starter).",
  ListCollectionsInput,
  async () => {
    try {
      const result = await client.listCollections();
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  }
);

// ── get_collection ────────────────────────────────────────────────

server.tool(
  "get_collection",
  "Get a curated collection's full details — including all kits in the stack and install instructions for the entire bundle.",
  GetCollectionInput,
  async ({ slug, includeInstall, target }: { slug: string; includeInstall?: boolean; target?: Target }) => {
    try {
      const detail = await client.getCollection(slug);
      const install = includeInstall ? await client.getCollectionInstall(slug, target) : null;
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ collection: detail, install }, null, 2),
        }],
      };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  }
);

// ── get_kit_detail ────────────────────────────────────────────────

server.tool(
  "get_kit_detail",
  "Get full details of a specific kit including its raw markdown, parsed frontmatter, security scan results, and learnings count.",
  GetKitDetailInput,
  async ({ slug }: { slug: string }) => {
    try {
      const kit = await client.getKit(slug);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(kit, null, 2),
        }],
      };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  }
);

// ── install_kit ───────────────────────────────────────────────────

server.tool(
  "install_kit",
  "Get target-specific install instructions for a kit. Returns pre-flight checks, harness steps, and instructions for the specified agent environment.",
  InstallKitInput,
  async ({ slug, target }: { slug: string; target: Target }) => {
    try {
      const payload = await client.getInstallPayload(slug, target);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(payload, null, 2),
        }],
      };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  }
);

// ── submit_learning ───────────────────────────────────────────────

server.tool(
  "submit_learning",
  "Submit a 'learning' to a kit — community-sourced solutions to edge cases like rate limits, runtime conflicts, or platform quirks.",
  SubmitLearningInput,
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
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  }
);

// ── list_install_targets ──────────────────────────────────────────

server.tool(
  "list_install_targets",
  "List all supported install targets with descriptions.",
  ListInstallTargetsInput,
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
