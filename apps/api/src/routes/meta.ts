import type { FastifyPluginAsync } from "fastify";
import { INSTALL_TARGET_DETAILS, SUPPORTED_TARGETS } from "@kithub/schema";
import { db, isEmbeddingsEnabled, schema } from "@kithub/db";

async function getCollectionSlugs(): Promise<string[]> {
  if (!db) return [];

  const rows = await db
    .select({ slug: schema.collections.slug })
    .from(schema.collections)
    .orderBy(schema.collections.slug);

  return rows.map((row) => row.slug);
}

export const metaRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/install-targets", async () => {
    return {
      targets: INSTALL_TARGET_DETAILS,
    };
  });

  fastify.get("/agent-manifest.json", async () => {
    const collectionSlugs = await getCollectionSlugs().catch((err) => {
      fastify.log.warn({ err }, "Could not load collection slugs for agent manifest");
      return [];
    });

    return {
      schemaVersion: "1.0",
      name: "SkillKitHub",
      description: "Agent-first registry for discovering, installing, and publishing versioned AI workflow kits and skills.",
      website: process.env.WEB_URL || "https://skillkithub.com",
      discovery: {
        wellKnown: `${process.env.WEB_URL || "https://skillkithub.com"}/.well-known/agent-kit.json`,
        apiManifest: "/api/agent-manifest.json",
        openApiDocs: "/docs",
      },
      capabilities: {
        searchModes: ["keyword", "semantic"],
        semanticSearchAvailable: isEmbeddingsEnabled(),
        installTargets: SUPPORTED_TARGETS,
        collections: collectionSlugs,
      },
      installTargetDetails: INSTALL_TARGET_DETAILS,
      mcp: {
        package: "@kithub/mcp-server",
        tools: [
          "search_kits",
          "get_related_kits",
          "list_collections",
          "get_collection",
          "get_kit_detail",
          "install_kit",
          "submit_learning",
          "list_install_targets",
        ],
      },
      endpoints: {
        public: [
          "GET /api/kits",
          "GET /api/kits/trending",
          "GET /api/kits/:slug",
          "GET /api/kits/:slug/versions",
          "GET /api/kits/:slug/scans",
          "GET /api/kits/:slug/install?target=",
          "GET /api/kits/:slug/ratings",
          "POST /api/kits/:slug/learnings",
          "POST /api/kits/:slug/view",
          "GET /api/publishers/:slug",
          "GET /api/skills",
          "GET /api/collections",
          "GET /api/collections/:slug",
          "GET /api/collections/:slug/install",
          "GET /api/install-targets",
          "GET /api/agent-manifest.json",
          "GET /health",
        ],
        authenticated: [
          "GET /api/auth/me",
          "GET /api/kits/mine",
          "POST /api/kits",
          "DELETE /api/kits/:slug",
          "POST /api/kits/:slug/ratings",
          "GET /api/kits/:slug/analytics",
        ],
        admin: [
          "POST /api/admin/publishers/:id/verify",
        ],
      },
    };
  });
};
