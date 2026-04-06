#!/usr/bin/env node
import { Command } from "commander";
import { KitHubClient } from "@kithub/sdk";
import { readFileSync } from "fs";

const client = new KitHubClient();
const program = new Command();

// ── Helpers ───────────────────────────────────────────────────────

function accent(text: string) { return `\x1b[32m${text}\x1b[0m`; }
function dim(text: string) { return `\x1b[2m${text}\x1b[0m`; }
function bold(text: string) { return `\x1b[1m${text}\x1b[0m`; }
function danger(text: string) { return `\x1b[31m${text}\x1b[0m`; }
function warn(text: string) { return `\x1b[33m${text}\x1b[0m`; }

// ══════════════════════════════════════════════════════════════════

program
  .name("kithub")
  .version("0.2.0")
  .description("KitHub CLI — Discover, install, and publish agent workflows");

// ── Search ────────────────────────────────────────────────────────

program
  .command("search")
  .description("Search the KitHub registry")
  .argument("[query]", "Search term")
  .option("--tag <tag>", "Filter by tag")
  .option("--json", "Output raw JSON")
  .action(async (query, opts) => {
    try {
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

// ── Install ───────────────────────────────────────────────────────

program
  .command("install")
  .description("Install a kit with target-specific instructions")
  .argument("<slug>", "Kit slug to install")
  .option("--target <target>", "Target harness", "generic")
  .option("--json", "Output raw JSON")
  .action(async (slug, opts) => {
    try {
      const payload = await client.getInstallPayload(slug, opts.target);

      if (opts.json) {
        console.log(JSON.stringify(payload, null, 2));
        return;
      }

      console.log(`\n  ${accent("◆")} ${bold(`Installing ${slug}`)} ${dim(`→ ${opts.target}`)}\n`);
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

// ── Publish ───────────────────────────────────────────────────────

program
  .command("publish")
  .description("Publish a kit.md to the registry")
  .argument("[file]", "Path to kit.md file", "kit.md")
  .action(async (file) => {
    try {
      // Check auth
      const token = process.env.KITHUB_TOKEN;
      if (!token) {
        console.error(danger("Not authenticated. Run `kithub login` first or set KITHUB_TOKEN."));
        process.exit(1);
      }
      client.setToken(token);

      // Read file
      let raw: string;
      try {
        raw = readFileSync(file, "utf-8");
      } catch {
        console.error(danger(`File not found: ${file}`));
        process.exit(1);
      }

      console.log(`\n  ${accent("◆")} ${bold("Publishing")} ${dim(file)}\n`);

      const result = await client.publishKit(raw);

      console.log(`  Status: ${result.status === "published" ? accent("PUBLISHED ✓") : danger("BLOCKED ✕")}`);
      console.log(`  Slug: ${result.slug}`);
      console.log(`  Version: v${result.version}`);
      console.log(`  Conformance: ${result.conformanceLevel}`);

      const scoreColor = result.scan.score >= 9 ? accent : result.scan.score >= 7 ? warn : danger;
      console.log(`  Score: ${scoreColor(`${result.scan.score}/10`)}\n`);

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
    } catch (err: any) {
      console.error(danger(`Error: ${err.message}`));
      process.exit(1);
    }
  });

// ── Login ─────────────────────────────────────────────────────────

program
  .command("login")
  .description("Authenticate with KitHub (passwordless email)")
  .argument("<email>", "Your registered email")
  .action(async (email) => {
    try {
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

// ── Verify ────────────────────────────────────────────────────────

program
  .command("verify")
  .description("Verify login code")
  .argument("<email>", "Your email")
  .argument("<code>", "6-digit verification code")
  .action(async (email, code) => {
    try {
      const result = await client.verify(email, code);

      console.log(`\n  ${accent("✓")} Verified! Token: ${dim(result.token!.slice(0, 20) + "...")}`);
      console.log(`  ${dim("Set in your shell:")} export KITHUB_TOKEN=${result.token}`);
      console.log();
    } catch (err: any) {
      console.error(danger(`Error: ${err.message}`));
      process.exit(1);
    }
  });

// ══════════════════════════════════════════════════════════════════

program.parse();
