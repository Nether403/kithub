#!/usr/bin/env node
import { Command } from "commander";
import { KitHubClient } from "@kithub/sdk";
import type { KitInstallPayload } from "@kithub/schema";
import { parseKitMd } from "@kithub/schema";
import { scanKit } from "@kithub/schema/src/scanner";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import { createInterface } from "readline";
import {
  authenticateWithOtp,
  completeOtpVerification,
  ensurePublisherProfile,
  runWithPublisherRepair,
  resolveAuthSession,
  validateAgentName,
  type CliAuthIo,
} from "./auth";
import {
  clearAuthSession,
  getApiUrl,
  getToken,
  loadConfig,
} from "./config";

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

function createConsoleIo(): CliAuthIo {
  return {
    prompt,
    log: (message) => console.log(message),
    error: (message) => console.error(message),
  };
}

const program = new Command();

function accent(text: string) {
  return `\x1b[32m${text}\x1b[0m`;
}

function dim(text: string) {
  return `\x1b[2m${text}\x1b[0m`;
}

function bold(text: string) {
  return `\x1b[1m${text}\x1b[0m`;
}

function danger(text: string) {
  return `\x1b[31m${text}\x1b[0m`;
}

function warn(text: string) {
  return `\x1b[33m${text}\x1b[0m`;
}

function renderIdentityLabel(email?: string, agentName?: string | null) {
  return agentName || email || "unknown user";
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
      const io = createConsoleIo();
      let session = await resolveAuthSession(client, io, {
        interactive: true,
        requirePublisher: true,
        bootstrapIdentity: true,
      });

      if (!session.token) {
        throw new Error("Authentication failed.");
      }

      if (!session.identity?.publisherId) {
        session = await ensurePublisherProfile(client, io, session);
      }

      client.setToken(session.token!);

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

      const publishAttempt = await runWithPublisherRepair(client, io, session, () =>
        client.publishKit(raw)
      );
      session = publishAttempt.session;
      const result = publishAttempt.result;

      const webUrl =
        process.env.KITHUB_WEB_URL ||
        loadConfig().apiUrl?.replace(":8080", ":5000") ||
        "http://localhost:3000";
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
  .argument("[email]", "Your email")
  .action(async (email) => {
    try {
      const client = createClient();
      const io = createConsoleIo();
      console.log(`\n  ${accent("◆")} ${bold("SkillKitHub Login")}\n`);

      const { identity, result } = await authenticateWithOtp(client, io, {
        email,
        defaultEmail: loadConfig().email,
        otpSuccessPrefix: accent("✓"),
      });

      console.log(`\n  ${accent("✓")} Session saved for ${bold(renderIdentityLabel(identity.email, identity.publisherName ?? result.agentName))}\n`);
    } catch (err: any) {
      console.error(danger(`Error: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command("register")
  .description("Create or repair a publisher profile, then complete the Supabase email OTP flow")
  .argument("[email]", "Your email")
  .argument("[agentName]", "Publisher agent name")
  .action(async (email, agentName) => {
    try {
      const client = createClient();
      const io = createConsoleIo();
      const config = loadConfig();
      console.log(`\n  ${accent("◆")} ${bold("SkillKitHub Register")}\n`);

      let requestedAgentName = agentName?.trim() || "";
      if (!requestedAgentName) {
        const hint = config.agentName ? ` (${config.agentName})` : "";
        requestedAgentName =
          (await io.prompt(`  Agent name${hint}: `)).trim() ||
          config.agentName?.trim() ||
          "";
      }

      const validationError = validateAgentName(requestedAgentName);
      if (validationError) {
        throw new Error(validationError);
      }

      const { identity } = await authenticateWithOtp(client, io, {
        email,
        defaultEmail: config.email,
        agentName: requestedAgentName,
        otpSuccessPrefix: accent("✓"),
      });

      if (!identity.publisherId) {
        throw new Error(identity.publisherIssue ?? "Publisher profile could not be created.");
      }

      console.log(`\n  ${accent("✓")} Publisher profile ready for ${bold(identity.publisherName ?? requestedAgentName)}\n`);
    } catch (err: any) {
      console.error(danger(`Error: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command("verify")
  .description("Verify a login code and store the Supabase session")
  .argument("[first]", "Email or verification code")
  .argument("[second]", "Verification code")
  .action(async (first, second) => {
    try {
      const config = loadConfig();
      const client = createClient();
      const code = (second ?? first)?.trim() || "";
      const email = (second ? first : config.email)?.trim() || "";

      if (!code) {
        throw new Error("Verification code is required.");
      }
      if (!email) {
        throw new Error("Email is required. Pass it explicitly or run `kithub login` again.");
      }

      const { identity } = await completeOtpVerification(
        client,
        email,
        code,
        config.agentName
      );

      console.log(`\n  ${accent("✓")} Verified and session saved for ${bold(renderIdentityLabel(identity.email, identity.publisherName))}\n`);
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
    const session = await resolveAuthSession(client, undefined, {
      interactive: false,
      bootstrapIdentity: true,
    });
    const config = loadConfig();

    if (!session.token) {
      console.log(`\n  ${dim("Not logged in. Run")} kithub login ${dim("to authenticate.")}\n`);
      process.exit(1);
    }

    console.log(`\n  ${accent("◆")} ${bold("SkillKitHub Identity")}\n`);
    if (session.identity) {
      console.log(`  Email: ${session.identity.email}`);
      if (session.identity.publisherName) {
        console.log(`  Agent: ${bold(session.identity.publisherName)}`);
      }
      if (session.identity.publisherIssue) {
        console.log(`  Publisher: ${warn(session.identity.publisherIssue)}`);
      }
      console.log(`  User ID: ${session.identity.userId}`);
      console.log(`  Supabase User ID: ${session.identity.supabaseUserId}`);
    } else {
      if (config.email) console.log(`  Email: ${config.email}`);
      if (config.agentName) console.log(`  Agent: ${bold(config.agentName)}`);
      console.log(`  ${dim("Live identity unavailable; showing cached session details.")}`);
    }
    if (config.expiresAt) {
      console.log(`  Expires: ${new Date(config.expiresAt * 1000).toISOString()}`);
    }
    console.log(`  Token: ${dim(session.token.slice(0, 20) + "...")}`);
    console.log();
  });

program
  .command("logout")
  .description("Clear stored credentials")
  .action(() => {
    clearAuthSession();
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
