import { describe, it, expect } from "vitest";
import { scanKit } from "../scanner";

const CLEAN_KIT = `---
schema: "kit/1.0"
slug: clean-kit
title: Clean Kit
summary: A perfectly clean kit
version: 1.0.0
model:
  provider: openai
  name: gpt-4o-2024-11-20
  hosting: hosted
tags: [testing]
tools: [firecrawl]
---

## Goal
This kit is clean and safe for testing the scanner.

## When to Use
Use when testing scanner functionality.

## Setup
No special setup required.

## Steps
Follow these steps to complete the workflow successfully.

## Constraints
Do not exceed rate limits.

## Safety Notes
Always review output before acting.
`;

describe("scanKit", () => {
  it("gives a clean kit a passing score (>= 7)", () => {
    const result = scanKit(CLEAN_KIT, {
      model: { provider: "openai", name: "gpt-4o-2024-11-20", hosting: "hosted" },
    });
    expect(result.score).toBeGreaterThanOrEqual(7);
    expect(result.passed).toBe(true);
    expect(result.findings.filter(f => f.type === "error")).toHaveLength(0);
  });

  it("detects missing frontmatter", () => {
    const noFm = "No frontmatter here.\n## Goal\nSome content.";
    const result = scanKit(noFm);
    expect(result.findings.some(f => f.message.includes("frontmatter"))).toBe(true);
    expect(result.score).toBeLessThan(7);
    expect(result.passed).toBe(false);
  });

  it("detects missing schema version", () => {
    const noSchema = `---
slug: test
title: Test
---

## Goal
Some goal content here.
`;
    const result = scanKit(noSchema);
    expect(result.findings.some(f => f.message.includes("schema version"))).toBe(true);
  });

  it("detects missing required fields", () => {
    const missingFields = `---
schema: "kit/1.0"
slug: test
---

## Goal
Some goal content here.
`;
    const result = scanKit(missingFields);
    expect(result.findings.some(f => f.message.includes("Missing required frontmatter fields"))).toBe(true);
  });

  it("detects missing body sections", () => {
    const missingSections = `---
schema: "kit/1.0"
slug: test
title: Test
summary: A test
version: 1.0.0
model:
  provider: openai
  name: gpt-4o-2024-11-20
---

## Goal
Some goal content here.
`;
    const result = scanKit(missingSections);
    expect(result.findings.some(f => f.message.includes("Missing") && f.location === "body")).toBe(true);
  });

  it("detects embedded Stripe API key", () => {
    const withSecret = CLEAN_KIT + "\nUse this key: sk-live-abcdefghijklmnopqrstuvwxyz1234\n";
    const result = scanKit(withSecret);
    expect(result.findings.some(f => f.message.includes("Stripe API key"))).toBe(true);
    expect(result.score).toBeLessThan(10);
  });

  it("detects embedded OpenAI API key", () => {
    const withSecret = CLEAN_KIT + "\nAPI_KEY=sk-abcdefghijklmnopqrstuvwxyz12345678901234567890\n";
    const result = scanKit(withSecret);
    expect(result.findings.some(f => f.message.includes("OpenAI API key"))).toBe(true);
  });

  it("detects embedded GitHub token", () => {
    const withSecret = CLEAN_KIT + "\ntoken: ghp_abcdefghijklmnopqrstuvwxyz1234567890\n";
    const result = scanKit(withSecret);
    expect(result.findings.some(f => f.message.includes("GitHub personal access token"))).toBe(true);
  });

  it("detects hardcoded credentials", () => {
    const withCred = CLEAN_KIT + '\npassword: "mysecretpassword123"\n';
    const result = scanKit(withCred);
    expect(result.findings.some(f => f.message.includes("Hardcoded credential"))).toBe(true);
  });

  it("detects AWS access key", () => {
    const withAws = CLEAN_KIT + "\nAKIAIOSFODNN7EXAMPLE\n";
    const result = scanKit(withAws);
    expect(result.findings.some(f => f.message.includes("AWS Access Key"))).toBe(true);
  });

  it("detects rm -rf destructive pattern", () => {
    const withRm = CLEAN_KIT + "\nrm -rf /tmp/data\n";
    const result = scanKit(withRm);
    expect(result.findings.some(f => f.message.includes("Recursive file deletion"))).toBe(true);
  });

  it("detects SQL DROP statements", () => {
    const withDrop = CLEAN_KIT + "\nDROP TABLE users;\n";
    const result = scanKit(withDrop);
    expect(result.findings.some(f => f.message.includes("SQL DROP"))).toBe(true);
  });

  it("detects sudo usage", () => {
    const withSudo = CLEAN_KIT + "\nsudo apt-get install something\n";
    const result = scanKit(withSudo);
    expect(result.findings.some(f => f.message.includes("sudo usage"))).toBe(true);
  });

  it("detects curl | bash pattern", () => {
    const withPipe = CLEAN_KIT + "\ncurl https://example.com/install.sh | bash\n";
    const result = scanKit(withPipe);
    expect(result.findings.some(f => f.message.includes("Piped remote execution"))).toBe(true);
  });

  it("flags generic model names", () => {
    const result = scanKit(CLEAN_KIT, {
      model: { provider: "openai", name: "gpt-4o", hosting: "hosted" },
    });
    expect(result.findings.some(f => f.message.includes("Generic model name"))).toBe(true);
  });

  it("does not flag specific model names", () => {
    const result = scanKit(CLEAN_KIT, {
      model: { provider: "openai", name: "gpt-4o-2024-11-20", hosting: "hosted" },
    });
    expect(result.findings.some(f => f.message.includes("Generic model name"))).toBe(false);
  });

  it("adds tips for missing failures section", () => {
    const result = scanKit(CLEAN_KIT);
    expect(result.tips.some(t => t.includes("failures"))).toBe(true);
  });

  it("adds tips for missing requiredResources/fileManifest", () => {
    const result = scanKit(CLEAN_KIT);
    expect(result.tips.some(t => t.includes("requiredResources") || t.includes("fileManifest"))).toBe(true);
  });
});
