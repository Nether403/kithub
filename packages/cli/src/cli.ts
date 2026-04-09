#!/usr/bin/env node
import { Command } from "commander";
import { KitHubClient, type AuthResult } from "@kithub/sdk";
import type { KitInstallPayload } from "@kithub/schema";
import { parseKitMd } from "@kithub/schema";
import { scanKit } from "@kithub/schema/src/scanner";
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "fs";
import { join } from "path";
import { createInterface } from "readline";
import {
  clearAuthSession,
  clearConfig,
  getApiUrl,
  getToken,
  loadConfig,
  saveConfig,
  type KitHubConfig,
} from "./config";

interface InstallPayloadWithRaw extends KitInstallPayload {
  rawMarkdown?: string;
}

const AGENT_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

function createClient(): KitHubClient {
  const token = getToken();
  return new KitHubClient({ baseUrl: getApiUrl(), token: token ?? undefined });
}

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

const program = new Command();

function accent(text: string) { return `\x1b[32m${text}\x1b[0m`; }
function dim(text: string) { return `\x1b[2m${text}\x1b[0m`; }
function bold(text: string) { return `\x1b[1m${text}\x1b[0m`; }
function danger(text: string) { return `\x1b[31m${text}\x1b[0m`; }
function warn(text: string) { return `\x1b[33m${text}\x1b[0m`; }

function validateAgentName(agentName: string): string | null {
  const trimmed = agentName.trim();
  if (!trimmed) {
    return "Agent name is required.";
  }
  if (trimmed.length < 2 || trimmed.length > 64) {
    return "Agent name must be between 2 and 64 characters.";
  }
  if (!AGENT_NAME_PATTERN.test(trimmed)) {
    return "Agent name must be alphanumeric with hyphens or underscores.";
  }
  return null;
}

function saveVerifiedSession(result: AuthResult, email: string, fallbackAgentName?: string) {
  if (!result.token) {
    throw new Error("Verification succeeded but no access token was returned.");
  }

  saveConfig({
    token: result.token,
    refreshToken: result.refreshToken,
    expiresAt: result.expiresAt,
    email: result.email ?? email,
    agentName: result.agentName ?? fallbackAgentName,
  });
}

function getDefaultPromptValue(primary?: string | null, fallback?: string | null): string {
  return primary?.trim() || fallback?.trim() || "";
}

async function sendOtp(
  client: KitHubClient,
  email: string,
  agentName?: string
): Promise<{ result: AuthResult; mode: "login" | "register" }> {
  if (agentName) {
    const result = await client.register(email, agentName);
    return { result, mode: "register" };
  }

  const result = await client.login(email);
  return { result, mode: "login" };
}

async function interactiveSignIn(
  client: KitHubClient,
  options?: {
    requirePublisher?: boolean;
    defaultEmail?: string;
    suggestedAgentName?: string;
  }
): Promise<{ token: string; email: string; agentName?: string }> {
  const emailHint = options?.defaultEmail ? ` (${options.defaultEmail})` : "";
  const emailInput = await prompt(`  Email${emailHint}: `);
  const email = emailInput || options?.defaultEmail || "";
  if (!email) {
    throw new Error("Email is required.");
  }

  let requestedAgentName: string | undefined;
  if (options?.requirePublisher) {
    const suggestion = options?.suggestedAgentName
      ? ` current: ${options.suggestedAgentName}`
      : " needed for first-time publisher signup";
    console.log(`  ${dim(`Press Enter to sign in only, or enter an agent name to create/repair your publisher profile (${suggestion.trim()}).`)}`);
    const agentNameInput = await prompt("  Agent name (optional): ");
    if (agentNameInput) {
      const validationError = validateAgentName(agentNameInput);
      if (validationError) {
        throw new Error(validationError);
      }
      requestedAgentName = agentNameInput;
    }
  }

  const { result, mode } = await sendOtp(client, email, requestedAgentName);
  console.log(`  ${accent("✓")} ${result.message || `Verification code sent to ${email}`}`);
  if (mode === "register" && requestedAgentName) {
    console.log(`  ${dim("Publisher profile requested for")} ${bold(requestedAgentName)}`);
  }

  const code = await prompt("  Verification code: ");
  if (!code) {
    throw new Error("Verification code is required.");
  }

  const verifyResult = await client.verify(email, code);
  saveVerifiedSession(verifyResult, email, requestedAgentName);

  return {
    token: verifyResult.token!,
    email: verifyResult.email ?? email,
    agentName: verifyResult.agentName ?? requestedAgentName,
  };
}

async function resolveAuthSession(
  client: KitHubClient,
  options?: { interactive?: boolean; requirePublisher?: boolean }
): Promise<{ token: string | null; config: KitHubConfig }> {
  const envToken = process.env.KITHUB_TOKEN?.trim();
  if (envToken) {
    client.setToken(envToken);
    return { token: envToken, config: loadConfig() };
  }

  let config = loadConfig();
  const legacyStoredToken = config.token && !config.refreshToken;
  if (legacyStoredToken) {
    clearAuthSession();
    config = loadConfig();
    if (options?.interactive) {
      console.log(`\n  ${warn("Stored CLI session predates Supabase refresh support.")} Please sign in again.\n`);
    }
  }

  if (config.refreshToken) {
    const now = Math.floor(Date.now() / 1000);
    const shouldRefresh =
      !config.token || !config.expiresAt || config.expiresAt <= now + 60;

    if (shouldRefresh) {
      try {
        const refreshed = await client.refreshAuthSession(config.refreshToken);
        saveVerifiedSession(
          refreshed,
          getDefaultPromptValue(config.email, refreshed.email),
          getDefaultPromptValue(refreshed.agentName, config.agentName) || undefined
        );
        config = loadConfig();
      } catch {
        clearAuthSession();
        config = loadConfig();
        if (options?.interactive) {
          console.log(`\n  ${warn("Stored CLI session expired.")} Please sign in again.\n`);
        }
      }
    }
  }

  const storedToken = config.token?.trim() || null;
  if (storedToken) {
    client.setToken(storedToken);
    return { token: storedToken, config };
  }

  if (!options?.interactive) {
    return { token: null, config };
  }

  const interactiveSession = await interactiveSignIn(client, {
    requirePublisher: options.requirePublisher,
    defaultEmail: config.email,
    suggestedAgentName: config.agentName,
  });

  return { token: interactiveSession.token, config: loadConfig() };
}

program
  .name("kithub")
  .version("0.2.0")
  .description("SkillKitHub CLI — Discover, install, and publish agent workflows and skills");

program
  .command("search")
  .description("Search the SkillKitHub registry")
  .argument("[query]", "Search term")
  .option("--tag <tag>", "Filter by tag")
  .option("--json", "Output raw JSON")
  .action(async (query, opts) => {
    try {
      const client = createClient();
      const { kits } = await client.searchKits(query, opts.tag);

      if (opts.json) {
        console.log(JSON.stringify(kits, null, 2));
        return;
      }

      if (kits.length === 0) {
        console.log(dim("No kits found."));
        return;
      }

      console.log(`\n  ${bold("SkillKitHub Registry")} ${dim(`(${kits.length} results)`)}\n`);

      for (const kit of kits) {
        const scoreColor = (kit.score ?? 0) >= 9 ? accent : (kit.score ?? 0) >= 7 ? warn : danger;
        console.log(`  ${accent("◆")} ${bold(kit.title)} ${dim(`v${kit.version}`)}`);
        console.log(`    ${dim(kit.summary)}`);
        console.log(`    ${dim("slug:")} ${kit.slug}  ${scoreColor(`score: ${kit.score}/10`)}  ${dim(`${kit.installs} installs`)}`);
        console.log(`    ${dim("tags:")} ${kit.tags.map((t: string) => `#${t}`).join(" ")}`);
        console.log();
      }
    } catch (err: any) {
      console.error(danger(`Error: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command("install")
  .description("Install a kit to the local project")
  .argument("<slug>", "Kit slug to install")
  .option("--target <target>", "Target harness (generic, codex, claude-code, cursor, mcp)")
  .option("--json", "Output raw JSON")
  .option("--dry-run", "Show what would be written without writing files")
  .action(async (slug, opts) => {
    try {
      const client = createClient();
      const target = opts.target || detectTarget();

      const payload = await client.getInstallPayload(slug, target) as InstallPayloadWithRaw;

      if (opts.json) {
        console.log(JSON.stringify(payload, null, 2));
        return;
      }

      console.log(`\n  ${accent("◆")} ${bold(`Installing ${slug}`)} ${dim(`→ ${target}`)}\n`);

      if (!opts.dryRun) {
        const written = writeInstallFiles(payload, target);
        if (written.length > 0) {
          console.log(`  ${bold("Files written:")}`);
          for (const f of written) {
            console.log(`    ${accent("✓")} ${f}`);
          }
          console.log();
        }
      } else {
        console.log(`  ${dim("(dry-run mode — no files written)")}\n`);
      }

      console.log(dim("─".repeat(60)));
      console.log(payload.instructions);
      console.log(dim("─".repeat(60)));

      console.log(`\n  ${bold("Preflight Checks:")}`);
      for (const check of payload.preflightChecks) {
        console.log(`    ${check.required ? accent("✓") : dim("○")} ${check.check}`);
      }

      console.log(`\n  ${bold("Harness Steps:")}`);
      for (const step of payload.harnessSteps) {
        console.log(`    ${accent(String(step.step))}. [${step.action}] ${step.detail}`);
      }
      console.log();
    } catch (err: any) {
      console.error(danger(`Error: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command("publish")
  .description("Publish a kit.md to the registry")
  .argument("[file]", "Path to kit.md file", "kit.md")
  .action(async (file) => {
    try {
      const client = createClient();
      const { token } = await resolveAuthSession(client, {
        interactive: true,
        requirePublisher: true,
      });

      if (!token) {
        throw new Error("Authentication failed.");
      }

      client.setToken(token);

      let raw: string;
      try {
        raw = readFileSync(file, "utf-8");
      } catch {
        console.error(danger(`File not found: ${file}`));
        process.exit(1);
      }

      console.log(`\n  ${accent("◆")} ${bold("Publishing")} ${dim(file)}\n`);

      console.log(`  ${dim("Validating locally...")}`);
      let parsed;
      try {
        parsed = parseKitMd(raw);
      } catch (err: any) {
        console.error(danger(`  Local validation failed: ${err.message}`));
        process.exit(1);
      }

      const localScan = scanKit(raw, parsed.frontmatter);
      if (!localScan.passed) {
        console.error(danger(`  Local safety scan failed (score: ${localScan.score}/10)`));
        for (const f of localScan.findings) {
          const icon = f.type === "error" ? danger("✕") : f.type === "warning" ? warn("⚠") : accent("💡");
          console.error(`    ${icon} ${f.message}`);
        }
        process.exit(1);
      }
      console.log(`  ${accent("✓")} Local validation passed (${parsed.frontmatter.slug} v${parsed.frontmatter.version})\n`);

      let result;
      try {
        result = await client.publishKit(raw);
      } catch (err: any) {
        if (typeof err.message === "string" && err.message.includes("Publisher profile required")) {
          const config = loadConfig();
          console.error(danger(`Error: ${err.message}`));
          if (config.email) {
            console.error(dim(`Hint: run ${bold(`kithub register ${config.email} <agentName>`)} or sign in again and enter an agent name.`));
          }
          process.exit(1);
        }
        throw err;
      }

      const webUrl = process.env.KITHUB_WEB_URL || loadConfig().apiUrl?.replace(":8080", ":5000") || "http://localhost:3000";
      const liveUrl = `${webUrl}/registry/${result.slug}`;

      console.log(`  Status: ${result.status === "published" ? accent("PUBLISHED ✓") : danger("BLOCKED ✕")}`);
      console.log(`  Slug: ${result.slug}`);
      console.log(`  Version: v${result.version}`);
      console.log(`  Conformance: ${result.conformanceLevel}`);

      const scoreColor = result.scan.score >= 9 ? accent : result.scan.score >= 7 ? warn : danger;
      console.log(`  Score: ${scoreColor(`${result.scan.score}/10`)}`);
      console.log(`  URL: ${accent(liveUrl)}\n`);

      if (result.scan.findings.length > 0) {
        console.log(`  ${bold("Findings:")}`);
        for (const f of result.scan.findings) {
          const icon = f.type === "error" ? danger("✕") : f.type === "warning" ? warn("⚠") : accent("💡");
          console.log(`    ${icon} ${f.message}`);
        }
        console.log();
      }

      if (result.scan.tips.length > 0) {
        console.log(`  ${bold("Tips:")}`);
        for (const tip of result.scan.tips) {
          console.log(`    ${dim("→")} ${tip}`);
        }
        console.log();
      }

      if (result.status === "blocked") {
        process.exit(1);
      }
    } catch (err: any) {
      console.error(danger(`Error: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command("login")
  .description("Authenticate with SkillKitHub using a Supabase email OTP")
  .argument("<email>", "Your email")
  .action(async (email) => {
    try {
      const client = createClient();
      console.log(`\n  ${accent("◆")} ${bold("SkillKitHub Login")}\n`);

      const result = await client.login(email);
      console.log(`  ${accent("✓")} ${result.message || `Verification code sent to ${email}`}`);
      console.log(`  ${dim("Enter the code via:")} kithub verify ${email} <code>`);
      console.log(`  ${dim("First-time publisher? Use:")} kithub register ${email} <agentName>`);
      console.log();
    } catch (err: any) {
      console.error(danger(`Error: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command("register")
  .description("Create or repair a publisher profile, then send a Supabase email OTP")
  .argument("<email>", "Your email")
  .argument("<agentName>", "Publisher agent name")
  .action(async (email, agentName) => {
    try {
      const validationError = validateAgentName(agentName);
      if (validationError) {
        throw new Error(validationError);
      }

      const client = createClient();
      console.log(`\n  ${accent("◆")} ${bold("SkillKitHub Register")}\n`);

      const result = await client.register(email, agentName);
      console.log(`  ${accent("✓")} ${result.message || `Verification code sent to ${email}`}`);
      console.log(`  ${dim("Publisher profile requested for")} ${bold(agentName)}`);
      console.log(`  ${dim("Enter the code via:")} kithub verify ${email} <code>`);
      console.log();
    } catch (err: any) {
      console.error(danger(`Error: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command("verify")
  .description("Verify login code and store the Supabase session")
  .argument("<email>", "Your email")
  .argument("<code>", "6-digit verification code")
  .action(async (email, code) => {
    try {
      const client = createClient();
      const result = await client.verify(email, code);

      saveVerifiedSession(result, email);
      console.log(`\n  ${accent("✓")} Verified and session saved!`);
      console.log(`  ${dim("Logged in as")} ${bold(result.agentName || result.email || email)}`);
      console.log();
    } catch (err: any) {
      console.error(danger(`Error: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command("whoami")
  .description("Show current authenticated user")
  .action(async () => {
    const client = createClient();
    const { token } = await resolveAuthSession(client, { interactive: false });
    const config = loadConfig();

    if (!token) {
      console.log(`\n  ${dim("Not logged in. Run")} kithub login <email> ${dim("to authenticate.")}\n`);
      process.exit(1);
    }

    console.log(`\n  ${accent("◆")} ${bold("SkillKitHub Identity")}\n`);
    if (config.email) console.log(`  Email: ${config.email}`);
    if (config.agentName) console.log(`  Agent: ${bold(config.agentName)}`);
    if (config.expiresAt) {
      console.log(`  Expires: ${new Date(config.expiresAt * 1000).toISOString()}`);
    }
    console.log(`  Token: ${dim(token.slice(0, 20) + "...")}`);
    console.log();
  });

program
  .command("logout")
  .description("Clear stored credentials")
  .action(() => {
    clearConfig();
    console.log(`\n  ${accent("✓")} Logged out. Session cleared.\n`);
  });

function detectTarget(): string {
  if (existsSync(".cursor")) return "cursor";
  if (existsSync("CLAUDE.md")) return "claude-code";
  if (existsSync("AGENTS.md")) return "codex";
  return "generic";
}

function writeInstallFiles(payload: InstallPayloadWithRaw, target: string): string[] {
  const written: string[] = [];
  const slug = payload.kitSlug;
  const kitContent = payload.rawMarkdown || "";

  if (!slug) return written;

  for (const step of payload.harnessSteps) {
    if (step.action === "mkdir") {
      const dir = step.detail.replace(/\s.*$/, "");
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        written.push(dir);
      }
    }

    if (step.action === "write") {
      const filePath = step.detail.split(" ")[0];
      if (filePath && kitContent) {
        const dir = join(filePath, "..");
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        writeFileSync(filePath, kitContent, "utf-8");
        written.push(filePath);
      }
    }

    if (step.action === "append") {
      const filePath = step.detail.split(" ")[0];
      if (filePath) {
        const header = `\n## Agent Kit: ${slug}\nSource: skillkithub.com/registry/${slug}\n`;
        appendFileSync(filePath, header, "utf-8");
        written.push(filePath);
      }
    }
  }

  if (written.length === 0 && target === "generic" && kitContent) {
    const dir = `.kithub/${slug}`;
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const kitFile = `${dir}/kit.md`;
    writeFileSync(kitFile, kitContent, "utf-8");
    written.push(kitFile);
  }

  return written;
}

program.parse();
