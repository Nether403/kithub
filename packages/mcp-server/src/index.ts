import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { KitHubClient } from "@kithub/sdk";

const client = new KitHubClient();
const server = new McpServer({
  name: "kithub",
  version: "0.2.0",
});

// ── search_kits ───────────────────────────────────────────────────

server.tool(
  "search_kits",
  "Search the SkillKitHub registry for agent workflow kits. Returns matching kits with metadata, scores, and install counts.",
  { query: z.string().optional().describe("Search term to find kits by title, tag, or intent") },
  async ({ query }: { query?: string }) => {
    try {
      const { kits } = await client.searchKits(query);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(kits, null, 2),
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
    const targets = [
      { target: "generic", description: "Standard install with bundle metadata, normalized kit.md, and preflight checks" },
      { target: "codex", description: "OpenAI Codex — generates AGENTS.md-targeted steps, stores under .kithub/" },
      { target: "claude-code", description: "Anthropic Claude Code — generates CLAUDE.md-targeted steps, stores under .kithub/" },
      { target: "cursor", description: "Cursor IDE — auto-loads rules/skills into .cursor/ directory" },
      { target: "mcp", description: "Model Context Protocol — returns MCP-oriented instruction payload" },
    ];
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(targets, null, 2),
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
