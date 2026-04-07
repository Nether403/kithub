import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const CONFIG_DIR = join(homedir(), ".kithub");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface KitHubConfig {
  token?: string;
  email?: string;
  agentName?: string;
  apiUrl?: string;
}

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): KitHubConfig {
  try {
    if (existsSync(CONFIG_FILE)) {
      return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    }
  } catch {
  }
  return {};
}

export function saveConfig(config: Partial<KitHubConfig>): void {
  ensureConfigDir();
  const existing = loadConfig();
  const merged = { ...existing, ...config };
  writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), "utf-8");
}

export function clearConfig(): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify({}, null, 2), "utf-8");
}

export function getToken(): string | null {
  return process.env.KITHUB_TOKEN || loadConfig().token || null;
}

export function getApiUrl(): string {
  return process.env.KITHUB_API_URL || loadConfig().apiUrl || "http://localhost:8080";
}
