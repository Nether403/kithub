import { INSTALL_TARGET_DETAILS } from "@kithub/schema";

const WEBSITE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://skillkithub.com";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://kithub-api.vercel.app";

export function GET() {
  return Response.json({
    name: "SkillKitHub",
    description: "Agent-first registry for discovering, installing, and publishing versioned AI workflow kits and skills.",
    website: WEBSITE_URL,
    api: API_URL,
    installTargets: INSTALL_TARGET_DETAILS,
    mcpServerPackage: "@kithub/mcp-server",
  });
}
