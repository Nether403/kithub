import type { FastifyPluginAsync } from "fastify";
import { INSTALL_TARGET_DETAILS } from "@kithub/schema";

export const metaRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/install-targets", async () => {
    return {
      targets: INSTALL_TARGET_DETAILS,
    };
  });
};
