/**
 * Install target definitions and payload generation for SkillKitHub.
 * Implements the PRD's ?target= API contract.
 */
import type { KitFrontmatter, KitInstallPayload } from "./index";

export const SUPPORTED_TARGETS = ["generic", "codex", "claude-code", "cursor", "mcp"] as const;
export type InstallTarget = typeof SUPPORTED_TARGETS[number];

export function isValidTarget(target: string): target is InstallTarget {
  return SUPPORTED_TARGETS.includes(target as InstallTarget);
}

/**
 * Generate target-specific install payloads per the PRD contract.
 * Returns { instructions, preflightChecks, harnessSteps }.
 */
export function generateInstallPayload(
  kit: {
    frontmatter: KitFrontmatter;
    rawMarkdown: string;
  },
  target: InstallTarget
): KitInstallPayload {
  const fm = kit.frontmatter;
  const basePreflightChecks = [
    { check: `Model: ${fm.model.provider}/${fm.model.name} (${fm.model.hosting})`, required: true },
    ...(fm.tools ?? []).map(t => ({ check: `Tool available: ${t}`, required: true })),
    ...(fm.skills ?? []).map(s => ({ check: `Skill available: ${s}`, required: false })),
  ];

  switch (target) {
    case "generic":
      return {
        instructions: [
          `# Install Kit: ${fm.title}`,
          ``,
          `This kit requires ${fm.model.provider}/${fm.model.name} (${fm.model.hosting}).`,
          ``,
          `## Quick Start`,
          `1. Save the kit.md file to your project`,
          `2. Ensure all required tools are available: ${(fm.tools ?? []).join(", ")}`,
          `3. Follow the Steps section in the kit.md`,
          ``,
          `## Kit Content`,
          `\`\`\``,
          kit.rawMarkdown.slice(0, 500),
          `\`\`\``,
        ].join("\n"),
        preflightChecks: basePreflightChecks,
        harnessSteps: [
          { step: 1, action: "save", detail: `Write kit.md to project root` },
          { step: 2, action: "verify", detail: `Check model and tool availability` },
          { step: 3, action: "execute", detail: `Follow kit Steps section` },
        ],
        target: "generic",
        kitSlug: fm.slug,
        version: fm.version,
      };

    case "codex":
      return {
        instructions: [
          `# Kit Installation for OpenAI Codex (AGENTS.md)`,
          ``,
          `Write the following to \`AGENTS.md\` in the workspace root:`,
          ``,
          `---`,
          `## Agent Kit: ${fm.title} (v${fm.version})`,
          `Source: skillkithub.com/registry/${fm.slug}`,
          `Model: ${fm.model.provider}/${fm.model.name}`,
          ``,
          `### Instructions`,
          `Follow the kit.md specification stored at \`.kithub/${fm.slug}/kit.md\``,
          `---`,
          ``,
          `Also write the raw kit to \`.kithub/${fm.slug}/kit.md\`.`,
        ].join("\n"),
        preflightChecks: basePreflightChecks,
        harnessSteps: [
          { step: 1, action: "mkdir", detail: `.kithub/${fm.slug}/` },
          { step: 2, action: "write", detail: `.kithub/${fm.slug}/kit.md ← raw kit content` },
          { step: 3, action: "append", detail: `AGENTS.md ← kit reference header` },
        ],
        target: "codex",
        kitSlug: fm.slug,
        version: fm.version,
      };

    case "claude-code":
      return {
        instructions: [
          `# Kit Installation for Claude Code (CLAUDE.md)`,
          ``,
          `Write the following to \`CLAUDE.md\` in the workspace root:`,
          ``,
          `---`,
          `## Agent Kit: ${fm.title} (v${fm.version})`,
          `Source: skillkithub.com/registry/${fm.slug}`,
          `Model: ${fm.model.provider}/${fm.model.name}`,
          ``,
          `### Instructions`,
          `Follow the kit.md specification stored at \`.kithub/${fm.slug}/kit.md\``,
          `---`,
          ``,
          `Also write the raw kit to \`.kithub/${fm.slug}/kit.md\`.`,
        ].join("\n"),
        preflightChecks: basePreflightChecks,
        harnessSteps: [
          { step: 1, action: "mkdir", detail: `.kithub/${fm.slug}/` },
          { step: 2, action: "write", detail: `.kithub/${fm.slug}/kit.md ← raw kit content` },
          { step: 3, action: "append", detail: `CLAUDE.md ← kit reference header` },
        ],
        target: "claude-code",
        kitSlug: fm.slug,
        version: fm.version,
      };

    case "cursor":
      return {
        instructions: [
          `# Kit Installation for Cursor (.cursor/)`,
          ``,
          `Auto-load the kit rules and skills into the \`.cursor/\` directory:`,
          ``,
          `1. Write kit.md to \`.cursor/kithub/${fm.slug}/kit.md\``,
          `2. Extract skills to \`.cursor/skills/${fm.slug}/\``,
          `3. Add kit reference to \`.cursor/rules.md\``,
        ].join("\n"),
        preflightChecks: basePreflightChecks,
        harnessSteps: [
          { step: 1, action: "mkdir", detail: `.cursor/kithub/${fm.slug}/` },
          { step: 2, action: "write", detail: `.cursor/kithub/${fm.slug}/kit.md ← raw kit content` },
          { step: 3, action: "append", detail: `.cursor/rules.md ← kit reference` },
        ],
        target: "cursor",
        kitSlug: fm.slug,
        version: fm.version,
      };

    case "mcp":
      return {
        instructions: [
          `# Kit Installation via MCP`,
          ``,
          `This kit is available as an MCP resource.`,
          ``,
          `Add to your MCP configuration:`,
          `\`\`\`json`,
          `{`,
          `  "tools": [{`,
          `    "name": "${fm.slug}",`,
          `    "description": "${fm.summary}",`,
          `    "source": "kithub:${fm.slug}@${fm.version}"`,
          `  }]`,
          `}`,
          `\`\`\``,
        ].join("\n"),
        preflightChecks: [
          ...basePreflightChecks,
          { check: "MCP server running and accessible", required: true },
        ],
        harnessSteps: [
          { step: 1, action: "configure", detail: `Add kit to MCP server configuration` },
          { step: 2, action: "verify", detail: `Confirm kit tools are listed in MCP tool discovery` },
          { step: 3, action: "execute", detail: `Invoke kit via MCP tool call` },
        ],
        target: "mcp",
        kitSlug: fm.slug,
        version: fm.version,
      };
  }
}
