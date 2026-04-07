#!/usr/bin/env node
import { Command } from "commander";
import { KitHubClient } from "@kithub/sdk";
import type { KitInstallPayload } from "@kithub/schema";
import { parseKitMd } from "@kithub/schema";
import { scanKit } from "@kithub/schema/src/scanner";
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "fs";
import { join } from "path";
import { createInterface } from "readline";
import { getToken, getApiUrl, saveConfig, clearConfig, loadConfig } from "./config";

interface InstallPayloadWithRaw extends KitInstallPayload {
  rawMarkdown?: string;
}

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

program
  .name("kithub")
  .version("0.2.0")
  .description("KitHub CLI — Discover, install, and publish agent workflows");

program
  .command("search")
  .description("Search the KitHub registry")
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

      console.log(`\n  ${bold("KitHub Registry")} ${dim(`(${kits.length} results)`)}\n`);

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
      let token = getToken();

      if (!token) {
        console.log(`\n  ${warn("Not authenticated.")} Let's log you in first.\n`);
        const email = await prompt("  Email: ");
        if (!email) {
          console.error(danger("Email is required."));
          process.exit(1);
        }

        await client.login(email);
        console.log(`  ${accent("✓")} Verification code sent to ${email}`);

        const code = await prompt("  Verification code: ");
        if (!code) {
          console.error(danger("Code is required."));
          process.exit(1);
        }

        const verifyResult = await client.verify(email, code);
        if (!verifyResult.token) {
          console.error(danger("Verification failed."));
          process.exit(1);
        }

        token = verifyResult.token;
        saveConfig({ token, email, agentName: verifyResult.agentName });
        console.log(`  ${accent("✓")} Logged in as ${bold(verifyResult.agentName || email)}\n`);
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

      const result = await client.publishKit(raw);

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
  .description("Authenticate with KitHub (passwordless email)")
  .argument("<email>", "Your registered email")
  .action(async (email) => {
    try {
      const client = createClient();
      console.log(`\n  ${accent("◆")} ${bold("KitHub Login")}\n`);

      const result = await client.login(email);
      console.log(`  ${accent("✓")} ${result.message}`);
      console.log(`  ${dim("Enter the code via:")} kithub verify ${email} <code>`);
      console.log();
    } catch (err: any) {
      console.error(danger(`Error: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command("verify")
  .description("Verify login code and store token")
  .argument("<email>", "Your email")
  .argument("<code>", "6-digit verification code")
  .action(async (email, code) => {
    try {
      const client = createClient();
      const result = await client.verify(email, code);

      if (result.token) {
        saveConfig({ token: result.token, email, agentName: result.agentName });
        console.log(`\n  ${accent("✓")} Verified and token saved!`);
        console.log(`  ${dim("Logged in as")} ${bold(result.agentName || email)}`);
      } else {
        console.log(`\n  ${accent("✓")} Verified!`);
      }
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
    const config = loadConfig();
    const token = getToken();

    if (!token) {
      console.log(`\n  ${dim("Not logged in. Run")} kithub login <email> ${dim("to authenticate.")}\n`);
      process.exit(1);
    }

    console.log(`\n  ${accent("◆")} ${bold("KitHub Identity")}\n`);
    if (config.email) console.log(`  Email: ${config.email}`);
    if (config.agentName) console.log(`  Agent: ${bold(config.agentName)}`);
    console.log(`  Token: ${dim(token.slice(0, 20) + "...")}`);
    console.log();
  });

program
  .command("logout")
  .description("Clear stored credentials")
  .action(() => {
    clearConfig();
    console.log(`\n  ${accent("✓")} Logged out. Token cleared.\n`);
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
        const header = `\n## Agent Kit: ${slug}\nSource: kithub.com/registry/${slug}\n`;
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
