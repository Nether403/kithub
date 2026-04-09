import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface KitHubConfig {
  token?: string;
  refreshToken?: string;
  expiresAt?: number;
  email?: string;
  agentName?: string;
  apiUrl?: string;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
}

function getConfigDir(): string {
  return process.env.KITHUB_CONFIG_DIR?.trim() || join(homedir(), ".kithub");
}

function getConfigFile(): string {
  return join(getConfigDir(), "config.json");
}

function ensureConfigDir(): void {
  const configDir = getConfigDir();
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
}

export function loadConfig(): KitHubConfig {
  try {
    const configFile = getConfigFile();
    if (existsSync(configFile)) {
      return JSON.parse(readFileSync(configFile, "utf-8"));
    }
  } catch {
  }
  return {};
}

export function saveConfig(config: Partial<KitHubConfig>): void {
  ensureConfigDir();
  const existing = loadConfig();
  const merged = { ...existing, ...config };
  writeFileSync(getConfigFile(), JSON.stringify(merged, null, 2), "utf-8");
}

export function clearConfig(): void {
  ensureConfigDir();
  writeFileSync(getConfigFile(), JSON.stringify({}, null, 2), "utf-8");
}

export function clearAuthSession(): void {
  ensureConfigDir();
  const existing = loadConfig();
  const { token, refreshToken, expiresAt, email, agentName, ...rest } = existing;
  void token;
  void refreshToken;
  void expiresAt;
  void email;
  void agentName;
  writeFileSync(getConfigFile(), JSON.stringify(rest, null, 2), "utf-8");
}

export function getToken(): string | null {
  return process.env.KITHUB_TOKEN || loadConfig().token || null;
}

export function getApiUrl(): string {
  return process.env.KITHUB_API_URL || loadConfig().apiUrl || "http://localhost:8080";
}
