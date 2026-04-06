#!/usr/bin/env node
import { Command } from "commander";
import { KitHubClient } from "@kithub/sdk";

const program = new Command();
const client = new KitHubClient();

program
  .name("kithub")
  .description("CLI to interact with KitHub API")
  .version("0.1.0");

program.command('search')
  .description('Search the KitHub registry for kits')
  .argument('[query]', 'Search query')
  .action(async (query) => {
    console.log(`Searching for: ${query || 'all kits'}...`);
    console.log("Mock result: found tools/weekly-earnings-preview");
  });

program.command('install')
  .description('Install a kit from the registry')
  .argument('<slug>', 'kit slug')
  .option('--target <target>', 'target environment', 'generic')
  .action(async (slug, options) => {
    try {
      const payload = await client.getInstallPayload(slug, options.target);
      console.log(`\nKit Installed: ${slug}`);
      console.log(`Target: ${options.target}`);
      console.log(`\nInstructions:\n${payload.instructions}`);
    } catch (err: any) {
      console.error(`Failed to install kit: ${err.message}`);
    }
  });

program.parse();
