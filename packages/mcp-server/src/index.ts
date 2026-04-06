#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { KitHubClient } from "@kithub/sdk";

const client = new KitHubClient();

const server = new Server(
  {
    name: "kithub-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_kits",
        description: "Search the KitHub registry for AI agent setups and workflows",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
          },
        },
      },
      {
        name: "install_kit",
        description: "Get the kit package and autonomous instructions for a target model",
        inputSchema: {
          type: "object",
          properties: {
            slug: { type: "string" },
            target: { type: "string", description: "claude-code, codex, mcp, generic" },
          },
          required: ["slug", "target"]
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === "search_kits") {
      return {
        content: [{ type: "text", text: "Found Kit: weekly-earnings-preview" }],
      };
    }

    if (request.params.name === "install_kit") {
      const { slug, target } = request.params.arguments as any;
      const payload = await client.getInstallPayload(slug, target);
      return {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      };
    }

    throw new Error(`Tool not found: ${request.params.name}`);
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("KitHub MCP Server running on stdio");
}

main().catch(console.error);
