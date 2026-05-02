import { z } from "zod";
import { SUPPORTED_TARGETS } from "@kithub/schema";

const TARGET_VALUES = SUPPORTED_TARGETS;

export const SearchKitsInput = {
  query: z.string().optional().describe("Search term to find kits by title, tag, or intent"),
  mode: z.enum(["keyword", "semantic"]).optional().describe("Match strategy. Default: keyword"),
  limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)"),
};

export const GetRelatedKitsInput = {
  slug: z.string().describe("The source kit slug to find related kits for"),
  limit: z.number().int().min(1).max(20).optional().describe("Max related kits (default 6)"),
};

export const ListCollectionsInput = {};

export const GetCollectionInput = {
  slug: z.string().describe("The collection slug"),
  includeInstall: z
    .boolean()
    .optional()
    .describe("If true, also fetch install instructions for the stack"),
  target: z
    .enum(TARGET_VALUES)
    .optional()
    .describe(`Optional install target — one of: ${TARGET_VALUES.join(", ")}`),
};

export const GetKitDetailInput = {
  slug: z.string().describe("The kit slug (URL-safe identifier)"),
};

export const InstallKitInput = {
  slug: z.string().describe("The kit slug to install"),
  target: z
    .enum(TARGET_VALUES)
    .describe(`Target harness: one of ${TARGET_VALUES.join(", ")}`),
};

export const SubmitLearningInput = {
  slug: z.string().describe("The kit slug to submit a learning for"),
  payload: z.string().describe("Description of the learning (what went wrong and how to fix it)"),
  os: z.string().optional().describe("Operating system context (e.g., macOS, Linux, Windows)"),
  model: z.string().optional().describe("Model used (e.g., gpt-4o, claude-sonnet-4-20250514)"),
  runtime: z.string().optional().describe("Runtime version (e.g., Node 20, Python 3.12)"),
  platform: z.string().optional().describe("Agent platform (e.g., Cursor, Claude Code, Codex)"),
};

export const ListInstallTargetsInput = {};
