import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KitHubClient } from "../index";

const { authMock, createClientMock } = vi.hoisted(() => {
  const authMock = {
    signInWithOtp: vi.fn(),
    verifyOtp: vi.fn(),
    refreshSession: vi.fn(),
    setSession: vi.fn(),
    updateUser: vi.fn(),
    getSession: vi.fn(),
  };

  const createClientMock = vi.fn(() => ({
    auth: authMock,
  }));

  return { authMock, createClientMock };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: async () => body,
  } as Response;
}

describe("KitHubClient auth helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.signInWithOtp.mockResolvedValue({ error: null });
    authMock.verifyOtp.mockResolvedValue({
      data: {
        session: {
          access_token: "verified-access",
          refresh_token: "verified-refresh",
          expires_at: 1700000000,
          user: {
            id: "supabase-user",
            email: "person@example.com",
            user_metadata: { agentName: "agent-zero" },
          },
        },
        user: {
          id: "supabase-user",
          email: "person@example.com",
          user_metadata: { agentName: "agent-zero" },
        },
      },
      error: null,
    });
    authMock.refreshSession.mockResolvedValue({
      data: {
        session: {
          access_token: "refreshed-access",
          refresh_token: "refreshed-refresh",
          expires_at: 1800000000,
          user: {
            id: "supabase-user",
            email: "person@example.com",
            user_metadata: { agentName: "agent-zero" },
          },
        },
        user: {
          id: "supabase-user",
          email: "person@example.com",
          user_metadata: { agentName: "agent-zero" },
        },
      },
      error: null,
    });
    authMock.setSession.mockResolvedValue({ error: null });
    authMock.updateUser.mockResolvedValue({
      data: {
        user: {
          id: "supabase-user",
          email: "person@example.com",
          user_metadata: { agentName: "repair-bot" },
        },
      },
      error: null,
    });
    authMock.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "verified-access",
          refresh_token: "verified-refresh",
          expires_at: 1700000000,
          user: {
            id: "supabase-user",
            email: "person@example.com",
            user_metadata: { agentName: "repair-bot" },
          },
        },
      },
      error: null,
    });
    vi.stubGlobal("fetch", vi.fn());
    delete process.env.KITHUB_SUPABASE_URL;
    delete process.env.KITHUB_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.KITHUB_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
    delete process.env.SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefers env auth config over constructor overrides", async () => {
    process.env.KITHUB_SUPABASE_URL = "https://env.supabase.co";
    process.env.KITHUB_SUPABASE_PUBLISHABLE_KEY = "env-publishable";

    const client = new KitHubClient({
      baseUrl: "https://api.example.com",
      supabaseUrl: "https://ctor.supabase.co",
      supabasePublishableKey: "ctor-publishable",
    });

    await client.login("person@example.com");

    expect(createClientMock).toHaveBeenCalledWith(
      "https://env.supabase.co",
      "env-publishable",
      expect.any(Object)
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falls back to /api/auth/config when no local auth config is available", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        provider: "supabase",
        authMethod: "email_otp",
        supabaseUrl: "https://api-config.supabase.co",
        supabasePublishableKey: "api-publishable",
      })
    );

    const client = new KitHubClient({ baseUrl: "https://api.example.com" });

    await client.login("person@example.com");

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/api/auth/config",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
        },
      })
    );
    expect(createClientMock).toHaveBeenCalledWith(
      "https://api-config.supabase.co",
      "api-publishable",
      expect.any(Object)
    );
  });

  it("verifies an OTP, returns session data, and reuses the bearer token for /api/auth/me", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          provider: "supabase",
          authMethod: "email_otp",
          supabaseUrl: "https://api-config.supabase.co",
          supabasePublishableKey: "api-publishable",
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          email: "person@example.com",
          supabaseUserId: "supabase-user",
          userId: "local-user",
          publisherId: "publisher-1",
          publisherName: "agent-zero",
        })
      );

    const client = new KitHubClient({ baseUrl: "https://api.example.com" });
    const result = await client.verify("person@example.com", "123456");
    const identity = await client.getCurrentIdentity();

    expect(result.token).toBe("verified-access");
    expect(result.refreshToken).toBe("verified-refresh");
    expect(identity.publisherName).toBe("agent-zero");
    expect(fetch).toHaveBeenLastCalledWith(
      "https://api.example.com/api/auth/me",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer verified-access",
        }),
      })
    );
  });

  it("refreshes a stored auth session", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        provider: "supabase",
        authMethod: "email_otp",
        supabaseUrl: "https://api-config.supabase.co",
        supabasePublishableKey: "api-publishable",
      })
    );

    const client = new KitHubClient({ baseUrl: "https://api.example.com" });
    const refreshed = await client.refreshAuthSession("verified-refresh");

    expect(authMock.refreshSession).toHaveBeenCalledWith({
      refresh_token: "verified-refresh",
    });
    expect(refreshed.token).toBe("refreshed-access");
    expect(refreshed.refreshToken).toBe("refreshed-refresh");
  });

  it("updates user metadata using the current session and returns the refreshed user state", async () => {
    process.env.KITHUB_SUPABASE_URL = "https://env.supabase.co";
    process.env.KITHUB_SUPABASE_PUBLISHABLE_KEY = "env-publishable";

    const client = new KitHubClient({ baseUrl: "https://api.example.com", token: "verified-access" });
    const updated = await client.updateUserMetadata(
      { agentName: "repair-bot" },
      { refreshToken: "verified-refresh" }
    );

    expect(authMock.setSession).toHaveBeenCalledWith({
      access_token: "verified-access",
      refresh_token: "verified-refresh",
    });
    expect(authMock.updateUser).toHaveBeenCalledWith({
      data: { agentName: "repair-bot" },
    });
    expect(updated.agentName).toBe("repair-bot");
    expect(updated.token).toBe("verified-access");
  });
});
