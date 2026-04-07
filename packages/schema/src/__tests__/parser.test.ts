import { describe, it, expect } from "vitest";
import { parseKitMd, KitFrontmatterSchema, KitBodySchema } from "../index";

const VALID_KIT_MD = `---
schema: "kit/1.0"
slug: test-kit
title: Test Kit Title
summary: A test kit for unit testing purposes
version: 1.0.0
model:
  provider: openai
  name: gpt-4o-2024-11-20
  hosting: hosted
tags: [testing, automation]
tools: [firecrawl]
skills: [web-scraping]
---

## Goal
This is the goal of the test kit. It must be at least twenty characters long.

## When to Use
Use this kit when you need to test the parser.

## Setup
Install dependencies and configure environment.

## Steps
Follow these steps carefully to execute the kit workflow correctly. This section must also be at least sixty characters long to pass validation.

## Constraints
Do not exceed rate limits.

## Safety Notes
Always review output before acting on automated results.
`;

describe("parseKitMd", () => {
  it("parses a valid kit.md successfully", () => {
    const result = parseKitMd(VALID_KIT_MD);
    expect(result.frontmatter.slug).toBe("test-kit");
    expect(result.frontmatter.title).toBe("Test Kit Title");
    expect(result.frontmatter.version).toBe("1.0.0");
    expect(result.frontmatter.model.provider).toBe("openai");
    expect(result.frontmatter.model.name).toBe("gpt-4o-2024-11-20");
    expect(result.frontmatter.tags).toEqual(["testing", "automation"]);
    expect(result.frontmatter.tools).toEqual(["firecrawl"]);
    expect(result.body.goal).toContain("goal of the test kit");
    expect(result.conformanceLevel).toBe("standard");
    expect(result.raw).toBe(VALID_KIT_MD);
  });

  it("returns 'full' conformance level when fileManifest is present", () => {
    const md = VALID_KIT_MD.replace(
      "skills: [web-scraping]",
      "skills: [web-scraping]\nfileManifest: [src/main.ts, src/utils.ts]"
    );
    const result = parseKitMd(md);
    expect(result.conformanceLevel).toBe("full");
  });

  it("throws on missing frontmatter delimiters", () => {
    const bad = "no frontmatter here\n## Goal\nSome goal text here.";
    expect(() => parseKitMd(bad)).toThrow("missing YAML frontmatter delimiters");
  });

  it("throws on malformed frontmatter (missing required fields)", () => {
    const bad = `---
schema: "kit/1.0"
slug: bad-kit
---

## Goal
This is the goal section content for validation minimum.

## When to Use
Use it now.

## Setup
Set it up.

## Steps
Follow these steps carefully to execute the kit workflow correctly. This section must also be at least sixty characters.

## Constraints
None.

## Safety Notes
Always review output before acting.
`;
    expect(() => parseKitMd(bad)).toThrow();
  });

  it("throws when no tools or skills are provided", () => {
    const noToolsOrSkills = `---
schema: "kit/1.0"
slug: no-tools
title: No Tools Kit
summary: A kit without tools or skills
version: 1.0.0
model:
  provider: openai
  name: gpt-4o-2024-11-20
  hosting: hosted
tags: [testing]
---

## Goal
This is the goal section content for validation minimum characters.

## When to Use
Use it now.

## Setup
Set it up.

## Steps
Follow these steps carefully to execute the kit workflow correctly. This section must also be at least sixty characters.

## Constraints
None.

## Safety Notes
Always review output before acting.
`;
    expect(() => parseKitMd(noToolsOrSkills)).toThrow("At least one tool or skill");
  });

  it("throws when body sections are missing", () => {
    const missingBody = `---
schema: "kit/1.0"
slug: missing-body
title: Missing Body Kit
summary: A kit with missing body sections
version: 1.0.0
model:
  provider: openai
  name: gpt-4o-2024-11-20
  hosting: hosted
tags: [testing]
tools: [something]
---

## Goal
This is a goal for testing purposes that is long enough.
`;
    expect(() => parseKitMd(missingBody)).toThrow();
  });
});

describe("KitFrontmatterSchema", () => {
  it("validates a correct frontmatter object", () => {
    const valid = {
      schema: "kit/1.0" as const,
      slug: "my-kit",
      title: "My Kit",
      summary: "A kit",
      version: "1.0.0",
      model: { provider: "openai", name: "gpt-4o-2024-11-20" },
      tags: ["test"],
      tools: ["firecrawl"],
    };
    const result = KitFrontmatterSchema.parse(valid);
    expect(result.slug).toBe("my-kit");
    expect(result.model.hosting).toBe("hosted");
  });

  it("rejects invalid slug format", () => {
    const invalid = {
      schema: "kit/1.0" as const,
      slug: "My Kit!",
      title: "My Kit",
      summary: "A kit",
      version: "1.0.0",
      model: { provider: "openai", name: "gpt-4o" },
      tags: [],
      tools: ["x"],
    };
    expect(() => KitFrontmatterSchema.parse(invalid)).toThrow("URL-safe lowercase");
  });

  it("rejects invalid version format", () => {
    const invalid = {
      schema: "kit/1.0" as const,
      slug: "my-kit",
      title: "My Kit",
      summary: "A kit",
      version: "v1.0",
      model: { provider: "openai", name: "gpt-4o" },
      tags: [],
      tools: ["x"],
    };
    expect(() => KitFrontmatterSchema.parse(invalid)).toThrow("semver");
  });

  it("rejects wrong schema version", () => {
    const invalid = {
      schema: "kit/2.0",
      slug: "my-kit",
      title: "My Kit",
      summary: "A kit",
      version: "1.0.0",
      model: { provider: "openai", name: "gpt-4o" },
      tags: [],
      tools: ["x"],
    };
    expect(() => KitFrontmatterSchema.parse(invalid)).toThrow();
  });
});

describe("KitBodySchema", () => {
  it("validates a correct body object", () => {
    const valid = {
      goal: "A goal that is at least twenty characters long.",
      whenToUse: "Use when testing.",
      setup: "Install deps.",
      steps: "Step 1: Do this. Step 2: Do that. This must be at least sixty characters for the validation.",
      constraints: "Rate limits apply.",
      safetyNotes: "Review all automated output carefully.",
    };
    const result = KitBodySchema.parse(valid);
    expect(result.goal).toContain("twenty characters");
  });

  it("rejects goal shorter than 20 characters", () => {
    const invalid = {
      goal: "Short",
      whenToUse: "Use it.",
      setup: "Set up.",
      steps: "Step 1: Do this. Step 2: Do that. This must be at least sixty characters for the validation.",
      constraints: "None.",
      safetyNotes: "Review all automated output carefully.",
    };
    expect(() => KitBodySchema.parse(invalid)).toThrow("at least 20 characters");
  });

  it("rejects steps shorter than 60 characters", () => {
    const invalid = {
      goal: "A goal that is at least twenty characters long.",
      whenToUse: "Use it.",
      setup: "Set up.",
      steps: "Too short.",
      constraints: "None.",
      safetyNotes: "Review all automated output carefully.",
    };
    expect(() => KitBodySchema.parse(invalid)).toThrow("at least 60 characters");
  });
});
