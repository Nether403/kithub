import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KitHubClient } from "@kithub/sdk";
import {
  authenticateWithOtp,
  completeOtpVerification,
  resolveAuthSession,
  runWithPublisherRepair,
  type CliAuthIo,
  type ResolvedAuthSession,
} from "../auth";
import { clearAuthSession, loadConfig, saveConfig } from "../config";

function createIo(prompts: string[] = []): CliAuthIo & {
  prompt: ReturnType<typeof vi.fn>;
  log: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
} {
  return {
    prompt: vi.fn(async () => prompts.shift() ?? ""),
    log: vi.fn(),
    error: vi.fn(),
  };
}

describe("CLI auth helpers", () => {
  let tempConfigDir: string;

  beforeEach(() => {
    tempConfigDir = mkdtempSync(join(tmpdir(), "kithub-cli-test-"));
    process.env.KITHUB_CONFIG_DIR = tempConfigDir;
    delete process.env.KITHUB_TOKEN;
  });

  afterEach(() => {
    delete process.env.KITHUB_CONFIG_DIR;
    delete process.env.KITHUB_TOKEN;
    rmSync(tempConfigDir, { recursive: true, force: true });
  });

  it("completes the interactive login flow and stores the verified session", async () => {
    const io = createIo(["person@example.com", "123456"]);
    const client = {
      login: vi.fn().mockResolvedValue({ status: "pending", message: "Verification code sent." }),
      verify: vi.fn().mockResolvedValue({
        status: "verified",
        token: "access-1",
        refreshToken: "refresh-1",
        expiresAt: 1700000000,
        email: "person@example.com",
      }),
      getCurrentIdentity: vi.fn().mockResolvedValue({
        email: "person@example.com",
        supabaseUserId: "supabase-user",
        userId: "local-user",
        publisherId: "publisher-1",
        publisherName: "agent-one",
      }),
    } as unknown as KitHubClient;

    const authenticated = await authenticateWithOtp(client, io);

    expect(authenticated.identity.publisherName).toBe("agent-one");
    expect(loadConfig()).toMatchObject({
      token: "access-1",
      refreshToken: "refresh-1",
      email: "person@example.com",
      agentName: "agent-one",
    });
    expect((client.login as any)).toHaveBeenCalledWith("person@example.com");
    expect((client.verify as any)).toHaveBeenCalledWith("person@example.com", "123456");
  });

  it("supports manual verify and stores the canonical identity", async () => {
    const client = {
      verify: vi.fn().mockResolvedValue({
        status: "verified",
        token: "access-2",
        refreshToken: "refresh-2",
        expiresAt: 1800000000,
        email: "manual@example.com",
      }),
      getCurrentIdentity: vi.fn().mockResolvedValue({
        email: "manual@example.com",
        supabaseUserId: "supabase-user",
        userId: "local-user",
        publisherId: "publisher-2",
        publisherName: "manual-bot",
      }),
    } as unknown as KitHubClient;

    const verified = await completeOtpVerification(
      client,
      "manual@example.com",
      "654321",
      "manual-bot"
    );

    expect(verified.identity.publisherName).toBe("manual-bot");
    expect(loadConfig()).toMatchObject({
      token: "access-2",
      refreshToken: "refresh-2",
      email: "manual@example.com",
      agentName: "manual-bot",
    });
  });

  it("uses register mode for existing-user publisher repair flows", async () => {
    const io = createIo(["777777"]);
    const client = {
      register: vi.fn().mockResolvedValue({ status: "pending", message: "Verification code sent." }),
      verify: vi.fn().mockResolvedValue({
        status: "verified",
        token: "access-3",
        refreshToken: "refresh-3",
        expiresAt: 1800000000,
        email: "existing@example.com",
      }),
      getCurrentIdentity: vi.fn().mockResolvedValue({
        email: "existing@example.com",
        supabaseUserId: "supabase-user",
        userId: "local-user",
        publisherId: "publisher-3",
        publisherName: "publisher-bot",
      }),
    } as unknown as KitHubClient;

    const registered = await authenticateWithOtp(client, io, {
      email: "existing@example.com",
      agentName: "publisher-bot",
    });

    expect(registered.identity.publisherId).toBe("publisher-3");
    expect((client.register as any)).toHaveBeenCalledWith(
      "existing@example.com",
      "publisher-bot"
    );
  });

  it("falls back to a fresh login when a stored refresh token has expired", async () => {
    saveConfig({
      token: "stale-access",
      refreshToken: "stale-refresh",
      expiresAt: 1,
      email: "stored@example.com",
    });

    const io = createIo(["", "222222"]);
    const client = {
      refreshAuthSession: vi.fn().mockRejectedValue(new Error("expired")),
      login: vi.fn().mockResolvedValue({ status: "pending", message: "Verification code sent." }),
      verify: vi.fn().mockResolvedValue({
        status: "verified",
        token: "fresh-access",
        refreshToken: "fresh-refresh",
        expiresAt: 1900000000,
        email: "stored@example.com",
      }),
      getCurrentIdentity: vi.fn().mockResolvedValue({
        email: "stored@example.com",
        supabaseUserId: "supabase-user",
        userId: "local-user",
        publisherId: "publisher-4",
        publisherName: "fresh-bot",
      }),
    } as unknown as KitHubClient;

    const session = await resolveAuthSession(client, io, {
      interactive: true,
      bootstrapIdentity: true,
    });

    expect(session.token).toBe("fresh-access");
    expect((client.refreshAuthSession as any)).toHaveBeenCalledWith("stale-refresh");
    expect((client.login as any)).toHaveBeenCalledWith("stored@example.com");
    expect(loadConfig()).toMatchObject({
      token: "fresh-access",
      refreshToken: "fresh-refresh",
      agentName: "fresh-bot",
    });
  });

  it("repairs the publisher profile and retries the publish operation once", async () => {
    saveConfig({
      token: "access-4",
      refreshToken: "refresh-4",
      email: "author@example.com",
    });

    const io = createIo(["repair-bot"]);
    const client = {
      setToken: vi.fn(),
      updateUserMetadata: vi.fn().mockResolvedValue({
        status: "updated",
        token: "access-4",
        refreshToken: "refresh-4",
        email: "author@example.com",
        agentName: "repair-bot",
      }),
      refreshAuthSession: vi.fn().mockResolvedValue({
        status: "refreshed",
        token: "access-5",
        refreshToken: "refresh-5",
        expiresAt: 1900000000,
        email: "author@example.com",
        agentName: "repair-bot",
      }),
      getCurrentIdentity: vi.fn().mockResolvedValue({
        email: "author@example.com",
        supabaseUserId: "supabase-user",
        userId: "local-user",
        publisherId: "publisher-5",
        publisherName: "repair-bot",
      }),
    } as unknown as KitHubClient;

    const session: ResolvedAuthSession = {
      token: "access-4",
      config: loadConfig(),
      identity: {
        email: "author@example.com",
        supabaseUserId: "supabase-user",
        userId: "local-user",
        publisherIssue: "Publisher profile required.",
      },
      fromEnv: false,
    };

    const publishOperation = vi
      .fn()
      .mockRejectedValueOnce(new Error("Publisher profile required. Add an agentName to your Supabase user metadata, then sign in again."))
      .mockResolvedValueOnce({ slug: "kit", status: "published" });

    const repaired = await runWithPublisherRepair(client, io, session, publishOperation);

    expect(repaired.result).toEqual({ slug: "kit", status: "published" });
    expect(publishOperation).toHaveBeenCalledTimes(2);
    expect((client.updateUserMetadata as any)).toHaveBeenCalledTimes(1);
    expect((client.setToken as any)).toHaveBeenCalledWith("access-5");
    expect(repaired.session.identity?.publisherId).toBe("publisher-5");
  });

  it("clears only auth fields and preserves unrelated config", () => {
    saveConfig({
      token: "access-6",
      refreshToken: "refresh-6",
      expiresAt: 123,
      email: "cached@example.com",
      agentName: "cached-bot",
      apiUrl: "https://api.example.com",
    });

    clearAuthSession();

    expect(loadConfig()).toEqual({
      apiUrl: "https://api.example.com",
    });
  });
});
