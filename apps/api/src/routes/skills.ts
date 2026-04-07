import type { FastifyPluginAsync } from "fastify";
import { db, searchSkills, getSkillBySlug } from "@kithub/db";

export const skillRoutes: FastifyPluginAsync = async (fastify) => {

  fastify.get("/", async (request, reply) => {
    const { q, tag } = request.query as { q?: string; tag?: string };
    if (!db) {
      return reply.code(503).send({
        error: "Service Unavailable",
        message: "Database not connected.",
        statusCode: 503,
      });
    }

    const skills = await searchSkills(q, tag);
    return { skills, total: skills.length };
  });

  fastify.get("/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    if (!db) {
      return reply.code(503).send({
        error: "Service Unavailable",
        message: "Database not connected.",
        statusCode: 503,
      });
    }

    const skill = await getSkillBySlug(slug);
    if (!skill) {
      return reply.code(404).send({
        error: "Not Found",
        message: `Skill "${slug}" not found.`,
        statusCode: 404,
      });
    }

    return skill;
  });
};
