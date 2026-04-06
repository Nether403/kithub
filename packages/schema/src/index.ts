import { z } from "zod";

export const KitModelSchema = z.object({
  provider: z.string(),
  name: z.string(),
  hosting: z.enum(["hosted", "local"]).optional().default("hosted"),
});

export const KitFrontmatterSchema = z.object({
  schema: z.literal("kit/1.0"),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug must be URL-safe"),
  title: z.string().min(1),
  summary: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be semver"),
  model: KitModelSchema,
  tags: z.array(z.string()).default([]),
  tools: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  dependencies: z.record(z.string()).optional(),
}).refine(data => (data.tools && data.tools.length > 0) || (data.skills && data.skills.length > 0), {
  message: "At least one tool or skill is required",
  path: ["tools", "skills"]
});

export type KitModel = z.infer<typeof KitModelSchema>;
export type KitFrontmatter = z.infer<typeof KitFrontmatterSchema>;
